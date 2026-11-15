package app.bizzassist.agent.data

import app.bizzassist.agent.BuildConfig
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import java.io.IOException
import java.util.concurrent.TimeUnit

// ---- shapes of the BizzAssist web API (web/app/api/...) ----

@Serializable data class LoginBody(val email: String, val password: String)
@Serializable data class ApiUser(val id: String, val name: String, val email: String, val role: String, val lang: String, val nx_user_id: String)
@Serializable data class LoginResponse(val token: String, val user: ApiUser)

@Serializable data class MeResponse(val user: ApiUser)
@Serializable data class LangBody(val lang: String)

@Serializable data class Summary(val issue: String? = null)
@Serializable
data class QueueRow(
    val id: String,
    val status: String,
    val nx_group_id: String,
    val buyer_lang: String,
    val widget: String,
    val summary: Summary? = null,
    val waiting_since: String? = null,
    val created_at: String,
    val assigned_name: String? = null,
    val last_text: String? = null,
    val last_at: String? = null,
)
@Serializable data class Counts(val waiting: Int, val mine: Int)
@Serializable data class QueueResponse(val rows: List<QueueRow>, val counts: Counts, val now: String)

@Serializable data class ClaimResponse(val groupId: String)

/** GET /api/agent/conversations/{id}: the conversation and its stored transcript. */
@Serializable
data class ConvSummary(val issue: String? = null, val bot_tried: String? = null, val buyer_details: String? = null)
@Serializable
data class Conversation(
    val id: String,
    val status: String,
    val nx_group_id: String,
    val buyer_lang: String,
    val summary: ConvSummary? = null,
    val rating: Int? = null,
    val resolved_by: String? = null,
    val created_at: String,
    val waiting_since: String? = null,
    val assigned_user_id: String? = null,
    val assigned_name: String? = null,
    val widget: String,
)
@Serializable
data class ChatMessage(val id: String, val role: String, val text: String, val translation: String? = null, val created_at: String)
@Serializable data class DetailResponse(val conversation: Conversation, val messages: List<ChatMessage>)
@Serializable data class SendBody(val text: String)
@Serializable data class SendResponse(val message: ChatMessage)

interface BizzApi {
    @POST("api/auth/login") suspend fun login(@Body body: LoginBody): LoginResponse
    @POST("api/auth/logout") suspend fun logout(@Body body: JsonObject = JsonObject(emptyMap())): JsonObject
    @GET("api/me") suspend fun me(): MeResponse
    @PATCH("api/me") suspend fun setLang(@Body body: LangBody): MeResponse
    @GET("api/agent/conversations") suspend fun queue(@Query("tab") tab: String): QueueResponse
    @POST("api/agent/conversations/{id}/claim") suspend fun claim(@Path("id") id: String, @Body body: JsonObject = JsonObject(emptyMap())): ClaimResponse
    @POST("api/agent/conversations/{id}/resolve") suspend fun resolve(@Path("id") id: String, @Body body: JsonObject = JsonObject(emptyMap())): JsonObject
    @GET("api/agent/conversations/{id}") suspend fun detail(@Path("id") id: String): DetailResponse
    @POST("api/agent/conversations/{id}/messages") suspend fun send(@Path("id") id: String, @Body body: SendBody): SendResponse
}

object Api {
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    /** Bearer token for every call; null when signed out. */
    @Volatile var token: String? = null

    val service: BizzApi by lazy {
        val client = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val t = token
                val req = chain.request().newBuilder().apply { if (t != null) header("Authorization", "Bearer $t") }.build()
                chain.proceed(req)
            }
            .build()
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(BizzApi::class.java)
    }

    @Serializable private data class ErrorBody(val error: String? = null)

    /** The server's own error message ({"error": "..."}), or a plain fallback. */
    fun message(t: Throwable): String = when (t) {
        is HttpException -> runCatching { t.response()?.errorBody()?.string()?.let { json.decodeFromString<ErrorBody>(it).error } }.getOrNull()
            ?: "Something went wrong (${t.code()}). Try again."
        is IOException -> "No connection. Check your internet and try again."
        else -> t.message ?: "Something went wrong. Try again."
    }

    fun isUnauthorized(t: Throwable) = t is HttpException && t.code() == 401
}
