package com.peakadex.app.feature.auth

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.peakadex.app.AppContainer
import com.peakadex.app.BuildConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.SerializationException
import retrofit2.HttpException
import java.io.IOException

private const val TAG = "AuthViewModel"

sealed class AuthUiState {
    data object Idle    : AuthUiState()
    data object Loading : AuthUiState()
    data object Success : AuthUiState()
    data class  Error(val message: String) : AuthUiState()
}

class AuthViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    // ─── Login ────────────────────────────────────────────────────────────────

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _uiState.value = AuthUiState.Error("Por favor completa todos los campos")
            return
        }
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            try {
                val response = AppContainer.apiService.login(
                    mapOf("email" to email.trim(), "password" to password)
                )
                AppContainer.authSession.login(response.token, response.user)
                _uiState.value = AuthUiState.Success
            } catch (e: HttpException) {
                Log.e(TAG, "login HTTP ${e.code()}")
                _uiState.value = AuthUiState.Error(
                    when (e.code()) {
                        401  -> "Email o contraseña incorrectos"
                        429  -> "Demasiados intentos. Espera un momento"
                        else -> "Error del servidor (${e.code()})"
                    }
                )
            } catch (e: SerializationException) {
                Log.e(TAG, "login serialization error", e)
                _uiState.value = AuthUiState.Error("Error al procesar la respuesta del servidor")
            } catch (e: IOException) {
                Log.e(TAG, "login network error", e)
                _uiState.value = AuthUiState.Error("Sin conexión a internet")
            } catch (e: Exception) {
                Log.e(TAG, "login unexpected error: ${e::class.simpleName}", e)
                _uiState.value = AuthUiState.Error("Error inesperado: ${e::class.simpleName}")
            }
        }
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    fun register(
        name: String,
        email: String,
        password: String,
        confirmPassword: String,
        voucherCode: String,
    ) {
        when {
            name.isBlank() || email.isBlank() || password.isBlank() ->
                { _uiState.value = AuthUiState.Error("Por favor completa todos los campos"); return }
            password != confirmPassword ->
                { _uiState.value = AuthUiState.Error("Las contraseñas no coinciden"); return }
            password.length < 8 ->
                { _uiState.value = AuthUiState.Error("La contraseña debe tener al menos 8 caracteres"); return }
        }
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            try {
                val response = AppContainer.apiService.register(
                    mapOf(
                        "name"        to name.trim(),
                        "email"       to email.trim(),
                        "password"    to password,
                        "voucherCode" to voucherCode.trim().ifEmpty { null },
                    )
                )
                AppContainer.authSession.login(response.token, response.user)
                _uiState.value = AuthUiState.Success
            } catch (e: HttpException) {
                _uiState.value = AuthUiState.Error(
                    when (e.code()) {
                        400  -> "Código de invitación inválido o expirado"
                        409  -> "Ya existe una cuenta con ese email"
                        else -> "Error del servidor (${e.code()})"
                    }
                )
            } catch (e: IOException) {
                _uiState.value = AuthUiState.Error("Sin conexión a internet")
            } catch (e: Exception) {
                _uiState.value = AuthUiState.Error("Error inesperado. Inténtalo de nuevo")
            }
        }
    }

    // ─── Google Sign-In ───────────────────────────────────────────────────────

    fun signInWithGoogle(context: Context) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            try {
                // 1. Request Google ID token via Credential Manager
                val credentialManager = CredentialManager.create(context)
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                    .setAutoSelectEnabled(false)
                    .build()
                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()
                val result = credentialManager.getCredential(context, request)
                val credential = GoogleIdTokenCredential.createFrom(result.credential.data)
                val idToken = credential.idToken

                // 2. Exchange token for Peakadex JWT
                val response = AppContainer.apiService.loginWithGoogle(mapOf("idToken" to idToken))
                AppContainer.authSession.login(response.token, response.user)
                _uiState.value = AuthUiState.Success

            } catch (e: GetCredentialCancellationException) {
                // User dismissed the picker — silent, no error shown
                Log.d(TAG, "Google sign-in cancelled by user")
                _uiState.value = AuthUiState.Idle
            } catch (e: NoCredentialException) {
                Log.e(TAG, "Google sign-in: no credentials available", e)
                _uiState.value = AuthUiState.Error(
                    "No se encontró ninguna cuenta de Google en este dispositivo. " +
                    "Añade una cuenta en Ajustes del sistema e inténtalo de nuevo."
                )
            } catch (e: GetCredentialException) {
                Log.e(TAG, "Google credential error type=${e.type} class=${e::class.simpleName} msg=${e.message}", e)
                _uiState.value = AuthUiState.Error("Error con Google Sign-In: ${e.message}")
            } catch (e: HttpException) {
                Log.e(TAG, "Google login HTTP ${e.code()}", e)
                _uiState.value = AuthUiState.Error("Error al iniciar sesión con Google (${e.code()})")
            } catch (e: IOException) {
                Log.e(TAG, "Google login network error", e)
                _uiState.value = AuthUiState.Error("Sin conexión a internet")
            } catch (e: Exception) {
                Log.e(TAG, "Google login unexpected: ${e::class.simpleName}", e)
                _uiState.value = AuthUiState.Error("Error inesperado con Google Sign-In")
            }
        }
    }

    fun resetState() { _uiState.value = AuthUiState.Idle }
}
