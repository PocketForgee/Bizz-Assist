package app.bizzassist.agent

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.bizzassist.agent.ui.BizzTheme
import app.bizzassist.agent.ui.Bz
import app.bizzassist.agent.ui.ChatScreen
import app.bizzassist.agent.ui.LoginScreen
import app.bizzassist.agent.ui.QueueScreen
import app.bizzassist.agent.ui.SettingsScreen

class MainActivity : ComponentActivity() {
    private val vm: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { BizzTheme { App(vm) } }
    }
}

/** Depth of a screen: going deeper slides in from the right, going back slides out to the right. */
private fun depth(s: Screen) = when (s) {
    Screen.Loading, Screen.Login -> 0
    Screen.Queue -> 1
    is Screen.Chat, Screen.Settings -> 2
}

@Composable
private fun App(vm: AppViewModel) {
    val screen by vm.screen.collectAsStateWithLifecycle()
    val session by vm.session.collectAsStateWithLifecycle()

    AnimatedContent(
        targetState = screen,
        contentKey = { it::class },
        transitionSpec = {
            val forward = depth(targetState) >= depth(initialState)
            val enter = slideInHorizontally(tween(320, easing = Bz.Ease)) { w -> if (forward) w / 4 else -w / 4 } + fadeIn(tween(240))
            val exit = slideOutHorizontally(tween(320, easing = Bz.Ease)) { w -> if (forward) -w / 6 else w / 4 } + fadeOut(tween(180))
            enter togetherWith exit
        },
        label = "screen",
        modifier = Modifier.fillMaxSize().background(Bz.Pearl),
    ) { s ->
        when (s) {
            Screen.Loading -> Box(Modifier.fillMaxSize().background(Bz.Pearl))
            Screen.Login -> LoginScreen(onLogin = vm::login)
            Screen.Queue -> QueueRoute(vm, session?.name.orEmpty())
            is Screen.Chat -> ChatRoute(vm, session?.userId.orEmpty())
            Screen.Settings -> {
                BackHandler(onBack = vm::back)
                SettingsScreen(
                    name = session?.name.orEmpty(),
                    role = session?.role ?: "agent",
                    lang = session?.lang ?: "en",
                    onBack = vm::back,
                    onLang = vm::setLang,
                    onLogout = vm::logout,
                )
            }
        }
    }
}

@Composable
private fun QueueRoute(vm: AppViewModel, name: String) {
    val state by vm.queue.collectAsStateWithLifecycle()

    // Android 13+: ask once for permission to alert about new waiting chats.
    val askNotify = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33) askNotify.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    // poll only while the queue is visible
    LifecycleResumeEffect(Unit) {
        vm.startPolling()
        onPauseOrDispose { vm.stopPolling() }
    }

    QueueScreen(
        state = state,
        agentName = name,
        onTab = vm::selectTab,
        onRefresh = { vm.refresh(pull = true) },
        onOpen = { row -> vm.openChat(row.id) },
        onSettings = vm::openSettings,
    )
}

@Composable
private fun ChatRoute(vm: AppViewModel, myUserId: String) {
    val state by vm.chat.collectAsStateWithLifecycle()
    BackHandler(onBack = vm::back)
    LifecycleResumeEffect(Unit) {
        vm.startChatPolling()
        onPauseOrDispose { vm.stopChatPolling() }
    }
    state?.let {
        ChatScreen(
            state = it,
            myUserId = myUserId,
            onBack = vm::back,
            onClaim = { vm.claim(it.id) },
            onResolve = { vm.resolve(it.id) },
            onSend = vm::send,
            onDismissError = vm::dismissChatError,
        )
    }
}
