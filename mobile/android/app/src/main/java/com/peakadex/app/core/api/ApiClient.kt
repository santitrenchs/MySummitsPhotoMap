package com.peakadex.app.core.api

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.peakadex.app.BuildConfig
import kotlinx.serialization.json.Json
import okhttp3.CertificatePinner
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

/**
 * Builds the Retrofit [ApiService].
 * Called once from [com.peakadex.app.AppContainer.init].
 * No Hilt — AGP 9.x is not compatible with Hilt's annotation processor.
 */
object ApiClient {

    private val json = Json {
        ignoreUnknownKeys = true   // API can add fields without breaking the app
        isLenient = true
        coerceInputValues = true
    }

    /**
     * Certificate pinning for production traffic.
     *
     * Strategy: pin the Let's Encrypt E7 intermediate (stable, survives leaf rotations every 90d)
     * + ISRG Root X1 as backup (survives intermediate rotation if LE switches from E7 to E8).
     *
     * To update pins when LE rotates intermediates:
     *   openssl s_client -connect www.peakadex.com:443 -showcerts 2>/dev/null |
     *   awk '/BEGIN CERT/{c++} c==2{print}' |
     *   openssl x509 -pubkey -noout | openssl pkey -pubin -outform DER |
     *   openssl dgst -sha256 -binary | base64
     *
     * Pins verified: 2026-05-26
     *   Leaf expires:        2026-08-05 (Let's Encrypt E7 — not pinned, rotates every 90d)
     *   Intermediate E7:     y7xVm0TVJNahMr2sZydE2jQH8SquXV9yLF9seROHHHU=
     *   ISRG Root X1:        C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=
     */
    private val productionPinner = CertificatePinner.Builder()
        .add("www.peakadex.com", "sha256/y7xVm0TVJNahMr2sZydE2jQH8SquXV9yLF9seROHHHU=") // LE E7
        .add("www.peakadex.com", "sha256/C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=") // ISRG Root X1
        .build()

    fun buildService(authInterceptor: AuthInterceptor): ApiService {
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .apply {
                if (BuildConfig.DEBUG) {
                    addInterceptor(
                        HttpLoggingInterceptor().apply {
                            level = HttpLoggingInterceptor.Level.BODY
                        }
                    )
                } else {
                    // Certificate pinning only in release — debug hits staging which has
                    // a different certificate chain (mysummitsphotomap-staging.up.railway.app).
                    certificatePinner(productionPinner)
                }
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(ApiService::class.java)
    }
}
