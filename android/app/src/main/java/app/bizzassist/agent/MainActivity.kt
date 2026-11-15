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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.bizzassist.agent.data.Chat
import app.bizzassist.agent.ui.Bz
import app.bizzassist.agent.ui.BizzTheme
import app.bizzassist.agent.ui.LoginScreen
import app.bizzassist.agent.ui.QueueScreen
import app.bizzassist.agent.ui.SettingsScreen
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val vm: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { BizzTheme { App(vm) } }
    }
}

@Composable
private fun App(vm: AppViewModel) {
    val screen by vm.screen.collectAsStateWithLifecycle()
    val session by vm.session.collectAsStateWithLifecycle()

    // Shared-axis style: forward slides in from the right, back slides out to the right (240ms, DESIGN_SPEC 4).
    AnimatedContent(
        targetState = screen,
        transitionSpec = {
            val forward = targetState == Screen.Settings
            (slideInHorizontally(tween(240)) { w -> if (forward) w / 5 else -w / 5 } + fadeIn(tween(240)))
                .togetherWith(slideOutHorizontally(tween(240)) { w -> if (forward) -w / 5 else w / 5 } + fadeOut(tween(160)))
        },
        label = "screen",
        modifier = Modifier.fillMaxSize().background(Bz.Parchment),
    ) { s ->
        when (s) {
            Screen.Loading -> Box(Modifier.fillMaxSize().background(Bz.Parchment))
            Screen.Login -> LoginScreen(onLogin = vm::login)
            Screen.Queue -> QueueRoute(vm, session?.name.orEmpty())
            Screen.Settings -> {
                BackHandler(onBack = vm::back) // predictive back is on (enableOnBackInvokedCallback)
                SettingsScreen(
                    name = session?.name.orEmpty(),
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
    val chatError by vm.chatError.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Android 13+: ask once for permission to alert about new waiting chats.
    val askNotify = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33) askNotify.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    // Poll only while visible; ChatUI's chat screen pauses this activity, so polling stops there too.
    LifecycleResumeEffect(Unit) {
        vm.startPolling()
        onPauseOrDispose { vm.stopPolling() }
    }

    QueueScreen(
        state = state,
        agentName = name,
        chatError = chatError,
        onTab = vm::selectTab,
        onRefresh = { vm.refresh(pull = true) },
        onClaim = { row -> scope.launch { vm.claim(row)?.let { Chat.open(context, it) } } },
        onOpen = { row -> Chat.open(context, row.nx_group_id) },
        onResolve = vm::resolve,
        onSettings = vm::openSettings,
    )
}
