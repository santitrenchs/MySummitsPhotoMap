package com.peakadex.app.core.api

sealed class ApiError(message: String) : Exception(message) {
    data object Unauthorized : ApiError("Session expired. Please log in again.")
    data object NotFound : ApiError("Resource not found.")
    data class ServerError(val statusCode: Int) : ApiError("Server error ($statusCode).")
    data class NetworkError(val rootCause: Throwable) : ApiError("Network error: ${rootCause.message}")
    data class DecodingError(val rootCause: Throwable) : ApiError("Failed to parse response: ${rootCause.message}")
    data object Unknown : ApiError("An unexpected error occurred.")
}
