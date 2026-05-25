import Foundation

enum HTTPMethod: String {
    case GET, POST, PATCH, DELETE
}

enum Endpoint {
    // MARK: - Auth
    case login(email: String, password: String)
    case register(name: String, email: String, password: String, voucherCode: String?)
    case forgotPassword(email: String)
    case resetPassword(token: String, password: String)
    case validateVoucher(code: String)

    // MARK: - Config (public)
    case config

    // MARK: - User
    case me
    case settings
    case updateSettings(UpdateSettingsBody)
    case updatePassword(current: String, new: String)
    case uploadAvatar

    // MARK: - Ascents
    case ascents(cursor: String?)
    case createAscent(CreateAscentBody)
    case ascent(id: String)
    case updateAscent(id: String, UpdateAscentBody)
    case deleteAscent(id: String)

    // MARK: - Photos
    case uploadPhoto
    case deletePhoto(id: String)
    case photoPersons(photoId: String)
    case addPhotoPerson(photoId: String, AddPersonBody)
    case deletePhotoPerson(photoId: String, personId: String)

    // MARK: - Peaks
    case peaks(query: String?, bbox: BBoxQuery?)
    case peak(id: String)

    // MARK: - Home & Feed
    case home
    case feed(cursor: String?)
    case markFeedSeen([String])

    // MARK: - Social
    case friends
    case sendFriendRequest(userId: String)
    case updateFriend(id: String, action: FriendAction)
    case deleteFriend(id: String)
    case searchUsers(query: String)
    case persons

    // MARK: - Invitations
    case invitations
    case sendInvitation(email: String)
}

// MARK: - Endpoint properties

extension Endpoint {

    var path: String {
        switch self {
        case .login:                          return "/auth/login"
        case .register:                       return "/auth/register"
        case .forgotPassword:                 return "/auth/forgot-password"
        case .resetPassword:                  return "/auth/reset-password"
        case .validateVoucher:                return "/auth/validate-voucher"
        case .config:                         return "/config"
        case .me:                             return "/me"
        case .settings, .updateSettings:      return "/settings"
        case .updatePassword:                 return "/settings/password"
        case .uploadAvatar:                   return "/settings/avatar"
        case .ascents, .createAscent:         return "/ascents"
        case .ascent(let id):                 return "/ascents/\(id)"
        case .updateAscent(let id, _):        return "/ascents/\(id)"
        case .deleteAscent(let id):           return "/ascents/\(id)"
        case .uploadPhoto:                    return "/photos/upload"
        case .deletePhoto(let id):            return "/photos/\(id)"
        case .photoPersons(let id):           return "/photos/\(id)/persons"
        case .addPhotoPerson(let id, _):      return "/photos/\(id)/persons"
        case .deletePhotoPerson(let pId, let personId): return "/photos/\(pId)/persons/\(personId)"
        case .peaks:                          return "/peaks"
        case .peak(let id):                   return "/peaks/\(id)"
        case .home:                           return "/home"
        case .feed:                           return "/feed"
        case .markFeedSeen:                   return "/feed/seen"
        case .friends, .sendFriendRequest:    return "/friends"
        case .updateFriend(let id, _):        return "/friends/\(id)"
        case .deleteFriend(let id):           return "/friends/\(id)"
        case .searchUsers:                    return "/users/search"
        case .persons:                        return "/persons"
        case .invitations, .sendInvitation:   return "/invitations"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .me, .settings, .config, .ascents, .ascent, .peaks, .peak,
             .home, .feed, .friends, .searchUsers, .persons, .invitations, .photoPersons:
            return .GET
        case .login, .register, .forgotPassword, .resetPassword, .validateVoucher,
             .createAscent, .markFeedSeen, .sendFriendRequest, .sendInvitation,
             .addPhotoPerson, .updatePassword, .uploadPhoto, .uploadAvatar:
            return .POST
        case .updateSettings, .updateAscent, .updateFriend:
            return .PATCH
        case .deleteAscent, .deleteFriend, .deletePhoto, .deletePhotoPerson:
            return .DELETE
        }
    }

    var body: Encodable? {
        switch self {
        case .login(let email, let password):
            return ["email": email, "password": password]
        case .register(let name, let email, let password, let code):
            var b: [String: String?] = ["name": name, "email": email, "password": password]
            if let code { b["voucherCode"] = code }
            return b
        case .forgotPassword(let email):         return ["email": email]
        case .resetPassword(let token, let pw):  return ["token": token, "password": pw]
        case .validateVoucher(let code):         return ["code": code]
        case .createAscent(let b):               return b
        case .updateAscent(_, let b):            return b
        case .updateSettings(let b):             return b
        case .markFeedSeen(let ids):             return ["ids": ids]
        case .sendFriendRequest(let userId):     return ["userId": userId]
        case .updateFriend(_, let action):       return ["action": action.rawValue]
        case .sendInvitation(let email):         return ["email": email]
        case .addPhotoPerson(_, let b):          return b
        case .updatePassword(let current, let new):
            return ["currentPassword": current, "newPassword": new]
        default:
            return nil
        }
    }

    var queryItems: [URLQueryItem]? {
        switch self {
        case .ascents(let cursor):
            return cursor.map { [URLQueryItem(name: "cursor", value: $0)] }
        case .feed(let cursor):
            return cursor.map { [URLQueryItem(name: "cursor", value: $0)] }
        case .peaks(let query, let bbox):
            var items: [URLQueryItem] = []
            if let q = query { items.append(.init(name: "q", value: q)) }
            if let b = bbox   { items.append(.init(name: "bbox", value: b.queryValue)) }
            return items.isEmpty ? nil : items
        case .searchUsers(let query):
            return [URLQueryItem(name: "q", value: query)]
        default:
            return nil
        }
    }

    var requiresAuth: Bool {
        switch self {
        case .login, .register, .forgotPassword, .resetPassword, .validateVoucher, .config:
            return false
        default:
            return true
        }
    }

    // Multipart endpoints — handled separately in APIClient
    var isMultipart: Bool {
        switch self {
        case .uploadPhoto, .uploadAvatar: return true
        default: return false
        }
    }
}

// MARK: - Supporting types

struct BBoxQuery {
    let west, south, east, north: Double
    var queryValue: String { "\(west),\(south),\(east),\(north)" }
}

enum FriendAction: String, Codable {
    case accept
    case reject
}

struct CreateAscentBody: Encodable {
    let peakId: String
    let date: String       // "YYYY-MM-DD"
    let route: String?
    let description: String?
}

struct UpdateAscentBody: Encodable {
    let peakId: String?
    let date: String?
    let route: String?
    let description: String?
}

struct UpdateSettingsBody: Encodable {
    let name: String?
    let username: String?
    let language: String?
    let appearInSearch: Bool?
    let allowOthersToTag: Bool?
}

struct AddPersonBody: Encodable {
    let personId: String?
    let name: String?
}
