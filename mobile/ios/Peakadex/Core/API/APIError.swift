import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case notFound
    case serverError(statusCode: Int)
    case decodingFailed(Error)
    case networkFailed(Error)
    case unknown

    var errorDescription: String? {
        switch self {
        case .unauthorized:               return "Session expired. Please log in again."
        case .notFound:                   return "Resource not found."
        case .serverError(let code):      return "Server error (\(code))."
        case .decodingFailed(let error):  return "Failed to parse response: \(error.localizedDescription)"
        case .networkFailed(let error):   return "Network error: \(error.localizedDescription)"
        case .unknown:                    return "An unexpected error occurred."
        }
    }
}
