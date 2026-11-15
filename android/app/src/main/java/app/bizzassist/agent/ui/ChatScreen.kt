package app.bizzassist.agent.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.bizzassist.agent.ChatState
import app.bizzassist.agent.data.ChatMessage

@Composable
fun ChatScreen(
    state: ChatState,
    myUserId: String,
    onBack: () -> Unit,
    onClaim: () -> Unit,
    onResolve: () -> Unit,
    onSend: (String) -> Unit,
    onDismissError: () -> Unit,
) {
    val c = state.detail?.conversation
    val mine = c != null && c.status == "agent" && c.assigned_user_id == myUserId
    var draft by rememberSaveable(state.id) { mutableStateOf("") }
    var askResolve by remember { mutableStateOf(false) }
    var showSummary by rememberSaveable(state.id) { mutableStateOf(true) }
    val list = rememberLazyListState()
    val messages = state.messages

    // follow new messages
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) list.animateScrollToItem(messages.size)
    }

    Column(Modifier.fillMaxSize().background(Bz.Pearl).safeDrawingPadding().imePadding()) {
        // ---- top bar ----
        Row(
            Modifier.fillMaxWidth().height(64.dp).background(Bz.Canvas).padding(start = 4.dp, end = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier.size(48.dp).semantics { contentDescription = "Back to chats" }.press(onClick = onBack),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = Bz.Ink) }
            Column(Modifier.weight(1f)) {
                Text(c?.let { customerName(it.nx_group_id) } ?: "Loading", style = MaterialTheme.typography.titleMedium, color = Bz.Ink)
                if (c != null) {
                    val (label, tone) = when (c.status) {
                        "waiting" -> "Waiting for a person" to Bz.Warning
                        "agent" -> (if (mine) "With you" else "With ${c.assigned_name ?: "an agent"}") to Bz.Primary
                        "closed" -> "Closed" to Bz.Ink48
                        else -> "With the assistant" to Bz.Ink48
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (c.status != "closed") Dot(tone, 6)
                        Text("$label · ${c.buyer_lang.uppercase()}", style = MaterialTheme.typography.bodySmall, color = tone, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
            when {
                c?.status == "waiting" -> BzButton(if (state.busy) "Claiming" else "Claim chat", onClick = onClaim, enabled = !state.busy, height = 40)
                mine -> BzButton(
                    "Resolve",
                    onClick = { askResolve = true },
                    kind = BtnKind.Secondary,
                    enabled = !state.busy,
                    height = 40,
                    leading = { Icon(Icons.Filled.Check, null, Modifier.size(16.dp), tint = Bz.Ink) },
                )
            }
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(Bz.Hairline))

        AnimatedVisibility(state.error != null, enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
            Row(
                Modifier.fillMaxWidth().background(Bz.Danger.copy(alpha = 0.07f)).padding(start = 16.dp, end = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(state.error.orEmpty(), style = MaterialTheme.typography.bodyMedium, color = Bz.Danger, modifier = Modifier.weight(1f).padding(vertical = 10.dp))
                Box(Modifier.size(44.dp).semantics { contentDescription = "Dismiss" }.press(onClick = onDismissError), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Close, null, Modifier.size(18.dp), tint = Bz.Danger)
                }
            }
        }

        // ---- transcript ----
        if (state.detail == null) {
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                if (state.error == null) CircularProgressIndicator(Modifier.size(24.dp), color = Bz.Ink48, strokeWidth = 2.dp)
            }
        } else {
            LazyColumn(
                state = list,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
            ) {
                item(key = "summary") {
                    c?.summary?.let { s ->
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .padding(bottom = 16.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(Bz.Canvas)
                                .border(1.dp, Bz.Divider, RoundedCornerShape(16.dp))
                                .press { showSummary = !showSummary }
                                .padding(16.dp)
                                .animateContentSize(tween(300, easing = Bz.Ease)),
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Mark(14, Bz.Ink48)
                                Text("  Summary from the assistant", style = MaterialTheme.typography.bodySmall, color = Bz.Ink48, modifier = Modifier.weight(1f))
                                Icon(if (showSummary) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown, null, Modifier.size(18.dp), tint = Bz.Ink48)
                            }
                            if (showSummary) {
                                listOf("Issue" to s.issue, "What the assistant tried" to s.bot_tried, "Customer details" to s.buyer_details).forEach { (k, v) ->
                                    Spacer(Modifier.height(12.dp))
                                    Text(k, style = MaterialTheme.typography.bodySmall, color = Bz.Ink48)
                                    Text(v ?: "–", style = MaterialTheme.typography.bodyMedium, color = Bz.Ink)
                                }
                            } else {
                                Text(s.issue ?: "–", style = MaterialTheme.typography.bodyMedium, color = Bz.Ink, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 6.dp))
                            }
                        }
                    }
                }
                itemsIndexed(messages, key = { _, m -> m.id }) { i, m ->
                    val head = i == 0 || messages[i - 1].role != m.role
                    Bubble(m, head, c?.let { customerName(it.nx_group_id) } ?: "Customer", c?.buyer_lang.orEmpty(), Modifier.animateItem())
                }
            }
        }

        // ---- composer / state line ----
        Box(Modifier.fillMaxWidth().height(1.dp).background(Bz.Hairline))
        if (mine) {
            Row(
                Modifier.fillMaxWidth().background(Bz.Canvas).padding(12.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                Box(
                    Modifier
                        .weight(1f)
                        .heightIn(min = 44.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Bz.Pearl)
                        .border(1.dp, Bz.Hairline, RoundedCornerShape(14.dp))
                        .padding(horizontal = 14.dp, vertical = 11.dp),
                ) {
                    if (draft.isEmpty()) Text("Reply to the customer", style = MaterialTheme.typography.bodyLarge, color = Bz.Ink48)
                    BasicTextField(
                        value = draft,
                        onValueChange = { if (it.length <= 2000) draft = it },
                        textStyle = MaterialTheme.typography.bodyLarge.copy(color = Bz.Ink),
                        cursorBrush = SolidColor(Bz.Primary),
                        maxLines = 6,
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Spacer(Modifier.size(8.dp))
                val canSend = draft.isNotBlank() && !state.sending
                Box(
                    Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (canSend) Bz.Primary else Bz.Raised)
                        .semantics { contentDescription = "Send" }
                        .press(enabled = canSend) {
                            onSend(draft)
                            draft = ""
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.AutoMirrored.Filled.Send, null, Modifier.size(18.dp), tint = if (canSend) Color.White else Bz.Ink48)
                }
            }
        } else if (c != null) {
            Text(
                when (c.status) {
                    "waiting" -> "Claim the chat to reply. The customer sees you join."
                    "agent" -> "${c.assigned_name ?: "Another agent"} is answering this chat."
                    "closed" -> "This chat is closed. Its answers go to Learned for the owner to approve."
                    else -> "The assistant is answering. It hands over when it can't help."
                },
                style = MaterialTheme.typography.bodyMedium,
                color = Bz.Ink48,
                modifier = Modifier.fillMaxWidth().background(Bz.Canvas).padding(horizontal = 20.dp, vertical = 16.dp),
            )
        }
    }

    if (askResolve) {
        AlertDialog(
            onDismissRequest = { askResolve = false },
            title = { Text("Close this chat?") },
            text = { Text("The customer is asked for a rating, and your answers are offered to the owner as learned answers.") },
            confirmButton = { TextButton(onClick = { askResolve = false; onResolve() }) { Text("Resolve", color = Bz.Primary) } },
            dismissButton = { TextButton(onClick = { askResolve = false }) { Text("Cancel", color = Bz.Ink80) } },
            containerColor = Bz.Canvas,
        )
    }
}

@Composable
private fun Bubble(m: ChatMessage, head: Boolean, customer: String, buyerLang: String, modifier: Modifier) {
    val fromCustomer = m.role == "buyer"
    val pending = m.id.startsWith("tmp-")
    Column(
        modifier.fillMaxWidth().padding(top = if (head) 14.dp else 4.dp),
        horizontalAlignment = if (fromCustomer) Alignment.Start else Alignment.End,
    ) {
        if (head) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp)) {
                if (m.role == "bot") Mark(12, Bz.Ink48)
                Text(
                    (if (m.role == "bot") "  Assistant" else if (fromCustomer) customer else "You") + "  " + clock(m.created_at),
                    style = MaterialTheme.typography.bodySmall,
                    color = Bz.Ink48,
                )
            }
        }
        val corner = RoundedCornerShape(
            topStart = if (fromCustomer && head) 4.dp else 16.dp,
            topEnd = if (!fromCustomer && head) 4.dp else 16.dp,
            bottomStart = 16.dp,
            bottomEnd = 16.dp,
        )
        val (bg, fg) = when (m.role) {
            "buyer" -> Bz.Canvas to Bz.Ink
            "bot" -> Bz.Raised to Bz.Ink
            else -> Bz.Ink to Color.White
        }
        Text(
            m.text,
            style = MaterialTheme.typography.bodyLarge,
            color = fg,
            modifier = Modifier
                .widthIn(max = 300.dp)
                .alpha(if (pending) 0.6f else 1f)
                .clip(corner)
                .background(bg)
                .then(if (fromCustomer) Modifier.border(1.dp, Bz.Hairline, corner) else Modifier)
                .padding(horizontal = 14.dp, vertical = 9.dp),
        )
        m.translation?.let { tr ->
            Column(
                Modifier
                    .padding(top = 6.dp)
                    .widthIn(max = 300.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Bz.Canvas)
                    .border(1.dp, Bz.Hairline, RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Text(if (fromCustomer) "Translated for you" else "Sent in ${buyerLang.uppercase()}", style = MaterialTheme.typography.bodySmall, color = Bz.Ink48)
                Text(tr, style = MaterialTheme.typography.bodyMedium, color = Bz.Ink80)
            }
        }
    }
}
