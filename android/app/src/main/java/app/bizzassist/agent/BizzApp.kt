package app.bizzassist.agent

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class BizzApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(Notify.CHANNEL_WAITING, getString(R.string.channel_waiting), NotificationManager.IMPORTANCE_HIGH)
                .apply { description = getString(R.string.channel_waiting_desc) }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
