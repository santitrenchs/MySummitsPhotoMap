plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.google.services)
    alias(libs.plugins.firebase.crashlytics)
}

android {
    namespace = "com.peakadex.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.peakadex.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "1.1"
    }

    signingConfigs {
        create("release") {
            storeFile = file(providers.gradleProperty("PEAKADEX_STORE_FILE").getOrElse(""))
            storePassword = providers.gradleProperty("PEAKADEX_STORE_PASSWORD").getOrElse("")
            keyAlias = providers.gradleProperty("PEAKADEX_KEY_ALIAS").getOrElse("")
            keyPassword = providers.gradleProperty("PEAKADEX_KEY_PASSWORD").getOrElse("")
        }
    }

    buildTypes {
        val googleWebClientId = "\"459929432551-ha3k64nssd83o0qt9biro3l52de06am9.apps.googleusercontent.com\""
        // CARTO basemaps key. Free (5M tile requests/month) and public by design — it ships
        // inside the APK — but this repo is public, so it is read from a Gradle property
        // (CARTO_API_KEY in ~/.gradle/gradle.properties) rather than committed. Without it
        // the basemap tiles render with an "API KEY REQUIRED" watermark.
        val cartoApiKey = "\"" + providers.gradleProperty("CARTO_API_KEY").getOrElse("") + "\""
        // Satellite imagery goes through our own Cloudflare Worker, never straight to
        // Esri: the ArcGIS key stays in a Worker secret instead of inside the APK, and
        // the edge cache absorbs repeat tiles. See workers/satellite-tiles/.
        // Override with SATELLITE_TILES_URL in ~/.gradle/gradle.properties to point a
        // debug build at `wrangler dev`.
        val satelliteTilesUrl = "\"" + providers.gradleProperty("SATELLITE_TILES_URL")
            .getOrElse("https://tiles.peakadex.com/satellite/{z}/{x}/{y}") + "\""
        debug {
            buildConfigField("String", "BASE_URL", "\"https://mysummitsphotomap-staging.up.railway.app/api/v1/\"")
            buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", googleWebClientId)
            buildConfigField("String", "CARTO_API_KEY", cartoApiKey)
            buildConfigField("String", "SATELLITE_TILES_URL", satelliteTilesUrl)
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            buildConfigField("String", "BASE_URL", "\"https://www.peakadex.com/api/v1/\"")
            buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", googleWebClientId)
            buildConfigField("String", "CARTO_API_KEY", cartoApiKey)
            buildConfigField("String", "SATELLITE_TILES_URL", satelliteTilesUrl)
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

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinJvmCompile>().configureEach {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.appcompat)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.navigation.compose)
    implementation(libs.retrofit)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp.logging)
    implementation(libs.coil.compose)
    implementation(libs.coil.network.okhttp)
    implementation(libs.android.image.cropper)
    implementation(libs.security.crypto)
    implementation(libs.core.splashscreen)
    implementation(libs.kotlinx.coroutines.android)
    // `Task.await()` en PushTokenRegistrar. Llegaba transitivamente vía
    // credentials-play-services-auth; declararla evita que cambiar aquella
    // rompa el push con un "unresolved reference: await".
    implementation(libs.kotlinx.coroutines.play.services)
    implementation(libs.maplibre.android.sdk)
    implementation(libs.credentials)
    implementation(libs.credentials.play.services.auth)
    implementation(libs.googleid)
    implementation(libs.lottie)
    // Firebase — BoM keeps analytics + crashlytics on a single compatible version set
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.analytics)
    implementation(libs.firebase.crashlytics)
    implementation(libs.firebase.messaging)
    debugImplementation(libs.androidx.compose.ui.tooling)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
