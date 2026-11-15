package app.bizzassist.agent

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.bizzassist.agent.data.Api
import app.bizzassist.agent.data.Chat
import app.bizzassist.agent.data.LangBody
import app.bizzassist.agent.data.LoginBody
import app.bizzassist.agent.data.QueueRow
import app.bizzassist.agent.data.SavedSession
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
    val waiting: Int = 0,
    val mine: Int = 0,
    val refreshing: Boolean = false,
    val busyId: String? = null,
    val error: String? = null,
)

sealed interface Screen {
    data object Loading : Screen
    data object Login : Screen
    data object Queue : Screen
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

    /** Chat connection problem shown as a banner; queue still works without it. */
    private val _chatError = MutableStateFlow<String?>(null)
    val chatError: StateFlow<String?> = _chatError.asStateFlow()

    private var seenWaiting: Set<String>? = null
    private var poller: Job? = null

    init {
        viewModelScope.launch {
            val saved = store.load()
            if (saved == null) {
                _screen.value = Screen.Login
            } else {
                Api.token = saved.token
                _session.value = saved
                _screen.value = Screen.Queue
                connectChat()
            }
        }
    }

    // ---- auth ----

    suspend fun login(email: String, password: String): String? = try {
        val res = Api.service.login(LoginBody(email.trim(), password))
        val saved = SavedSession(res.token, res.user.name, res.user.lang, res.user.role)
        Api.token = saved.token
        store.save(saved)
        _session.value = saved
        _screen.value = Screen.Queue
        connectChat()
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
        Chat.logout()
        Api.token = null
        store.clear()
        _session.value = null
        _queue.value = QueueState()
        seenWaiting = null
        _screen.value = Screen.Login
    }

    private fun connectChat() {
        viewModelScope.launch {
            Chat.connect()
                .onSuccess { _chatError.value = null }
                .onFailure { _chatError.value = if (Api.isUnauthorized(it)) null else Api.message(it) }
        }
    }

    // ---- navigation ----

    fun openSettings() { _screen.value = Screen.Settings }
    fun back() { if (_screen.value == Screen.Settings) _screen.value = Screen.Queue }

    // ---- queue ----

    fun selectTab(tab: Tab) {
        _queue.update { it.copy(tab = tab, rows = emptyList()) }
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
                else it.copy(rows = res.rows, waiting = res.counts.waiting, mine = res.counts.mine, refreshing = false, error = null)
            }
        } catch (t: Throwable) {
            if (Api.isUnauthorized(t)) return signedOut()
            _queue.update { it.copy(refreshing = false, error = Api.message(t)) }
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

    /** Atomic claim on the server; on success the chat opens in ChatUI. Returns the group ID. */
    suspend fun claim(row: QueueRow): String? {
        _queue.update { it.copy(busyId = row.id, error = null) }
        return try {
            val groupId = Api.service.claim(row.id).groupId
            _queue.update { it.copy(busyId = null, rows = it.rows.filterNot { r -> r.id == row.id }, waiting = (it.waiting - 1).coerceAtLeast(0), mine = it.mine + 1) }
            groupId
        } catch (t: Throwable) {
            _queue.update { it.copy(busyId = null, error = Api.message(t)) }
            load(pull = false)
            null
        }
    }

    fun resolve(row: QueueRow) {
        viewModelScope.launch {
            _queue.update { it.copy(busyId = row.id, error = null) }
            try {
                Api.service.resolve(row.id)
                _queue.update { it.copy(busyId = null, rows = it.rows.filterNot { r -> r.id == row.id }, mine = (it.mine - 1).coerceAtLeast(0)) }
            } catch (t: Throwable) {
                _queue.update { it.copy(busyId = null, error = Api.message(t)) }
            }
        }
    }

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
