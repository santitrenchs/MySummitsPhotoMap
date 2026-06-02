package com.peakadex.app.core.auth

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

class TokenStorage(private val context: Context) {
    companion object {
        private const val PREFS_NAME = "peakadex_secure_prefs"
        private const val KEY_TOKEN  = "auth_token"
        private const val KEY_USER_NAME       = "user_name"
        private const val KEY_USER_AVATAR_URL = "user_avatar_url"
    }

    private val prefs by lazy {
        // MasterKeys API is the stable 1.0.0 interface (MasterKey.Builder requires 1.1.0-alpha).
        // AES256_GCM_SPEC generates/retrieves a hardware-backed AES-256-GCM key in the Keystore.
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)

        @Suppress("DEPRECATION") // create(name, alias, ctx, ...) is the 1.0.0 stable overload
        EncryptedSharedPreferences.create(
            PREFS_NAME,
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun deleteToken() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_USER_NAME)
            .remove(KEY_USER_AVATAR_URL)
            .apply()
    }

    fun saveUserProfile(name: String, avatarUrl: String?) {
        prefs.edit()
            .putString(KEY_USER_NAME, name)
            .putString(KEY_USER_AVATAR_URL, avatarUrl)
            .apply()
    }

    fun getSavedUserName(): String? = prefs.getString(KEY_USER_NAME, null)
    fun getSavedAvatarUrl(): String? = prefs.getString(KEY_USER_AVATAR_URL, null)
}
