package app.bizzassist.agent.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.bizzassist.agent.QueueState
import app.bizzassist.agent.Tab
import app.bizzassist.agent.data.QueueRow
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QueueScreen(
    state: QueueState,
    agentName: String,
    onTab: (Tab) -> Unit,
    onRefresh: () -> Unit,
    onOpen: (QueueRow) -> Unit,
    onSettings: () -> Unit,
) {
    // one clock for every timer on screen
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            now = System.currentTimeMillis()
            delay(1_000)
        }
    }

    Column(Modifier.fillMaxSize().background(Bz.Pearl).safeDrawingPadding()) {
        Row(
            Modifier.fillMaxWidth().padding(start = 20.dp, end = 12.dp, top = 12.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Mark(size = 20)
            Spacer(Modifier.width(8.dp))
            Text("Chats", style = MaterialTheme.typography.headlineSmall, color = Bz.Ink, modifier = Modifier.weight(1f))
            Box(
                Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Bz.Ink)
                    .semantics { contentDescription = "Settings" }
                    .press(onClick = onSettings),
                contentAlignment = Alignment.Center,
            ) {
                Text(agentName.trim().take(1).uppercase().ifEmpty { "?" }, style = MaterialTheme.typography.labelMedium, color = Bz.Canvas)
            }
        }

        Segmented(
            options = listOf(
                Tab.Waiting to (if (state.waiting > 0) "Waiting  ${state.waiting}" else "Waiting"),
                Tab.Mine to (if (state.mine > 0) "Mine  ${state.mine}" else "Mine"),
            ),
            value = state.tab,
            onChange = onTab,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
        )

        AnimatedVisibility(state.error != null, enter = fadeIn(), exit = fadeOut()) {
            Banner(state.error.orEmpty(), Modifier.padding(horizontal = 20.dp).padding(bottom = 8.dp))
        }

        PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) {
            when {
                !state.loaded -> Column(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    repeat(3) { i ->
                        Box(Modifier.fillMaxWidth().height(104.dp).alpha(1f - i * 0.3f).clip(RoundedCornerShape(16.dp)).background(Bz.Raised))
                    }
                }
                state.rows.isEmpty() -> LazyColumn(Modifier.fillMaxSize()) {
                    item { Empty(state.tab) }
                }
                else -> LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(state.rows, key = { it.id }) { row ->
                        QueueCard(row, state.tab, now, Modifier.animateItem()) { onOpen(row) }
                    }
                }
            }
        }
    }
}

@Composable
private fun Empty(tab: Tab) {
    Column(
        Modifier.fillMaxWidth().padding(horizontal = 32.dp, vertical = 80.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Mark(size = 28, color = Bz.Ink.copy(alpha = 0.12f), cut = Bz.Pearl)
        Spacer(Modifier.height(16.dp))
        Text(
            if (tab == Tab.Waiting) "No one is waiting" else "No chats with you",
            style = MaterialTheme.typography.titleMedium,
            color = Bz.Ink,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            if (tab == Tab.Waiting) "When the assistant hands a chat to a person, it shows up here and your phone alerts you." else "Claim a waiting chat and it stays here until you resolve it.",
            style = MaterialTheme.typography.bodyMedium,
            color = Bz.Ink48,
            modifier = Modifier.padding(horizontal = 8.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
    }
}

@Composable
private fun QueueCard(row: QueueRow, tab: Tab, now: Long, modifier: Modifier, onClick: () -> Unit) {
    val waiting = row.status == "waiting"
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Bz.Canvas)
            .border(1.dp, Bz.Divider, RoundedCornerShape(16.dp))
            .press(onClick = onClick)
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (waiting) LiveDot() else Dot(Bz.Primary)
            Spacer(Modifier.width(10.dp))
            Text(customerName(row.nx_group_id), style = MaterialTheme.typography.titleMedium, color = Bz.Ink, modifier = Modifier.weight(1f))
            Text(
                since(if (tab == Tab.Waiting) row.waiting_since else row.last_at, now),
                style = MaterialTheme.typography.labelSmall,
                color = if (waiting) Bz.Warning else Bz.Ink48,
            )
        }
        Spacer(Modifier.height(8.dp))
        Text(
            row.summary?.issue ?: row.last_text ?: "New conversation",
            style = MaterialTheme.typography.bodyMedium,
            color = Bz.Ink80,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Slip(row.buyer_lang.uppercase())
            Text(row.widget, style = MaterialTheme.typography.bodySmall, color = Bz.Ink48, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            Text(if (waiting) "Open" else "Continue", style = MaterialTheme.typography.labelMedium, color = Bz.Primary)
        }
    }
}

/** The one looping motion in the app: a soft ring on chats that really are waiting. */
@Composable
private fun LiveDot() {
    val t = rememberInfiniteTransition(label = "live")
    val ring by t.animateFloat(1f, 2.2f, infiniteRepeatable(tween(1600, easing = Bz.Ease), RepeatMode.Restart), label = "ring")
    val fade by t.animateFloat(0.35f, 0f, infiniteRepeatable(tween(1600, easing = Bz.Ease), RepeatMode.Restart), label = "fade")
    Box(Modifier.size(16.dp), contentAlignment = Alignment.Center) {
        Box(Modifier.size(8.dp).scale(ring).alpha(fade).clip(CircleShape).background(Bz.Warning))
        Dot(Bz.Warning)
    }
}
