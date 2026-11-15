import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// Server URL and Nexconn App Key come from local.properties (see local.properties.example), never from git.
val local = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun localProp(key: String, default: String = "") = (local.getProperty(key) ?: default).replace("\"", "")

android {
    namespace = "app.bizzassist.agent"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.bizzassist.agent"
        minSdk = 24
        // 35, not 36: on 36 Android ignores the edge-to-edge opt-out that ChatUI's screens (built for 34) still need
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        val apiBase = localProp("bizzassist.apiBaseUrl", "https://137-23-61-46.sslip.io/").let { if (it.endsWith("/")) it else "$it/" }
        buildConfigField("String", "API_BASE_URL", "\"$apiBase\"")
        buildConfigField("String", "NEXCONN_APP_KEY", "\"${localProp("bizzassist.nexconnAppKey")}\"")
        buildConfigField("String", "NEXCONN_AREA", "\"${localProp("bizzassist.nexconnArea", "SG")}\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // shortcut: release is signed with the debug key so judges can sideload it; add a real signing config before Play.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

kotlin {
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}

dependencies {
    // Nexconn Chat UI (pulls the matching Chat SDK, AppCompat and Glide)
    implementation("ai.nexconn.chat:chatui:26.4.2")

    val composeBom = platform("androidx.compose:compose-bom:2025.01.00")
    implementation(composeBom)
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")

    implementation("androidx.datastore:datastore-preferences:1.1.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
