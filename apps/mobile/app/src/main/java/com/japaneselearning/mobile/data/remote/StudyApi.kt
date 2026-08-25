package com.japaneselearning.mobile.data.remote

import retrofit2.http.Body
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
    ): FlashcardSetsResponse

    @GET("flashcard-sets/{setId}")
    suspend fun getFlashcardSet(@Path("setId") setId: String): FlashcardSetDto

    @GET("exam-folders")
    suspend fun listExamFolders(): List<ExamFolderDto>

    @GET("exams")
    suspend fun listExams(
        @Query("folderId") folderId: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): ExamsResponse

    @GET("exams/{examId}")
    suspend fun getExam(@Path("examId") examId: String): ExamDto

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

    @GET("search")
    suspend fun search(
        @Query("q") query: String,
        @Query("limit") limit: Int = 20,
    ): SearchResultsDto

    @GET("dashboard/summary")
    suspend fun dashboard(): DashboardDto
}
