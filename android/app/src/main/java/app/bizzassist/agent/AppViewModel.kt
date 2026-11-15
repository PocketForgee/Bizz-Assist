package app.bizzassist.agent

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.bizzassist.agent.data.Api
import app.bizzassist.agent.data.ChatMessage
import app.bizzassist.agent.data.DetailResponse
import app.bizzassist.agent.data.LangBody
import app.bizzassist.agent.data.LoginBody
import app.bizzassist.agent.data.QueueRow
import app.bizzassist.agent.data.SavedSession
import app.bizzassist.agent.data.SendBody
import app.bizzassist.agent.data.SessionStore
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

enum class Tab(val api: String) { Waiting("waiting"), Mine("mine") }

data class QueueState(
    val tab: Tab = Tab.Waiting,
    val rows: List<QueueRow> = emptyList(),
    val loaded: Boolean = false,
    val waiting: Int = 0,
    val mine: Int = 0,
    val refreshing: Boolean = false,
    val error: String? = null,
)

/** One open conversation. `pending` holds replies sent but not yet returned by the server. */
data class ChatState(
    val id: String,
    val detail: DetailResponse? = null,
    val pending: List<ChatMessage> = emptyList(),
    val sending: Boolean = false,
    val busy: Boolean = false,
    val error: String? = null,
) {
    val messages: List<ChatMessage> get() = detail?.messages.orEmpty() + pending
}

sealed interface Screen {
    data object Loading : Screen
    data object Login : Screen
    data object Queue : Screen
    data class Chat(val id: String) : Screen
    data object Settings : Screen
}

class AppViewModel(app: Application) : AndroidViewModel(app) {
    private val store = SessionStore(app)

    private val _screen = MutableStateFlow<Screen>(Screen.Loading)
    val screen: StateFlow<Screen> = _screen.asStateFlow()

    private val _session = MutableStateFlow<SavedSession?>(null)
    val session: StateFlow<SavedSession?> = _session.asStateFlow()

    private val _queue = MutableStateFlow(QueueState())
    val queue: StateFlow<QueueState> = _queue.asStateFlow()

    private val _chat = MutableStateFlow<ChatState?>(null)
    val chat: StateFlow<ChatState?> = _chat.asStateFlow()

    private var seenWaiting: Set<String>? = null
    private var poller: Job? = null
    private var chatPoller: Job? = null

    init {
        viewModelScope.launch {
            val saved = store.load()
            if (saved == null) {
                _screen.value = Screen.Login
                return@launch
            }
            Api.token = saved.token
            _session.value = saved
            _screen.value = Screen.Queue
            // sessions saved by v1 have no user id; it decides who may reply in a chat
            if (saved.userId.isEmpty()) {
                runCatching { Api.service.me().user }.onSuccess { u ->
                    val fixed = saved.copy(userId = u.id, name = u.name, lang = u.lang, role = u.role)
                    store.save(fixed)
                    _session.value = fixed
                }.onFailure { if (Api.isUnauthorized(it)) signedOut() }
            }
        }
    }

    // ---- auth ----

    suspend fun login(email: String, password: String): String? = try {
        val res = Api.service.login(LoginBody(email.trim(), password))
        val saved = SavedSession(res.token, res.user.id, res.user.name, res.user.lang, res.user.role)
        Api.token = saved.token
        store.save(saved)
        _session.value = saved
        _screen.value = Screen.Queue
        null
    } catch (t: Throwable) {
        Api.message(t)
    }

    fun logout() {
        viewModelScope.launch {
            runCatching { Api.service.logout() }
            signedOut()
        }
    }

    private suspend fun signedOut() {
        stopPolling()
        stopChatPolling()
        Api.token = null
        store.clear()
        _session.value = null
        _queue.value = QueueState()
        _chat.value = null
        seenWaiting = null
        _screen.value = Screen.Login
    }

    // ---- navigation ----

    fun openSettings() { _screen.value = Screen.Settings }

    fun openChat(id: String) {
        if (_chat.value?.id != id) _chat.value = ChatState(id)
        _screen.value = Screen.Chat(id)
    }

    fun back() {
        when (_screen.value) {
            is Screen.Chat -> { stopChatPolling(); _screen.value = Screen.Queue; refresh() }
            Screen.Settings -> _screen.value = Screen.Queue
            else -> Unit
        }
    }

    // ---- queue ----

    fun selectTab(tab: Tab) {
        if (_queue.value.tab == tab) return
        _queue.update { it.copy(tab = tab, rows = emptyList(), loaded = false) }
        refresh()
    }

    fun refresh(pull: Boolean = false) {
        viewModelScope.launch { load(pull) }
    }

    /** Polls every 3 s while the queue is on screen (same cadence as the web inbox). */
    fun startPolling() {
        if (poller?.isActive == true) return
        poller = viewModelScope.launch {
            while (isActive) {
                load(pull = false)
                delay(3_000)
            }
        }
    }

    fun stopPolling() {
        poller?.cancel()
        poller = null
    }

    private suspend fun load(pull: Boolean) {
        if (Api.token == null) return
        val tab = _queue.value.tab
        if (pull) _queue.update { it.copy(refreshing = true) }
        try {
            val res = Api.service.queue(tab.api)
            if (tab == Tab.Waiting) alertNew(res.rows)
            _queue.update {
                if (it.tab != tab) it.copy(refreshing = false)
                else it.copy(rows = res.rows, loaded = true, waiting = res.counts.waiting, mine = res.counts.mine, refreshing = false, error = null)
            }
        } catch (t: Throwable) {
            if (Api.isUnauthorized(t)) return signedOut()
            _queue.update { it.copy(refreshing = false, loaded = true, error = Api.message(t)) }
        }
    }

    /** Local notification for chats that were not in the previous poll (never on the first load). */
    private fun alertNew(rows: List<QueueRow>) {
        val ids = rows.map { it.id }.toSet()
        val before = seenWaiting
        seenWaiting = ids
        if (before == null) return
        rows.filter { it.id !in before }.forEach { Notify.newWaiting(getApplication(), it) }
    }

    // ---- one conversation ----

    /** Polls the open chat every 1.5 s while it is on screen. */
    fun startChatPolling() {
        if (chatPoller?.isActive == true) return
        chatPoller = viewModelScope.launch {
            while (isActive) {
                loadChat()
                delay(1_500)
            }
        }
    }

    fun stopChatPolling() {
        chatPoller?.cancel()
        chatPoller = null
    }

    private suspend fun loadChat() {
        val id = _chat.value?.id ?: return
        try {
            val res = Api.service.detail(id)
            _chat.update { c ->
                if (c == null || c.id != id) c
                else c.copy(
                    detail = res,
                    // a pending reply is done once the server returns an agent message with the same text
                    pending = c.pending.filterNot { p -> res.messages.any { it.role == "agent" && it.text == p.text } },
                    error = if (c.detail == null) null else c.error, // first successful load clears a load error
                )
            }
        } catch (t: Throwable) {
            if (Api.isUnauthorized(t)) return signedOut()
            if (_chat.value?.detail == null) _chat.update { it?.copy(error = Api.message(t)) }
        }
    }

    fun send(text: String) {
        val c = _chat.value ?: return
        val body = text.trim()
        if (body.isEmpty() || c.sending) return
        val temp = ChatMessage(id = "tmp-${System.nanoTime()}", role = "agent", text = body, created_at = "")
        _chat.update { it?.copy(pending = it.pending + temp, sending = true, error = null) }
        viewModelScope.launch {
            try {
                val sent = Api.service.send(c.id, SendBody(body)).message
                _chat.update { s ->
                    s?.copy(
                        sending = false,
                        pending = s.pending.filterNot { it.id == temp.id },
                        detail = s.detail?.let { d -> if (d.messages.any { it.id == sent.id }) d else d.copy(messages = d.messages + sent) },
                    )
                }
            } catch (t: Throwable) {
                _chat.update { s -> s?.copy(sending = false, pending = s.pending.filterNot { it.id == temp.id }, error = Api.message(t)) }
            }
        }
    }

    /** Atomic claim on the server: only one agent wins. */
    fun claim(id: String) {
        _chat.update { it?.copy(busy = true, error = null) }
        viewModelScope.launch {
            try {
                Api.service.claim(id)
                loadChat()
                _queue.update { it.copy(tab = Tab.Mine, rows = emptyList(), loaded = false) }
                _chat.update { it?.copy(busy = false) }
            } catch (t: Throwable) {
                _chat.update { it?.copy(busy = false, error = Api.message(t)) }
                loadChat()
            }
        }
    }

    fun resolve(id: String) {
        _chat.update { it?.copy(busy = true, error = null) }
        viewModelScope.launch {
            try {
                Api.service.resolve(id)
                loadChat()
                _chat.update { it?.copy(busy = false) }
            } catch (t: Throwable) {
                _chat.update { it?.copy(busy = false, error = Api.message(t)) }
            }
        }
    }

    fun dismissChatError() = _chat.update { it?.copy(error = null) }

    // ---- settings ----

    suspend fun setLang(lang: String): String? = try {
        Api.service.setLang(LangBody(lang))
        store.setLang(lang)
        _session.update { it?.copy(lang = lang) }
        null
    } catch (t: Throwable) {
        Api.message(t)
    }
}
