package com.japaneselearning.mobile.core.network

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

class ApiErrorMapperTest {
    @Test
    fun `maps structured unauthorized response and hides raw details`() {
        val response = Response.error<Any>(
            401,
            "{\"error\":{\"code\":\"AUTH_INVALID\",\"message\":\"Invalid credentials\"}}"
                .toResponseBody("application/json".toMediaType()),
        )
        val error = ApiErrorMapper.map(HttpException(response))
        assertEquals(401, error.statusCode)
        assertEquals("AUTH_INVALID", error.code)
        assertTrue(error.isUnauthorized)
        assertEquals("Invalid credentials", error.message)
    }
}
