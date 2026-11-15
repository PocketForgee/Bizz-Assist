package app.bizzassist.agent.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/** The mark: an order-ticket stub with three lines, drawn in code (same shape as the web logo). */
@Composable
fun Mark(size: Int = 22, color: Color = Bz.Ink, cut: Color = Color.White) {
    Canvas(Modifier.size(size.dp)) {
        val w = this.size.width
        drawRoundRect(color, cornerRadius = CornerRadius(w * 0.12f), size = Size(w, w))
        val notch = w * 0.11f
        drawCircle(cut, notch, Offset(0f, w / 2))
        drawCircle(cut, notch, Offset(w, w / 2))
        val sw = w * 0.07f
        listOf(0.36f to 0.68f, 0.5f to 0.68f, 0.64f to 0.52f).forEach { (y, x2) ->
            drawLine(cut, Offset(w * 0.32f, w * y), Offset(w * x2, w * y), sw, StrokeCap.Round)
        }
    }
}

@Composable
fun LoginScreen(onLogin: suspend (String, String) -> String?) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var show by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val focus = LocalFocusManager.current
    val ready = email.contains('@') && password.isNotEmpty() && !busy

    fun submit() {
        if (!ready) return
        focus.clearFocus()
        busy = true
        error = null
        scope.launch {
            error = onLogin(email, password)
            busy = false
        }
    }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = Bz.Primary,
        unfocusedBorderColor = Bz.Hairline,
        focusedContainerColor = Bz.Canvas,
        unfocusedContainerColor = Bz.Canvas,
        cursorColor = Bz.Primary,
    )

    Column(
        Modifier
            .fillMaxSize()
            .background(Bz.Pearl)
            .safeDrawingPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 20.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Mark()
            Text("BizzAssist", style = MaterialTheme.typography.titleMedium, color = Bz.Ink)
        }
        Spacer(Modifier.height(72.dp))
        Text("Answer your shop's chats", style = MaterialTheme.typography.headlineMedium, color = Bz.Ink)
        Spacer(Modifier.height(8.dp))
        Text(
            "Sign in with the email and password your shop's owner gave you in Team.",
            style = MaterialTheme.typography.bodyLarge,
            color = Bz.Ink80,
        )
        Spacer(Modifier.height(36.dp))

        Text("Email", style = MaterialTheme.typography.labelMedium, color = Bz.Ink80)
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = email,
            onValueChange = { email = it; error = null },
            singleLine = true,
            placeholder = { Text("you@shop.com", color = Bz.Ink48) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(12.dp),
            colors = fieldColors,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(16.dp))
        Text("Password", style = MaterialTheme.typography.labelMedium, color = Bz.Ink80)
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it; error = null },
            singleLine = true,
            visualTransformation = if (show) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Go),
            keyboardActions = KeyboardActions(onGo = { submit() }),
            trailingIcon = {
                TextButton(onClick = { show = !show }) { Text(if (show) "Hide" else "Show", color = Bz.Ink80) }
            },
            shape = RoundedCornerShape(12.dp),
            colors = fieldColors,
            modifier = Modifier.fillMaxWidth(),
        )

        AnimatedVisibility(visible = error != null, enter = fadeIn(tween(200)), exit = fadeOut(tween(150))) {
            Banner(error.orEmpty(), Modifier.padding(top = 16.dp))
        }

        Spacer(Modifier.height(24.dp))
        BzButton(
            text = if (busy) "Signing in" else "Sign in",
            onClick = { submit() },
            enabled = ready,
            modifier = Modifier.fillMaxWidth(),
            leading = if (busy) {
                { CircularProgressIndicator(Modifier.size(16.dp).padding(end = 0.dp), color = Color.White, strokeWidth = 2.dp) }
            } else null,
        )
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Spacer(Modifier.width(2.dp))
            Text("Owners can also sign in here to answer chats.", style = MaterialTheme.typography.bodySmall, color = Bz.Ink48)
        }
    }
}
