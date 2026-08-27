package com.japaneselearning.mobile.core.storage

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf

interface TokenStore {
    val token: Flow<String?>

    suspend fun readToken(): String?

    suspend fun saveSession(token: String, username: String)

    suspend fun readUsername(): String?

    suspend fun clear()
}

interface AttemptStore {
    val activeAttempts: Flow<Set<String>>
        get() = flowOf(emptySet())

    suspend fun readActiveAttempt(examId: String): String?

    suspend fun saveActiveAttempt(examId: String, attemptId: String)

    suspend fun clearActiveAttempt(examId: String)
}
