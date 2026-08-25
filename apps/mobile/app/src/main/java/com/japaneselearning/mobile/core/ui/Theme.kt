package com.japaneselearning.mobile.core.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Indigo = Color(0xFF4F46E5)
private val Vermilion = Color(0xFFE85D4A)
private val Ivory = Color(0xFFFFF8F0)
private val Ink = Color(0xFF171927)
private val Slate = Color(0xFF657083)

private val LightColors = lightColorScheme(
    primary = Indigo,
    onPrimary = Color.White,
    secondary = Vermilion,
    background = Ivory,
    surface = Color.White,
    onBackground = Ink,
    onSurface = Ink,
    onSurfaceVariant = Slate,
    error = Color(0xFFB3261E),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF9CA5FF),
    onPrimary = Color(0xFF1A1B46),
    secondary = Color(0xFFFF9B88),
    background = Color(0xFF10121D),
    surface = Color(0xFF191C29),
    onBackground = Color(0xFFF4F1EC),
    onSurface = Color(0xFFF4F1EC),
    onSurfaceVariant = Color(0xFFBFC4D0),
    error = Color(0xFFFFB4AB),
)

@Composable
fun JapaneseStudyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        typography = Typography(),
        content = content,
    )
}
