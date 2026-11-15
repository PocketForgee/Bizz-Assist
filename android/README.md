# BizzAssist Agent (Android)

The agent app. You sign in, see the chats waiting for a person, claim one, answer the customer and resolve the chat.

Kotlin, Jetpack Compose (Material 3), Retrofit with kotlinx.serialization, DataStore. The app uses the same design tokens as the web app: graphite surfaces, one deep-green accent and the numbered "slip" tags.

A ready-to-install build is `BizzAssist-Agent.apk` in the repository root. It points at the demo server.

## Screens

- **Sign in.** Use the email and temporary password the owner created in Team. The app calls `POST /api/auth/login` and stores the bearer token in app-private DataStore.
- **Chats.**
  - Waiting and Mine tabs, polled every 3 s while the screen is visible. Pull down to refresh.
  - Waiting chats show a live dot and a wait timer.
  - A new waiting chat raises a local notification while the app is running.
- **Chat.**
  - The stored transcript (`GET /api/agent/conversations/:id`), polled every 1.5 s while it is open.
  - The assistant's summary sits at the top and can be collapsed.
  - A customer message in another language shows a translation under it.
  - **Claim chat** is atomic, so only one agent wins.
  - Replies go to `POST /api/agent/conversations/:id/messages`. The server sends each reply into the Nexconn group as you.
  - **Resolve** closes the chat and sends your answers to the owner's Learned suggestions.
- **Settings.** Pick the language chats are translated into (`PATCH /api/me`), or sign out.

## Build

Requires JDK 17 or newer and the Android SDK (API 36).

1. Optional: copy `local.properties.example` to `local.properties` and set `bizzassist.apiBaseUrl` to your server, ending in `/`. Without it the app uses the demo server.
2. Build the APK:
   ```
   ./gradlew assembleRelease
   ```
   The APK is written to `app/build/outputs/apk/release/app-release.apk`. You can also open the folder in Android Studio.

The release build is signed with the debug key so it can be sideloaded. Add a real signing config before publishing to Play.

## Notes

- **Why no Nexconn SDK in the app:** the app talks only to the BizzAssist API, and the server relays every reply through Nexconn. An earlier build used Nexconn ChatUI's chat screen. That screen showed no messages from before the agent joined the group, and no reply box, so it was replaced with this native screen. The web agent inbox had the same problem and got the same fix.
- **Background push:** there is none yet. Alerts arrive while the app is running. Push needs Firebase Cloud Messaging (`google-services.json`, which is git-ignored).
