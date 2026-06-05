package com.peakadex.app.core.ui

import android.content.Context
import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource

/** Bridges ViewModel error messages (no Context) with the UI layer (stringResource). */
sealed class UiText {
    /** A static string resource, resolved at render time. */
    data class StringRes(@StringRes val id: Int) : UiText()
    /** A dynamic string already built (e.g. includes an HTTP code). */
    data class Dynamic(val value: String) : UiText()

    @Composable fun asString(): String = when (this) {
        is StringRes -> stringResource(id)
        is Dynamic   -> value
    }

    fun asString(context: Context): String = when (this) {
        is StringRes -> context.getString(id)
        is Dynamic   -> value
    }
}
