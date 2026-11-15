package app.bizzassist.agent.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.bizzassist.agent.QueueState
import app.bizzassist.agent.Tab
import app.bizzassist.agent.data.QueueRow
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QueueScreen(
    state: QueueState,
    agentName: String,
    chatError: String?,
    onTab: (Tab) -> Unit,
    onRefresh: () -> Unit,
    onClaim: (QueueRow) -> Unit,
    onOpen: (QueueRow) -> Unit,
    onResolve: (QueueRow) -> Unit,
    onSettings: () -> Unit,
) {
    Column(Modifier.fillMaxSize().background(Bz.Parchment)) {
        // top bar: name and settings, edge-to-edge under the status bar
        Row(
            Modifier.fillMaxWidth().background(Bz.Canvas).statusBarsPadding().padding(start = 20.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text("Chats", style = MaterialTheme.typography.titleLarge)
                Text(agentName, style = MaterialTheme.typography.bodySmall, color = Bz.Ink48)
            }
            TextButton(onClick = onSettings, modifier = Modifier.heightIn(min = 48.dp)) { Text("Settings") }
        }

        Segmented(
            selected = state.tab,
            waiting = state.waiting,
            mine = state.mine,
            onTab = onTab,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        )

        chatError?.let { Banner("Live chat isn't connected: $it", Bz.Danger) }
        state.error?.let { Banner(it, Bz.Danger) }

        PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = onRefresh, modifier = Modifier.weight(1f)) {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                if (state.rows.isEmpty()) {
                    item(key = "empty") {
                        Text(
                            if (state.tab == Tab.Waiting) "No one is waiting. New chats show here the moment the bot hands one over."
                            else "Chats you claim show here until you resolve them.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Bz.Ink48,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp, horizontal = 8.dp),
                        )
                    }
                }
                items(state.rows, key = { it.id }) { row ->
                    QueueCard(
                        row = row,
                        tab = state.tab,
                        busy = state.busyId == row.id,
                        onClaim = { onClaim(row) },
                        onOpen = { onOpen(row) },
                        onResolve = { onResolve(row) },
                        modifier = Modifier.animateItem(),
                    )
                }
            }
        }
    }
}

/** Waiting / Mine with a white pill under the active label (same control as the web inbox). */
@Composable
private fun Segmented(selected: Tab, waiting: Int, mine: Int, onTab: (Tab) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth().background(Bz.Chip, CircleShape).padding(2.dp)) {
        listOf(Tab.Waiting to "Waiting ($waiting)", Tab.Mine to "Mine ($mine)").forEach { (tab, label) ->
            val active = tab == selected
            val bg by animateColorAsState(if (active) Bz.Canvas else Color.Transparent, label = "segment")
            Box(
                Modifier
                    .weight(1f)
                    .heightIn(min = 44.dp)
                    .background(bg, CircleShape)
                    .clickable(role = Role.Tab) { onTab(tab) }
                    .semantics { this.selected = active },
                contentAlignment = Alignment.Center,
            ) {
                Text(label, style = if (active) MaterialTheme.typography.labelMedium else MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun Banner(text: String, color: Color) {
    Text(
        text,
        style = MaterialTheme.typography.bodyMedium,
        color = color,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 4.dp),
    )
}

@Composable
private fun QueueCard(
    row: QueueRow,
    tab: Tab,
    busy: Boolean,
    onClaim: () -> Unit,
    onOpen: () -> Unit,
    onResolve: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val title = row.summary?.issue ?: row.last_text ?: "New conversation"
    val since = if (tab == Tab.Waiting) row.waiting_since else row.last_at
    val meta = listOfNotNull(row.buyer_lang.uppercase(), ago(since), row.widget).joinToString(" · ")
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Bz.Canvas,
        modifier = modifier
            .fillMaxWidth()
            .then(if (tab == Tab.Mine) Modifier.clickable(onClickLabel = "Open chat", onClick = onOpen) else Modifier),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.Top) {
            if (tab == Tab.Waiting) {
                Box(Modifier.padding(top = 7.dp).size(8.dp).background(Bz.Primary, CircleShape).semantics { contentDescription = "Waiting" })
                Spacer(Modifier.width(12.dp))
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, style = MaterialTheme.typography.bodyLarge, maxLines = 3, overflow = TextOverflow.Ellipsis)
                Text(meta, style = MaterialTheme.typography.bodyMedium, color = Bz.Ink48)
                if (tab == Tab.Mine && row.last_text != null && row.last_text != title) {
                    Text(row.last_text, style = MaterialTheme.typography.bodyMedium, color = Bz.Ink80, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                Spacer(Modifier.size(4.dp))
                if (tab == Tab.Waiting) {
                    Button(onClick = onClaim, enabled = !busy, shape = CircleShape, modifier = Modifier.heightIn(min = 44.dp)) {
                        Text(if (busy) "Claiming…" else "Claim chat")
                    }
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = onOpen, shape = CircleShape, modifier = Modifier.heightIn(min = 44.dp)) { Text("Open chat") }
                        OutlinedButton(onClick = onResolve, enabled = !busy, shape = CircleShape, modifier = Modifier.heightIn(min = 44.dp)) {
                            Text(if (busy) "Resolving…" else "Resolve")
                        }
                    }
                }
            }
        }
    }
}

// ThreadLocal.withInitial needs API 26
private val iso = object : ThreadLocal<SimpleDateFormat>() {
    override fun initialValue() = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.US)
}

/** "now", "4 min", "2 h" from the server's ISO time (java.time needs API 26; minSdk is 24). */
private fun ago(isoTime: String?): String? {
    val t = isoTime?.let { runCatching { iso.get()!!.parse(it)?.time }.getOrNull() } ?: return null
    val min = ((System.currentTimeMillis() - t) / 60_000).coerceAtLeast(0)
    return when {
        min < 1 -> "now"
        min < 60 -> "$min min"
        min < 1440 -> "${min / 60} h"
        else -> "${min / 1440} d"
    }
}
