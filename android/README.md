# BizzAssist Agent (Android)

The agent app: sign in, see waiting chats, claim one, answer it in Nexconn ChatUI, resolve it.

Kotlin, Jetpack Compose (Material 3), Retrofit with kotlinx.serialization, DataStore, Nexconn ChatUI `ai.nexconn.chat:chatui:26.4.2`.

## Screens

- **Login:** email and the temporary password the owner created in Team. It calls `POST /api/auth/login` and stores the bearer token.
- **Chats:**
  - Waiting and Mine tabs, with pull to refresh and a poll every 3 s while the screen is visible.
  - **Claim chat** calls the atomic claim. Only one agent wins. The app then opens the group chat in ChatUI's `ChannelActivity`.
  - **Resolve** closes the chat. The answer goes to the Learned suggestions on the web.
  - A new waiting chat raises a local notification while the app is running.
- **Settings:** shows who is signed in. You can pick the language chats are translated into (`PATCH /api/me`), or sign out.

## Build

Open the `android/` folder in Android Studio (Ladybug or newer, JDK 17+). Android Studio downloads Gradle 8.13 from `gradle/wrapper/gradle-wrapper.properties`.

The repo has no `gradlew` script or wrapper jar. To build from a terminal, run `gradle wrapper --gradle-version 8.13` once with any local Gradle.

1. Copy `local.properties.example` to `local.properties` and fill it in:
   - `bizzassist.apiBaseUrl`: the deployed web app, ending in `/`.
   - `bizzassist.nexconnAppKey`: the Nexconn App Key. The App Key is public by design. The App Secret stays on the server.
   - `bizzassist.nexconnArea`: `SG`, `NA` or `SA`. It must match the web app's `NEXCONN_AREA`.
2. Run the `app` configuration, or **Build > Build APK(s)**. The release build is signed with the debug key so it can be sideloaded.

## Notes and open items

- **SDK classes:** class names are checked against the 26.4.2 docs and AAR classes. These are `NCChatUI`, `InitParams`, `AreaCode`, `ConnectParams`, `ConnectHandler`, `NCUserInfoManager`, `UserDataProvider.UserInfoProvider`, `UserInfo`, `UserType`, `ChannelType.GROUP`, `ChannelIdentifier` and `ChannelActivity.newIntent`.
- **Names in chat:** names come from `POST /api/agent/profiles` through the user info provider (`DataSourceType.INFO_PROVIDER`). No group info provider is set yet, so the chat title shows the channel ID.
- **Background push:** there is none yet. Nexconn push needs FCM, which means a Firebase project and `google-services.json` (git-ignored). The server already sends a system-channel alert on every handover, so push only needs the FCM setup. Until then, alerts arrive while the app is open.
- **`targetSdk`:** it is 35. ChatUI's View-based screens rely on the edge-to-edge opt-out, which Android 16 ignores for apps that target 36.
- **Not built or run here:** this was written without building or running it, per the project rules. The first Gradle sync is the first compile check.
