package app.bizzassist.agent

import ai.nexconn.chat.params.AreaCode
import ai.nexconn.chat.params.InitParams
import ai.nexconn.chatui.NCChatUI
import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.util.Log
import app.bizzassist.agent.data.Chat

class BizzApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Per the Nexconn quickstart: initialize ChatUI once in Application.onCreate, before any connect.
        if (BuildConfig.NEXCONN_APP_KEY.isNotBlank()) {
            val params = InitParams(applicationContext, BuildConfig.NEXCONN_APP_KEY).apply {
                areaCode = runCatching { AreaCode.valueOf(BuildConfig.NEXCONN_AREA) }.getOrDefault(AreaCode.SG)
            }
            NCChatUI.initialize(params)
            Chat.installUserInfoProvider()
        } else {
            Log.e("BizzApp", "bizzassist.nexconnAppKey is missing from local.properties; chat screens will not open")
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(Notify.CHANNEL_WAITING, getString(R.string.channel_waiting), NotificationManager.IMPORTANCE_HIGH)
                .apply { description = getString(R.string.channel_waiting_desc) }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
