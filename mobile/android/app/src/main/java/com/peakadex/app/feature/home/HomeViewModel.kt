package com.peakadex.app.feature.home

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.R
import com.peakadex.app.core.model.HomeData
import com.peakadex.app.core.ui.UiText
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

private const val TAG = "HomeViewModel"

sealed class HomeUiState {
    data object Loading : HomeUiState()
    data class  Success(val data: HomeData) : HomeUiState()
    data class  Error(val message: UiText)  : HomeUiState()
}

class HomeViewModel : ViewModel() {

    private val _uiState      = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    // Separate flag so pull-to-refresh doesn't replace the screen with a spinner
    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    init { load() }

    // Full load — shows the loading skeleton (initial entry or retry after error)
    fun load() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            fetch()
        }
    }

    // Pull-to-refresh — keeps existing data visible while fetching
    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            fetch()
            _isRefreshing.value = false
        }
    }

    private suspend fun fetch() {
        try {
            val data = AppContainer.apiService.getHome()
            _uiState.value = HomeUiState.Success(data)
        } catch (e: HttpException) {
            Log.e(TAG, "getHome HTTP ${e.code()}")
            _uiState.value = HomeUiState.Error(UiText.Dynamic("Error ${e.code()}"))
        } catch (e: IOException) {
            Log.e(TAG, "getHome network error", e)
            _uiState.value = HomeUiState.Error(UiText.StringRes(R.string.error_no_connection))
        } catch (e: Exception) {
            Log.e(TAG, "getHome unexpected error", e)
            _uiState.value = HomeUiState.Error(UiText.StringRes(R.string.error_unexpected))
        }
    }
}
