package com.peakadex.app.core.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

/** Two connected rope nodes — shared between Cordada and Cards empty states. */
internal val RopeTeamIcon: ImageVector by lazy {
    ImageVector.Builder("RopeTeam", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = SolidColor(Color(0xFF374151)),
            strokeLineWidth = 2f,
            strokeLineCap   = StrokeCap.Round,
            strokeLineJoin  = StrokeJoin.Round,
        ) {
            moveTo(8.5f, 8f)
            curveTo(8.5f, 9.66f, 7.16f, 11f, 5.5f, 11f)
            curveTo(3.84f, 11f, 2.5f, 9.66f, 2.5f, 8f)
            curveTo(2.5f, 6.34f, 3.84f, 5f, 5.5f, 5f)
            curveTo(7.16f, 5f, 8.5f, 6.34f, 8.5f, 8f)
            close()
            moveTo(21.5f, 16f)
            curveTo(21.5f, 17.66f, 20.16f, 19f, 18.5f, 19f)
            curveTo(16.84f, 19f, 15.5f, 17.66f, 15.5f, 16f)
            curveTo(15.5f, 14.34f, 16.84f, 13f, 18.5f, 13f)
            curveTo(20.16f, 13f, 21.5f, 14.34f, 21.5f, 16f)
            close()
            moveTo(8.35f, 9.7f)
            curveTo(11.2f, 10.7f, 13.45f, 12.1f, 15.65f, 14.25f)
            moveTo(8f, 13.8f)
            curveTo(10.95f, 12.65f, 13.35f, 11.6f, 16.2f, 10.2f)
        }
    }.build()
}
