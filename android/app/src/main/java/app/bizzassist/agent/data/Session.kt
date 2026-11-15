package app.bizzassist.agent.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.store by preferencesDataStore("session")

data class SavedSession(val token: String, val userId: String, val name: String, val lang: String, val role: String)

/**
 * The signed-in agent, kept across app restarts.
 * shortcut: the session token sits in app-private DataStore, not the Keystore; move it there if devices are shared.
 */
class SessionStore(private val context: Context) {
    private val kToken = stringPreferencesKey("token")
    private val kUserId = stringPreferencesKey("userId")
    private val kName = stringPreferencesKey("name")
    private val kLang = stringPreferencesKey("lang")
    private val kRole = stringPreferencesKey("role")

    suspend fun load(): SavedSession? {
        val p = context.store.data.first()
        val token = p[kToken] ?: return null
        return SavedSession(token, p[kUserId].orEmpty(), p[kName].orEmpty(), p[kLang] ?: "en", p[kRole] ?: "agent")
    }

    suspend fun save(s: SavedSession) {
        context.store.edit {
            it[kToken] = s.token
            it[kUserId] = s.userId
            it[kName] = s.name
            it[kLang] = s.lang
            it[kRole] = s.role
        }
    }

    suspend fun setLang(lang: String) {
        context.store.edit { it[kLang] = lang }
    }

    suspend fun clear() {
        context.store.edit { it.clear() }
    }
}
