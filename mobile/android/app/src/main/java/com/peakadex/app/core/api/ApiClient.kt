package com.peakadex.app.core.api

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.peakadex.app.BuildConfig
import kotlinx.serialization.json.Json
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
