package app.bizzassist.agent.ui

import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

// The API sends JSON dates as ISO 8601 in UTC ("2026-11-15T15:40:52.123Z"). java.time needs API 26; minSdk is 24.
private val iso = ThreadLocal.withInitial {
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
}
private val clockFmt = ThreadLocal.withInitial { SimpleDateFormat("HH:mm", Locale.getDefault()) }

fun parseIso(s: String?): Long? = s?.takeIf { it.length >= 19 }?.let { runCatching { iso.get()!!.parse(it.take(19))?.time }.getOrNull() }

/** "45s", "3m 07s", "2h 05m", "3d" since an ISO time. */
fun since(s: String?, now: Long): String {
    val t = parseIso(s) ?: return ""
    val sec = ((now - t) / 1000).coerceAtLeast(0)
    return when {
        sec < 60 -> "${sec}s"
        sec < 3600 -> "${sec / 60}m ${(sec % 60).toString().padStart(2, '0')}s"
        sec < 86400 -> "${sec / 3600}h ${((sec % 3600) / 60).toString().padStart(2, '0')}m"
        else -> "${sec / 86400}d"
    }
}

fun clock(s: String?): String = parseIso(s)?.let { clockFmt.get()!!.format(it) } ?: ""

/** Same customer label as the web inbox: the last four characters of the chat's group ID. */
fun customerName(groupId: String) = "Customer ${groupId.takeLast(4).uppercase()}"
