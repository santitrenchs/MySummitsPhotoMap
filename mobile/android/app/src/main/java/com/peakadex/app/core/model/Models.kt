package com.peakadex.app.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// MARK: - User

@Serializable
data class User(
    val id: String,
    val name: String,
    val email: String,
    val username: String? = null,
    val avatarUrl: String? = null,
    val language: String? = null,
    val appearInSearch: Boolean? = null,
    val allowOthersToTag: Boolean? = null,
)

@Serializable
data class UserSummary(
    val id: String,
    val name: String,
    val username: String? = null,
    val avatarUrl: String? = null,
)

// MARK: - Peak

@Serializable
data class Peak(
    val id: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val altitudeM: Int,
    val mountainRange: String? = null,
    val country: String? = null,
    val rarityId: String? = null,
    val isMythic: Boolean? = null,
)

// MARK: - Ascent

@Serializable
data class Ascent(
    val id: String,
    val peakId: String,
    val peak: Peak,
    val createdBy: String,
    val user: UserSummary? = null,
    val isOwn: Boolean = false,
    val isUnseen: Boolean = false,
    val date: String,                   // "YYYY-MM-DD" — format in ViewModel
    val route: String? = null,
    val description: String? = null,
    val wikiloc: String? = null,
    val photos: List<Photo> = emptyList(),
    val persons: List<PersonSummary> = emptyList(),
    val createdAt: String,
)

// MARK: - Photo

@Serializable
data class Photo(
    val id: String,
    val url: String,
    val storageKey: String? = null,
    val originalStorageKey: String? = null,
    val cropAspect: String? = null,
    val ascentId: String = "",    // not always present in list selects
    val createdAt: String = "",   // not always present in list selects
)

// MARK: - Person

@Serializable
data class Person(
    val id: String,
    val name: String,
    val email: String? = null,
    val userId: String? = null,
    val avatarUrl: String? = null,
)

@Serializable
data class PersonSummary(
    val id: String,
    val name: String,
    val avatarUrl: String? = null,
)

// MARK: - Friendship

@Serializable
data class Friend(
    val id: String,
    val user: UserSummary,
    val status: FriendStatus,
    val createdAt: String,
)

@Serializable
enum class FriendStatus {
    @SerialName("PENDING")  PENDING,
    @SerialName("ACCEPTED") ACCEPTED,
}

// MARK: - Feed

@Serializable
data class FeedItem(
    val id: String,
    val ascent: Ascent,
    val seen: Boolean,
    val createdAt: String,
)

// MARK: - Home

@Serializable
data class HomeData(
    val stats: UserStats,
    val leaderboard: List<LeaderboardEntry>,
    val recentAscents: List<RecentAscentSummary>,
    val monthlyStats: List<MonthlyBar> = emptyList(),
    val friendsActivity: List<FriendActivityItem> = emptyList(),
    val userRank: Int = 0,
    val nextRankName: String? = null,
    val nextRankGap: Int = 0,
    val currentLevel: LevelInfo? = null,
    val nextLevel: LevelInfo? = null,
)

@Serializable
data class RarityBreakdown(
    val daisy:      Int = 0,
    val heather:    Int = 0,
    val gentian:    Int = 0,
    val tundra:     Int = 0,
    val edelweiss:  Int = 0,
    val draba:      Int = 0,
    val saxifrage:  Int = 0,
    val cinquefoil: Int = 0,
    @SerialName("snow_lotus") val snowLotus: Int = 0,
) {
    fun toList(): List<Int> = listOf(daisy, heather, gentian, tundra, edelweiss, draba, saxifrage, cinquefoil, snowLotus)
}

@Serializable
data class MonthlyBar(
    val isoMonth:       String,          // "YYYY-MM"
    val summits:        Int,
    val metersAscended: Int,
    val rarityBreakdown: RarityBreakdown = RarityBreakdown(),
)

@Serializable
data class UserStats(
    val totalAscents: Int,
    val uniquePeaks: Int = 0,
    val totalPhotos: Int,
    val totalRegions: Int,
    @SerialName("friendsCount") val totalFriends: Int,
    val peaks1000plus: Int,
    val peaks2000plus: Int,
    val peaks3000plus: Int,
    val peaks4000plus: Int,
    val peaks5000plus: Int,
    val peaks6500plus: Int = 0,
    val peaks8000plus: Int = 0,
    val maxAltitude: Int,
    val rarityBreakdown: RarityBreakdown = RarityBreakdown(),
)

@Serializable
data class LeaderboardEntry(
    @SerialName("userId") val id: String,
    val name: String,
    val avatarUrl: String? = null,
    @SerialName("ascentCount") val totalAscents: Int,
    val isCurrentUser: Boolean,
    val cairns: Int = 0,
    val ep: Int = 0,
    val levelIdx: Int = 1,
)

@Serializable
data class RecentAscentSummary(
    val id: String,
    val date: String,
    val peakName: String,
    val altitudeM: Int,
    val mountainRange: String? = null,
    val photoUrl: String? = null,
)

@Serializable
data class FriendActivityItem(
    val ascentId: String,
    val userName: String,
    val userAvatarUrl: String? = null,
    val peakName: String,
    val altitudeM: Int,
    val date: String,
    val photoUrl: String? = null,
)

@Serializable
data class LevelInfo(
    val index: Int,
    val name: String,
    val emoji: String,
    val minAscents: Int,
    val currentAscents: Int,
)

// MARK: - Config

@Serializable
data class AppConfig(
    val rarities: List<Rarity>,
)

@Serializable
data class Rarity(
    val id: String,
    val label: String,
    val color: String,
    val colorDark: String,
    val minAlt: Int = 0,
    val ep: Int = 0,
    val scoreWeight: Double = 0.5,
)

// MARK: - Auth responses

@Serializable
data class AuthResponse(
    val token: String,
    val user: User,
)

// MARK: - Paginated response (feed endpoint)

@Serializable
data class PaginatedResponse<T>(
    val items: List<T>,
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
)

// MARK: - Ascents list response ({ "ascents": [...] })

@Serializable
data class AscentsResponse(
    val ascents: List<Ascent>,
)

// MARK: - Single ascent response ({ "ascent": {...} })

@Serializable
data class AscentResponse(
    val ascent: Ascent,
)

// MARK: - Atlas / map models

// Response from GET /api/v1/map/ascents
@Serializable
data class MapAscent(
    val peakId: String,
    val ascentId: String,
    val photoUrl: String? = null,
    val date: String,
    val route: String? = null,
    val ascentCount: Int = 1,
    val faceCenterX: Double? = null,
    val faceCenterY: Double? = null,
    val peak: Peak,
)

@Serializable
data class MapAscentResponse(
    val ascents: List<MapAscent>,
)

// Response from GET /api/v1/peaks (viewport or search)
@Serializable
data class PeaksResponse(
    val peaks: List<Peak>,
)
