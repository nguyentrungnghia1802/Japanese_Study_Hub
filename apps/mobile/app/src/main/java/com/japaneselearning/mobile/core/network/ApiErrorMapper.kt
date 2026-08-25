package com.japaneselearning.mobile.core.network

import java.io.IOException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException

@Serializable
private data class ErrorEnvelope(val error: ErrorPayload? = null)

@Serializable
private data class ErrorPayload(
    val code: String? = null,
    val message: String? = null,
)

object ApiErrorMapper {
    private val json = Json { ignoreUnknownKeys = true }

    fun map(throwable: Throwable): ApiException {
        if (throwable is ApiException) return throwable

        if (throwable is HttpException) {
            val body = runCatching { throwable.response()?.errorBody()?.string() }.getOrNull()
            val payload = body?.let {
                runCatching { json.decodeFromString<ErrorEnvelope>(it).error }.getOrNull()
            }
            return ApiException(
                statusCode = throwable.code(),
                code = payload?.code ?: "HTTP_${throwable.code()}",
                message = payload?.message ?: defaultHttpMessage(throwable.code()),
                isUnauthorized = throwable.code() == 401,
                cause = throwable,
            )
        }

        if (throwable is IOException) {
            return ApiException(
                code = "NETWORK_UNAVAILABLE",
                message = "Không thể kết nối máy chủ. Hãy kiểm tra mạng và thử lại.",
                cause = throwable,
            )
        }

        return ApiException(
            code = "UNEXPECTED_ERROR",
            message = "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
            cause = throwable,
        )
    }

    private fun defaultHttpMessage(statusCode: Int): String = when (statusCode) {
        401 -> "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        403 -> "Bạn không có quyền thực hiện thao tác này."
        404 -> "Không tìm thấy dữ liệu yêu cầu."
        408, 429 -> "Máy chủ đang bận. Vui lòng thử lại sau."
        in 500..599 -> "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."
        else -> "Yêu cầu không thành công. Vui lòng thử lại."
    }
}
