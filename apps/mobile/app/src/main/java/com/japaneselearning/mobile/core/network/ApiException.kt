package com.japaneselearning.mobile.core.network

class ApiException(
    val statusCode: Int? = null,
    val code: String = "NETWORK_ERROR",
    override val message: String,
    val details: Map<String, String>? = null,
    val isUnauthorized: Boolean = statusCode == 401,
    cause: Throwable? = null,
) : Exception(message, cause)
