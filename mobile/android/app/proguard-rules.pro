# ============================================================
# Peakadex — ProGuard / R8 rules
# ============================================================

# --------------- Kotlin & Coroutines ------------------------
-keepattributes *Annotation*, InnerClasses, Signature, Exceptions, EnclosingMethod
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**

# --------------- Kotlinx Serialization ---------------------
# Keep generated $serializer companions and serializer() methods
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
# Keep all @Serializable classes in this project
-keep,includedescriptorclasses class com.peakadex.app.**$$serializer { *; }
-keepclassmembers class com.peakadex.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.peakadex.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}
# Keep data class fields used by Kotlinx Serialization
-keepclassmembers @kotlinx.serialization.Serializable class com.peakadex.app.** {
    <fields>;
}

# --------------- App models (full protection) ---------------
-keep class com.peakadex.app.core.model.** { *; }

# --------------- Retrofit -----------------------------------
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }
# Keep the ApiService interface and its annotations (HTTP verbs, paths, params)
-keep interface com.peakadex.app.core.api.ApiService { *; }

# --------------- OkHttp & Okio ------------------------------
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# --------------- MapLibre Android SDK -----------------------
-keep class org.maplibre.** { *; }
-dontwarn org.maplibre.**
# MapLibre uses JNI — keep native method signatures
-keepclasseswithmembernames class * {
    native <methods>;
}

# --------------- Coil image loader --------------------------
-dontwarn coil.**

# --------------- AndroidX / Compose -------------------------
# AGP handles most Compose rules; keep ViewModel subclasses for nav
-keep class * extends androidx.lifecycle.ViewModel { *; }

# --------------- Firebase (Analytics + Crashlytics) ---------
# R8 full mode (default on AGP 9) strips the no-arg constructors of Firebase
# ComponentRegistrar implementations, which crashes the app at launch with
# "FirebaseCrashlytics component is not present". Keep the registrars + their
# constructors so the Firebase component discovery can instantiate them.
-keep class * implements com.google.firebase.components.ComponentRegistrar {
    <init>();
}
-keepnames class com.google.firebase.components.ComponentRegistrar
-keep class com.google.firebase.crashlytics.** { *; }
-dontwarn com.google.firebase.**

# --------------- Crash / debugging helpers ------------------
# Keep original exception class names so crash reports are readable
-keepnames class * extends java.lang.Exception
