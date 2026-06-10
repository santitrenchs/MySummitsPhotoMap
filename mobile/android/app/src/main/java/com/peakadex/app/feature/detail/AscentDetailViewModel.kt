package com.peakadex.app.feature.detail

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.Ascent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

private const val TAG = "AscentDetailViewModel"

sealed class AscentDetailUiState {
    data object Loading : AscentDetailUiState()
    data class Success(val ascent: Ascent) : AscentDetailUiState()
    data class Error(val message: String) : AscentDetailUiState()
}

class AscentDetailViewModel(private val ascentId: String) : ViewModel() {

    private val api = AppContainer.apiService

    private val _uiState = MutableStateFlow<AscentDetailUiState>(AscentDetailUiState.Loading)
    val uiState: StateFlow<AscentDetailUiState> = _uiState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.value = AscentDetailUiState.Loading
            try {
                val ascent = api.getAscent(ascentId).ascent
                _uiState.value = AscentDetailUiState.Success(ascent)
            } catch (e: HttpException) {
                Log.e(TAG, "getAscent HTTP ${e.code()}")
                _uiState.value = AscentDetailUiState.Error("Error del servidor (${e.code()})")
            } catch (e: IOException) {
                Log.e(TAG, "getAscent network error", e)
                _uiState.value = AscentDetailUiState.Error("Sin conexión. Comprueba tu red.")
            } catch (e: Exception) {
                Log.e(TAG, "getAscent unexpected", e)
                _uiState.value = AscentDetailUiState.Error("Error inesperado")
            }
        }
    }

    class Factory(private val ascentId: String) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            AscentDetailViewModel(ascentId) as T
    }
}
