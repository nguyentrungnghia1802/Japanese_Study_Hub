package com.japaneselearning.mobile.data.remote

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface StudyApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("auth/logout")
    suspend fun logout(): SuccessResponse

    @GET("auth/me")
    suspend fun me(): AuthMeResponse

    @GET("flashcard-sets")
    suspend fun listFlashcardSets(
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("favorite") favorite: Boolean? = null,
        @Query("tag") tag: String? = null,
    ): FlashcardSetsResponse

    @GET("flashcard-sets/{setId}")
    suspend fun getFlashcardSet(@Path("setId") setId: String): FlashcardSetDto

    @GET("review/summary")
    suspend fun getFlashcardReviewSummary(): FlashcardReviewSummaryDto

    @GET("review/queue")
    suspend fun getFlashcardReviewQueue(@Query("limit") limit: Int = 20): FlashcardReviewQueueResponseDto

    @POST("review/{cardId}")
    suspend fun submitFlashcardReview(
        @Path("cardId") cardId: String,
        @Body request: SubmitFlashcardReviewRequest,
    ): FlashcardReviewResponseDto

    @PUT("flashcard-sets/{setId}/favorite")
    suspend fun setFlashcardFavorite(
        @Path("setId") setId: String,
        @Body request: FavoriteRequest,
    ): FlashcardSetDto

    @PUT("flashcard-sets/{setId}/tags")
    suspend fun setFlashcardTags(
        @Path("setId") setId: String,
        @Body request: SetTagsRequest,
    ): FlashcardSetDto

    @GET("tags")
    suspend fun listTags(@Query("limit") limit: Int = 100): List<TagDto>

    @GET("exam-folders")
    suspend fun listExamFolders(): List<ExamFolderDto>

    @GET("exams")
    suspend fun listExams(
        @Query("folderId") folderId: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("favorite") favorite: Boolean? = null,
        @Query("tag") tag: String? = null,
    ): ExamsResponse

    @GET("exams/{examId}")
    suspend fun getExam(@Path("examId") examId: String): ExamDto

    @PUT("exams/{examId}/favorite")
    suspend fun setExamFavorite(
        @Path("examId") examId: String,
        @Body request: FavoriteRequest,
    ): ExamDto

    @PUT("exams/{examId}/tags")
    suspend fun setExamTags(
        @Path("examId") examId: String,
        @Body request: SetTagsRequest,
    ): ExamDto

    @POST("exams/{examId}/attempts")
    suspend fun startAttempt(@Path("examId") examId: String): LiveAttemptDto

    @GET("attempts/{attemptId}")
    suspend fun getAttempt(@Path("attemptId") attemptId: String): LiveAttemptDto

    @PUT("attempts/{attemptId}/answers")
    suspend fun saveAnswers(
        @Path("attemptId") attemptId: String,
        @Body request: SaveAnswersRequest,
    ): SuccessResponse

    @POST("attempts/{attemptId}/submit")
    suspend fun submitAttempt(
        @Path("attemptId") attemptId: String,
        @Body request: SubmitAttemptRequest = SubmitAttemptRequest(),
    ): ExamResultDto

    @GET("exam-review/mistakes")
    suspend fun getWrongAnswerReviewQueue(@Query("limit") limit: Int = 20): WrongAnswerReviewQueueDto

    @DELETE("exam-review/mistakes/{mistakeId}")
    suspend fun dismissWrongAnswer(
        @Path("mistakeId") mistakeId: String,
    ): SuccessResponse

    @DELETE("exam-review/mistakes")
    suspend fun clearWrongAnswers(@Query("examId") examId: String? = null): ClearMistakesResponse

    @POST("exam-review/practice")
    suspend fun startMistakePractice(@Body request: StartMistakePracticeRequest): LiveAttemptDto

    @GET("search")
    suspend fun search(
        @Query("q") query: String,
        @Query("limit") limit: Int = 20,
    ): SearchResultsDto

    @GET("dashboard/summary")
    suspend fun dashboard(): DashboardDto
}
