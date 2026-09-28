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
        private const val KEY_UNITS = "units"
        private const val KEY_COUNTRY = "country"
        /** Stored for a null country, because putString(key, null) removes the key
         *  and "not specified" must stay distinguishable from "never fetched". */
        private const val COUNTRY_NONE = ""
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
            .remove(KEY_UNITS)
            .remove(KEY_COUNTRY)
            .apply()
    }

    fun saveUserProfile(name: String, avatarUrl: String?) {
        prefs.edit()
            .putString(KEY_USER_NAME, name)
            .putString(KEY_USER_AVATAR_URL, avatarUrl)
            .apply()
    }

    /** Persisted so altitudes render in the right unit on the very first frame,
     *  before any network call. */
    fun saveUnits(units: String?) {
        prefs.edit().putString(KEY_UNITS, units).apply()
    }

    fun getSavedUnits(): String? = prefs.getString(KEY_UNITS, null)

    /** Persisted so the Atlas can frame the user's country on a cold start,
     *  before `getMe()` answers. */
    fun saveCountry(country: String?) {
        prefs.edit().putString(KEY_COUNTRY, country ?: COUNTRY_NONE).apply()
    }

    fun clearCountry() {
        prefs.edit().remove(KEY_COUNTRY).apply()
    }

    fun getSavedCountry(): String? =
        prefs.getString(KEY_COUNTRY, null)?.takeIf { it != COUNTRY_NONE }

    /** False for sessions restored from before the country existed: fetch it once. */
    fun hasSavedCountry(): Boolean = prefs.contains(KEY_COUNTRY)

    fun getSavedUserName(): String? = prefs.getString(KEY_USER_NAME, null)
    fun getSavedAvatarUrl(): String? = prefs.getString(KEY_USER_AVATAR_URL, null)
}
