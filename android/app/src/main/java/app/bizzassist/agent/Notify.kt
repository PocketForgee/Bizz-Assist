package app.bizzassist.agent

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import app.bizzassist.agent.data.QueueRow

/**
 * Local alert for a new waiting chat, raised by the queue poll while the app is running.
 * shortcut: no background push yet; Nexconn push needs FCM (google-services.json) and the server-side system alert.
 */
object Notify {
    const val CHANNEL_WAITING = "waiting"

    fun newWaiting(context: Context, row: QueueRow) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return
        val open = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val text = row.summary?.issue ?: row.last_text ?: "A customer is waiting."
        val n = NotificationCompat.Builder(context, CHANNEL_WAITING)
            .setSmallIcon(R.drawable.ic_notify)
            .setContentTitle("New chat waiting (${row.buyer_lang.uppercase()})")
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        NotificationManagerCompat.from(context).notify(row.id.hashCode(), n)
    }
}
