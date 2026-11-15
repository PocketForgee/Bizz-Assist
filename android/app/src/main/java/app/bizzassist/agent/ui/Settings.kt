package app.bizzassist.agent.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

// Same list as web/lib/langs.ts
private val LANGS = listOf(
    "en" to "English", "hi" to "Hindi", "es" to "Spanish", "ar" to "Arabic",
    "fr" to "French", "de" to "German", "pt" to "Portuguese", "id" to "Indonesian",
)

@Composable
fun SettingsScreen(
    name: String,
    role: String,
    lang: String,
    onBack: () -> Unit,
    onLang: suspend (String) -> String?,
    onLogout: () -> Unit,
) {
    var current by remember(lang) { mutableStateOf(lang) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(Modifier.fillMaxSize().background(Bz.Pearl).safeDrawingPadding()) {
        Row(Modifier.fillMaxWidth().height(64.dp).padding(start = 4.dp, end = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).semantics { contentDescription = "Back" }.press(onClick = onBack), contentAlignment = Alignment.Center) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Bz.Ink)
            }
            Text("Settings", style = MaterialTheme.typography.titleLarge, color = Bz.Ink)
        }

        Column(
            Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(48.dp).clip(CircleShape).background(Bz.Ink), contentAlignment = Alignment.Center) {
                    Text(name.trim().take(1).uppercase().ifEmpty { "?" }, style = MaterialTheme.typography.titleMedium, color = Bz.Canvas)
                }
                Column(Modifier.padding(start = 14.dp)) {
                    Text(name, style = MaterialTheme.typography.titleMedium, color = Bz.Ink)
                    Text(if (role == "owner") "Owner" else "Agent", style = MaterialTheme.typography.bodyMedium, color = Bz.Ink48)
                }
            }

            Column {
                Text("Translate chats to", style = MaterialTheme.typography.titleMedium, color = Bz.Ink)
                Spacer(Modifier.height(4.dp))
                Text(
                    "When a customer writes in another language, a translation shows under their message, and your replies reach them in theirs.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Bz.Ink48,
                )
                Spacer(Modifier.height(12.dp))
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Bz.Canvas)
                        .border(1.dp, Bz.Divider, RoundedCornerShape(16.dp))
                        .selectableGroup(),
                ) {
                    LANGS.forEachIndexed { i, (code, label) ->
                        val on = current == code
                        if (i > 0) Box(Modifier.fillMaxWidth().padding(start = 16.dp).height(1.dp).background(Bz.Divider))
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .semantics { selected = on }
                                .press(role = Role.RadioButton) {
                                    if (on) return@press
                                    val prev = current
                                    current = code
                                    error = null
                                    scope.launch {
                                        onLang(code)?.let {
                                            current = prev
                                            error = it
                                        }
                                    }
                                }
                                .padding(horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(label, style = MaterialTheme.typography.bodyLarge, color = Bz.Ink, modifier = Modifier.weight(1f))
                            Slip(code.uppercase(), if (on) Bz.Primary else Bz.Ink48)
                            Box(Modifier.size(32.dp), contentAlignment = Alignment.CenterEnd) {
                                if (on) Icon(Icons.Filled.Check, null, Modifier.size(18.dp), tint = Bz.Primary)
                            }
                        }
                    }
                }
                error?.let { Banner(it, Modifier.padding(top = 12.dp)) }
            }

            BzButton("Sign out", onClick = onLogout, kind = BtnKind.Secondary, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
        }
    }
}
