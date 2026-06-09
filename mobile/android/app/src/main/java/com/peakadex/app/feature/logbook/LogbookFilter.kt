package com.peakadex.app.feature.logbook

import com.peakadex.app.core.model.Ascent
import java.time.LocalDate

enum class ViewFilter { All, Mine, Friends }
enum class TimeRange { All, Month, Year }
enum class SortOrder { DateDesc, ElevDesc }

data class LogbookFilterState(
    val search:      String      = "",
    // Default is Friends — matches web's Ascensiones default behaviour.
    // ViewFilter.Friends is treated as the baseline: it does NOT count as "dirty".
    val viewFilter:  ViewFilter  = ViewFilter.Friends,
    val rarityId:    String?     = null,
    val mythic:      Boolean     = false,
    val timeRange:   TimeRange   = TimeRange.All,
    val sort:        SortOrder   = SortOrder.DateDesc,
    // Set when navigating from Atlas — filters to a specific peak
    val peakId:      String?     = null,
    val peakName:    String?     = null,
) {
    val isDirty: Boolean
        // Friends is the default — only other views count as dirty
        get() = viewFilter != ViewFilter.Friends || rarityId != null || mythic || timeRange != TimeRange.All || sort != SortOrder.DateDesc || peakId != null || search.isNotBlank()
}

fun getRarityIdForAltitude(altitudeM: Int): String = when {
    altitudeM >= 8000 -> "snow_lotus"
    altitudeM >= 7000 -> "cinquefoil"
    altitudeM >= 6000 -> "saxifrage"
    altitudeM >= 5000 -> "draba"
    altitudeM >= 4000 -> "edelweiss"
    altitudeM >= 3000 -> "tundra"
    altitudeM >= 2000 -> "gentian"
    altitudeM >= 1000 -> "heather"
    else              -> "daisy"
}

fun applyFilters(ascents: List<Ascent>, filters: LogbookFilterState): List<Ascent> {
    var r = ascents

    // Peak filter from Atlas navigation — takes precedence over view filter
    if (filters.peakId != null) {
        return r.filter { it.peak.id == filters.peakId }
    }

    r = when (filters.viewFilter) {
        ViewFilter.Mine    -> r.filter { it.isOwn }
        ViewFilter.Friends -> r.filter { !it.isOwn }
        ViewFilter.All     -> r
    }

    if (filters.search.isNotBlank()) {
        val q = filters.search.trim().lowercase()
        r = r.filter { a ->
            a.peak.name.lowercase().contains(q) ||
            (a.route?.lowercase()?.contains(q) == true) ||
            a.persons.any { p -> p.name.lowercase().contains(q) }
        }
    }

    when {
        filters.mythic              -> r = r.filter { it.peak.isMythic == true }
        filters.rarityId != null    -> r = r.filter { getRarityIdForAltitude(it.peak.altitudeM) == filters.rarityId }
    }

    val today = LocalDate.now()
    when (filters.timeRange) {
        TimeRange.Month -> {
            val cutoff = today.minusDays(30)
            r = r.filter { a ->
                runCatching { LocalDate.parse(a.date.take(10)) }.getOrNull()?.isAfter(cutoff) == true
            }
        }
        TimeRange.Year -> {
            val yr = today.year
            r = r.filter { a ->
                runCatching { LocalDate.parse(a.date.take(10)) }.getOrNull()?.year == yr
            }
        }
        TimeRange.All -> {}
    }

    return when (filters.sort) {
        SortOrder.ElevDesc -> r.sortedByDescending { it.peak.altitudeM }
        // DateDesc: preserve the API's canonical order — the server already sorted correctly:
        // unseen friends first by altitude desc, then own + seen friends by date desc.
        SortOrder.DateDesc -> r
    }
}
