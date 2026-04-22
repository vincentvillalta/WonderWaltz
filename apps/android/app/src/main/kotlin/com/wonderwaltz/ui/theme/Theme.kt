package com.wonderwaltz.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors =
    lightColorScheme(
        primary = Navy,
        onPrimary = White,
        secondary = Gold,
        onSecondary = Navy,
        tertiary = Gold,
        background = Cream,
        onBackground = Navy,
        surface = White,
        onSurface = Navy,
        surfaceVariant = Muted,
        onSurfaceVariant = MutedFg,
        error = Destructive,
        onError = White,
    )

private val DarkColors =
    darkColorScheme(
        primary = Gold,
        onPrimary = Navy,
        secondary = DarkAccent,
        onSecondary = Navy,
        tertiary = Gold,
        background = DarkBackground,
        onBackground = DarkForeground,
        surface = DarkCard,
        onSurface = DarkForeground,
        surfaceVariant = DarkMuted,
        onSurfaceVariant = DarkMutedFg,
        error = Destructive,
        onError = White,
    )

@Composable
fun WWTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colors,
        typography = WWTypography,
        content = content,
    )
}
