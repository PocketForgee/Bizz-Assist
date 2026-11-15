package app.bizzassist.agent.data

import ai.nexconn.chat.channel.ChannelType
import ai.nexconn.chat.channel.model.ChannelIdentifier
import ai.nexconn.chat.error.NCError
import ai.nexconn.chat.handler.ConnectHandler
import ai.nexconn.chat.params.ConnectParams
import ai.nexconn.chat.user.model.UserInfo
import ai.nexconn.chat.user.model.UserType
import ai.nexconn.chatui.NCChatUI
import ai.nexconn.chatui.channel.ChannelActivity
import ai.nexconn.chatui.userinfo.NCUserInfoManager
import ai.nexconn.chatui.userinfo.UserDataProvider
import android.content.Context
import android.util.Log
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Nexconn ChatUI glue. Class names verified against chatui/chat 26.4.2 (docs + AAR classes):
 * NCChatUI.connect(ConnectParams, ConnectHandler), NCUserInfoManager (INFO_PROVIDER), UserInfo(id, UserType, name, portrait),
 * ChannelActivity.newIntent(Context, ChannelIdentifier(ChannelType.GROUP, id)).
 */
object Chat {
    private const val TAG = "BizzChat"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    @Volatile private var connectedAs: String? = null

    /** Names come from our server (bot, agents, "Customer ABCD · ES"); nothing is hosted in Nexconn. */
    fun installUserInfoProvider() {
        val manager = NCUserInfoManager.getInstance()
        manager.setDataSourceType(NCUserInfoManager.DataSourceType.INFO_PROVIDER)
        manager.setUserInfoProvider(UserDataProvider.UserInfoProvider { userId ->
            // async: return null now, refresh the cache when the server answers
            scope.launch {
                runCatching { Api.service.profiles(ProfilesBody(listOf(userId))).users }
                    .onSuccess { users ->
                        users.forEach { p ->
                            val type = if (p.userId.startsWith("b")) UserType.ROBOT else UserType.NORMAL
                            manager.refreshUserInfoCache(UserInfo(p.userId, type, p.name, p.avatarUrl.orEmpty()))
                        }
                    }
                    .onFailure { Log.w(TAG, "profile lookup failed for $userId", it) }
            }
            null
        }, true)
        // shortcut: no GroupInfoProvider yet, so the chat title shows the channel ID; add one once the
        // GroupInfo(groupId, name) parameter order is confirmed in the Chat SDK.
    }

    /** Connects once per signed-in agent. The SDK reconnects by itself after that. */
    suspend fun connect(): Result<String> {
        val session = runCatching { Api.service.chatSession() }.getOrElse { return Result.failure(it) }
        if (connectedAs == session.userId) return Result.success(session.userId)
        return suspendCancellableCoroutine { cont ->
            NCChatUI.connect(ConnectParams(session.token), object : ConnectHandler {
                override fun onResult(userId: String?, error: NCError?) {
                    if (!cont.isActive) return
                    if (error == null && userId != null) {
                        connectedAs = userId
                        cont.resume(Result.success(userId))
                    } else {
                        cont.resume(Result.failure(IllegalStateException("Chat connection failed: ${error?.message.orEmpty()}")))
                    }
                }

                override fun onDatabaseOpened(isRecreated: Boolean, error: NCError?) {
                    if (error != null) Log.e(TAG, "database open failed: ${error.message}")
                }
            })
        }
    }

    /** On sign-out: drop the connection and its push registration. */
    fun logout() {
        connectedAs = null
        runCatching { NCChatUI.logout() }
    }

    /** Opens the live group chat in ChatUI's own screen. */
    fun open(context: Context, groupId: String) {
        if (!NCChatUI.isInitialized()) {
            Toast.makeText(context, "Chat isn't set up in this build (Nexconn App Key missing).", Toast.LENGTH_LONG).show()
            return
        }
        context.startActivity(ChannelActivity.newIntent(context, ChannelIdentifier(ChannelType.GROUP, groupId)))
    }
}
