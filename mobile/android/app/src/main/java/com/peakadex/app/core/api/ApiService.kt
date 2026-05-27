package com.peakadex.app.core.api

import com.peakadex.app.core.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.*

interface ApiService {

    // MARK: - Auth
    @POST("auth/login")
    suspend fun login(@Body body: Map<String, String>): AuthResponse

    @POST("auth/google")
    suspend fun loginWithGoogle(@Body body: Map<String, String>): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body body: Map<String, String?>): AuthResponse

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body body: Map<String, String>)

    @POST("auth/reset-password")
    suspend fun resetPassword(@Body body: Map<String, String>)

    @POST("auth/validate-voucher")
    suspend fun validateVoucher(@Body body: Map<String, String>): Map<String, Boolean>

    // MARK: - Config (public)
    @GET("config")
    suspend fun getConfig(): AppConfig

    // MARK: - User
    @GET("me")
    suspend fun getMe(): User

    @GET("settings")
    suspend fun getSettings(): SettingsResponse

    @PATCH("settings")
    suspend fun updateSettings(@Body body: UpdateSettingsRequest): SettingsResponse

    @POST("settings/password")
    suspend fun updatePassword(@Body body: UpdatePasswordRequest)

    @DELETE("settings/accounts/google")
    suspend fun unlinkGoogle()

    @Multipart
    @POST("settings/avatar")
    suspend fun uploadAvatar(
        @Part file: MultipartBody.Part,
    ): User

    // MARK: - Ascents
    @GET("ascents")
    suspend fun getAscents(): AscentsResponse

    @POST("ascents")
    suspend fun createAscent(@Body body: CreateAscentRequest): AscentResponse

    @GET("ascents/{id}")
    suspend fun getAscent(@Path("id") id: String): AscentResponse

    @PATCH("ascents/{id}")
    suspend fun updateAscent(
        @Path("id") id: String,
        @Body body: Map<String, String?>,
    ): Ascent

    @DELETE("ascents/{id}")
    suspend fun deleteAscent(@Path("id") id: String)

    @POST("ascents/{id}/share")
    suspend fun shareAscent(@Path("id") id: String): Map<String, @JvmSuppressWildcards Any?>

    // MARK: - Photos
    @Multipart
    @POST("photos/upload")
    suspend fun uploadPhoto(
        @Part file: MultipartBody.Part,
        @Part("ascentId") ascentId: RequestBody,
    ): PhotoResponse

    @DELETE("photos/{id}")
    suspend fun deletePhoto(@Path("id") id: String)

    @GET("photos/{id}/persons")
    suspend fun getPhotoPersons(@Path("id") photoId: String): List<PersonSummary>

    @POST("photos/{id}/persons")
    suspend fun addPhotoPerson(
        @Path("id") photoId: String,
        @Body body: Map<String, String?>,
    ): PersonSummary

    @DELETE("photos/{photoId}/persons/{personId}")
    suspend fun deletePhotoPerson(
        @Path("photoId") photoId: String,
        @Path("personId") personId: String,
    )

    // MARK: - Peaks
    @GET("peaks")
    suspend fun searchPeaks(
        @Query("q") query: String,
    ): PeaksResponse

    @GET("peaks")
    suspend fun getViewportPeaks(
        @Query("north") north: Double,
        @Query("south") south: Double,
        @Query("east") east: Double,
        @Query("west") west: Double,
    ): PeaksResponse

    @GET("peaks/{id}")
    suspend fun getPeak(@Path("id") id: String): Peak

    // MARK: - Atlas (map)
    @GET("map/ascents")
    suspend fun getMapAscents(): MapAscentResponse

    // MARK: - Home & Feed
    @GET("home")
    suspend fun getHome(): HomeData

    @GET("feed")
    suspend fun getFeed(
        @Query("cursor") cursor: String? = null,
    ): PaginatedResponse<FeedItem>

    @POST("feed/seen")
    suspend fun markFeedSeen(@Body body: Map<String, List<String>>)

    // MARK: - Social
    @GET("friends")
    suspend fun getFriends(): List<Friend>

    @POST("friends")
    suspend fun sendFriendRequest(@Body body: Map<String, String>): Friend

    @PATCH("friends/{id}")
    suspend fun updateFriend(
        @Path("id") id: String,
        @Body body: Map<String, String>,
    ): Friend

    @DELETE("friends/{id}")
    suspend fun deleteFriend(@Path("id") id: String)

    @GET("users/search")
    suspend fun searchUsers(@Query("q") query: String): List<UserSummary>

    @GET("persons")
    suspend fun getPersons(): List<Person>

    // MARK: - Profile
    @GET("profile")
    suspend fun getProfile(): ProfileData

    // MARK: - Invitations
    @GET("invitations")
    suspend fun getInvitations(): List<Map<String, String?>>

    @POST("invitations")
    suspend fun sendInvitation(@Body body: Map<String, String>): Map<String, String>
}
