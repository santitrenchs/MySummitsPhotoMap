package com.peakadex.app.core.api

import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor : Interceptor {

    @Volatile
    var token: String? = null

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = this.token ?: return chain.proceed(request)

        val authenticated = request.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()

        return chain.proceed(authenticated)
    }
}
