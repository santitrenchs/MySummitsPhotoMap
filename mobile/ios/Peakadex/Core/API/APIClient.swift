import Foundation

final class APIClient {
    static let shared = APIClient()

    var token: String?

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private var baseURL: URL {
        #if STAGING
        return URL(string: "https://develop.peakadex.com/api/v1")!
        #else
        return URL(string: "https://www.peakadex.com/api/v1")!
        #endif
    }

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        session = URLSession(configuration: config)

        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
    }

    // MARK: - JSON requests

    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        let urlRequest = try buildRequest(endpoint)
        return try await perform(urlRequest)
    }

    func requestVoid(_ endpoint: Endpoint) async throws {
        let urlRequest = try buildRequest(endpoint)
        let (_, response) = try await session.data(for: urlRequest)
        try validate(response: response, data: nil)
    }

    // MARK: - Multipart upload

    func upload<T: Decodable>(_ endpoint: Endpoint, parts: [MultipartPart]) async throws -> T {
        var urlRequest = try buildRequest(endpoint)
        let boundary = "Boundary-\(UUID().uuidString)"
        urlRequest.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = buildMultipartBody(parts: parts, boundary: boundary)
        return try await perform(urlRequest)
    }

    // MARK: - Private helpers

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingFailed(error)
        }
    }

    private func validate(response: URLResponse, data: Data?) throws {
        guard let http = response as? HTTPURLResponse else { throw APIError.unknown }
        switch http.statusCode {
        case 200...299: return
        case 401:       throw APIError.unauthorized
        case 404:       throw APIError.notFound
        default:        throw APIError.serverError(statusCode: http.statusCode)
        }
    }

    private func buildRequest(_ endpoint: Endpoint) throws -> URLRequest {
        var components = URLComponents(url: baseURL.appendingPathComponent(endpoint.path),
                                       resolvingAgainstBaseURL: false)!
        components.queryItems = endpoint.queryItems

        guard let url = components.url else { throw APIError.unknown }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue

        if !endpoint.isMultipart {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        if endpoint.requiresAuth, let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = endpoint.body, !endpoint.isMultipart {
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        return request
    }

    private func buildMultipartBody(parts: [MultipartPart], boundary: String) -> Data {
        var data = Data()
        let crlf = "\r\n"
        for part in parts {
            data.append("--\(boundary)\(crlf)")
            data.append("Content-Disposition: form-data; name=\"\(part.name)\"")
            if let filename = part.filename {
                data.append("; filename=\"\(filename)\"")
            }
            data.append(crlf)
            if let mimeType = part.mimeType {
                data.append("Content-Type: \(mimeType)\(crlf)")
            }
            data.append(crlf)
            data.append(part.data)
            data.append(crlf)
        }
        data.append("--\(boundary)--\(crlf)")
        return data
    }
}

// MARK: - Supporting types

struct MultipartPart {
    let name: String
    let data: Data
    let filename: String?
    let mimeType: String?

    init(name: String, data: Data, filename: String? = nil, mimeType: String? = nil) {
        self.name = name
        self.data = data
        self.filename = filename
        self.mimeType = mimeType
    }

    static func json(name: String, value: some Encodable) -> MultipartPart {
        let data = (try? JSONEncoder().encode(value)) ?? Data()
        return MultipartPart(name: name, data: data, mimeType: "application/json")
    }

    static func jpeg(name: String, data: Data, filename: String = "photo.jpg") -> MultipartPart {
        MultipartPart(name: name, data: data, filename: filename, mimeType: "image/jpeg")
    }
}

// Allows encoding `any Encodable` via a type-erased wrapper
private struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void
    init(_ value: any Encodable) { _encode = value.encode }
    func encode(to encoder: Encoder) throws { try _encode(encoder) }
}

private extension Data {
    mutating func append(_ string: String) {
        if let data = string.data(using: .utf8) { append(data) }
    }
}
