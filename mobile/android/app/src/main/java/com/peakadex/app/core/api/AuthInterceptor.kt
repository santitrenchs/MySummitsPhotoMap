package com.peakadex.app.core.api

import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor : Interceptor {

    @Volatile
    var token: String? = null

    /** Invoked when an authenticated request comes back 401 (expired/revoked token). */
    @Volatile
    var onUnauthorized: (() -> Unit)? = null

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = this.token ?: return chain.proceed(request)

        val authenticated = request.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()

        val response = chain.proceed(authenticated)

        // A 401 on a token-bearing request means the session is no longer valid.
        // Auth endpoints (login/register/google) use 401 for bad credentials — skip them.
        if (response.code == 401 && !request.url.encodedPath.contains("/auth/")) {
            onUnauthorized?.invoke()
        }

        return response
    }
}
