package com.japaneselearning.mobile.core.config

import com.japaneselearning.mobile.BuildConfig

object AppConfig {
    val apiBaseUrl: String = BuildConfig.API_BASE_URL.trimEnd('/')
}
