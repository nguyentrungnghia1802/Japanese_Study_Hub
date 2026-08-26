package com.japaneselearning.mobile.core.config

import com.japaneselearning.mobile.BuildConfig
import org.junit.Assert.assertEquals
import org.junit.Test

class ApiConfigurationTest {
    @Test
    fun apiBaseUrlMatchesTheBuildVariant() {
        val expected = when (BuildConfig.BUILD_TYPE) {
            "debug" -> "http://localhost:4000/api/v1"
            "production", "release" -> "http://157.173.127.217:4000/api/v1"
            else -> error("Unexpected Android build type: ${BuildConfig.BUILD_TYPE}")
        }

        assertEquals(expected, AppConfig.apiBaseUrl)
    }
}
