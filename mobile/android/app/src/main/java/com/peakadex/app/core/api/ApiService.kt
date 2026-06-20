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
    suspend fun register(@Body body: RegisterRequest): AuthResponse

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

    // Returns the raw updated record wrapped in { ascent }, which lacks the nested
    // peak/photos/persons — not deserializable into our rich Ascent model. We don't
    // need the body (the Cards list is refreshed separately), so ignore it.
    @PATCH("ascents/{id}")
    suspend fun updateAscent(
        @Path("id") id: String,
        @Body body: Map<String, String?>,
    )

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
        @Part("cropAspect") cropAspect: RequestBody? = null,
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

    // Removes a tagged user from a photo. The v1 route expects { userId } in the
    // request body (DELETE with body), not a path segment.
    @HTTP(method = "DELETE", path = "photos/{id}/persons", hasBody = true)
    suspend fun removePhotoPerson(
        @Path("id") photoId: String,
        @Body body: Map<String, String?>,
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
        @Query("zoom") zoom: Int,
    ): PeaksResponse

    @GET("peaks")
    suspend fun getNearbyPeaks(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radius") radius: Double,
    ): PeaksResponse

    @GET("peaks/{id}")
    suspend fun getPeak(@Path("id") id: String): PeakResponse

    @GET("peaks/{id}/elevation")
    suspend fun getPeakElevation(@Path("id") id: String): ElevationResponse

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
    suspend fun getFriendsData(): FriendsResponse

    @POST("friends")
    suspend fun sendFriendRequest(@Body body: Map<String, String>): Map<String, String>

    @PATCH("friends/{id}")
    suspend fun updateFriendship(
        @Path("id") id: String,
        @Body body: Map<String, String>,
    ): Map<String, String>

    @DELETE("friends/{id}")
    suspend fun deleteFriendship(@Path("id") id: String)

    @GET("users/search")
    suspend fun searchUsers(@Query("q") query: String): UsersSearchResponse

    @GET("users/{id}/stats")
    suspend fun getUserStats(@Path("id") id: String): UserStatsResponse

    @GET("persons")
    suspend fun getPersons(): PersonsResponse

    // MARK: - Cordadas
    @GET("cordadas")
    suspend fun getCordadas(): CordadasResponse

    @POST("cordadas")
    suspend fun createCordada(@Body body: CreateCordadaRequest): CreatedCordadaResponse

    @Multipart
    @POST("cordadas/{id}/avatar")
    suspend fun uploadCordadaAvatar(
        @Path("id") id: String,
        @Part file: MultipartBody.Part,
    )

    @GET("cordadas/{id}")
    suspend fun getCordadaDetail(@Path("id") id: String): CordadaDetailResponse

    @POST("cordadas/{id}/invite")
    suspend fun inviteToCordada(
        @Path("id") id: String,
        @Body body: Map<String, String>,
    )

    @PATCH("cordadas/{id}/respond")
    suspend fun respondToCordadaInvite(
        @Path("id") id: String,
        @Body body: Map<String, String>,
    )

    @DELETE("cordadas/{id}/members/{userId}")
    suspend fun removeCordadaMember(
        @Path("id") cordadaId: String,
        @Path("userId") userId: String,
    )

    @DELETE("cordadas/{id}")
    suspend fun deleteCordada(@Path("id") id: String)

    // MARK: - Profile
    @GET("profile")
    suspend fun getProfile(): ProfileData

    // MARK: - Invitations
    @GET("invitations")
    suspend fun getInvitations(): List<Map<String, String?>>

    @POST("invitations")
    suspend fun sendInvitation(@Body body: Map<String, String>): Map<String, String>

    @POST("invitations/resolve")
    suspend fun resolveInvitation(@Body body: Map<String, String>): Map<String, String>
}
