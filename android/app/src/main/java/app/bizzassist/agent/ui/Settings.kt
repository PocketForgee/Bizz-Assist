package app.bizzassist.agent.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
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
    lang: String,
    onBack: () -> Unit,
    onLang: suspend (String) -> String?,
    onLogout: () -> Unit,
) {
    var current by remember(lang) { mutableStateOf(lang) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(Modifier.fillMaxSize().background(Bz.Parchment)) {
        Row(
            Modifier.fillMaxWidth().background(Bz.Canvas).statusBarsPadding().padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = onBack, modifier = Modifier.heightIn(min = 48.dp)) { Text("Back") }
            Text("Settings", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(start = 8.dp))
        }

        Column(
            Modifier.verticalScroll(rememberScrollState()).navigationBarsPadding().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Surface(shape = RoundedCornerShape(18.dp), color = Bz.Canvas, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp)) {
                    Text("Signed in as", style = MaterialTheme.typography.bodyMedium, color = Bz.Ink48)
                    Text(name, style = MaterialTheme.typography.titleMedium)
                }
            }

            Surface(shape = RoundedCornerShape(18.dp), color = Bz.Canvas, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(vertical = 12.dp)) {
                    Text("Translate chats to", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp))
                    Text(
                        "When a customer writes in another language, you get a translation below their message, and your replies are translated for them.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Bz.Ink48,
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                    )
                    Column(Modifier.selectableGroup()) {
                        LANGS.forEach { (code, label) ->
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 48.dp)
                                    .selectable(selected = current == code, role = Role.RadioButton) {
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
                                    .padding(horizontal = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                RadioButton(selected = current == code, onClick = null)
                                Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(start = 12.dp))
                            }
                        }
                    }
                    error?.let { Text(it, color = Bz.Danger, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 20.dp)) }
                }
            }

            OutlinedButton(onClick = onLogout, shape = CircleShape, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                Text("Sign out", color = Bz.Danger)
            }
        }
    }
}
