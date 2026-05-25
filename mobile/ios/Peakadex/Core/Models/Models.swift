import Foundation

// MARK: - User

struct User: Codable, Identifiable {
    let id: String
    let name: String
    let email: String
    let username: String?
    let avatarUrl: String?
    let language: String?
    let appearInSearch: Bool?
    let allowOthersToTag: Bool?
}

// MARK: - Peak

struct Peak: Codable, Identifiable {
    let id: String
    let name: String
    let latitude: Double
    let longitude: Double
    let altitudeM: Int
    let mountainRange: String?
    let country: String?
    let rarityId: String?
    let isMythic: Bool?
}

// MARK: - Ascent

struct Ascent: Codable, Identifiable {
    let id: String
    let peakId: String
    let peak: Peak
    let createdBy: String
    let user: UserSummary?
    let date: String           // "YYYY-MM-DD" — formatted in ViewModel, not here
    let route: String?
    let description: String?
    let wikiloc: String?
    let photos: [Photo]
    let persons: [PersonSummary]
    let createdAt: Date
}

// MARK: - Photo

struct Photo: Codable, Identifiable {
    let id: String
    let url: String
    let storageKey: String?
    let originalStorageKey: String?
    let cropAspect: String?
    let ascentId: String
    let createdAt: Date
}

// MARK: - Person

struct Person: Codable, Identifiable {
    let id: String
    let name: String
    let email: String?
    let userId: String?
    let avatarUrl: String?
}

struct PersonSummary: Codable, Identifiable {
    let id: String
    let name: String
    let avatarUrl: String?
}

// MARK: - Friend

struct Friend: Codable, Identifiable {
    let id: String            // friendship id
    let user: UserSummary     // the other user
    let status: FriendStatus
    let createdAt: Date
}

enum FriendStatus: String, Codable {
    case pending  = "PENDING"
    case accepted = "ACCEPTED"
}

// MARK: - UserSummary (lightweight user for lists/cards)

struct UserSummary: Codable, Identifiable {
    let id: String
    let name: String
    let username: String?
    let avatarUrl: String?
}

// MARK: - Feed

struct FeedItem: Codable, Identifiable {
    let id: String
    let ascent: Ascent
    let seen: Bool
    let createdAt: Date
}

// MARK: - Home

struct HomeData: Codable {
    let stats: UserStats
    let leaderboard: [LeaderboardEntry]
    let recentAscents: [Ascent]
    let friendActivity: [FeedItem]
    let nextLevel: LevelInfo?
    let currentLevel: LevelInfo?
}

struct UserStats: Codable {
    let totalAscents: Int
    let totalPhotos: Int
    let totalRegions: Int
    let totalFriends: Int
    let peaks1000plus: Int
    let peaks2000plus: Int
    let peaks3000plus: Int
    let peaks4000plus: Int
    let peaks5000plus: Int
    let maxAltitude: Int
}

struct LeaderboardEntry: Codable, Identifiable {
    let id: String             // user id
    let name: String
    let avatarUrl: String?
    let totalAscents: Int
    let diff: Int              // gap vs current user (positive = ahead, negative = behind)
    let isCurrentUser: Bool
}

struct LevelInfo: Codable {
    let index: Int
    let name: String
    let emoji: String
    let minAscents: Int
    let currentAscents: Int
}

// MARK: - Config

struct AppConfig: Codable {
    let levelDefs: [LevelDef]
    let rarities: [Rarity]
}

struct LevelDef: Codable, Identifiable {
    let id: Int
    let name: String
    let emoji: String
    let minAscents: Int
}

struct Rarity: Codable, Identifiable {
    let id: String
    let label: String
    let color: String
    let colorDark: String
}
