package com.japaneselearning.mobile.core.network

import com.japaneselearning.mobile.core.storage.TokenStore
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor @Inject constructor(
    private val tokenStore: TokenStore,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { tokenStore.readToken() }
        val request = chain.request().newBuilder()
            .apply {
                if (!token.isNullOrBlank()) {
                    header("Authorization", "Bearer $token")
                }
            }
            .build()
        return chain.proceed(request)
    }
}

object NetworkTimeouts {
    val connect = 20L to TimeUnit.SECONDS
    val read = 30L to TimeUnit.SECONDS
    val write = 30L to TimeUnit.SECONDS
}
