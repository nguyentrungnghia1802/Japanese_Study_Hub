package com.japaneselearning.mobile.core.ui

data class ScreenState<T>(
    val isLoading: Boolean = true,
    val data: T? = null,
    val error: String? = null,
)
