package com.peakadex.app.core.util

// ─── Peak display name ───────────────────────────────────────────────────────
//
// Mirror of web `lib/peak-name.ts`. Peaks imported from OSM keep their
// local-language `name` (e.g. 富士山, Эльбрус). When that name contains a
// non-Western script and a Latin `nameEn` exists, we show the Latin name.
//
// Detection is by SCRIPT presence, not "has a Latin letter": a mixed name like
// "俄宗巴岗 I (丹增峰)" has a stray Latin "I" but is clearly non-Western, so it must
// still flip. Western names (Pedraforca, Müller, Cervino, K2) keep their `name`.

// CJK ideographs + kana, Hangul, Cyrillic, Greek, Arabic, Hebrew, Thai,
// Devanagari, Ethiopic, Georgian, Armenian.
private val NON_WESTERN_SCRIPT = Regex(
    "[" +
        "Ͱ-Ͽ" +   // Greek
        "Ѐ-ԯ" +   // Cyrillic (+ supplement)
        "԰-֏" +   // Armenian
        "֐-׿" +   // Hebrew
        "؀-ۿ" +   // Arabic
        "ऀ-ॿ" +   // Devanagari
        "฀-๿" +   // Thai
        "Ⴀ-ჿ" +   // Georgian
        "ሀ-፿" +   // Ethiopic
        "ᄀ-ᇿ" +   // Hangul Jamo
        "぀-ヿ" +   // Hiragana + Katakana
        "㐀-鿿" +   // CJK Ext A + CJK Unified
        "가-힯" +   // Hangul Syllables
        "豈-﫿" +   // CJK Compatibility Ideographs
        "]"
)
private val HAS_LATIN = Regex("[A-Za-z]")

/** The single label to show for a peak: the Latin nameEn when the name is non-Western. */
fun peakDisplayName(name: String, nameEn: String?): String =
    if (NON_WESTERN_SCRIPT.containsMatchIn(name) && !nameEn.isNullOrBlank() && HAS_LATIN.containsMatchIn(nameEn))
        nameEn
    else
        name

/**
 * The original local-language name, for surfaces that show it as a secondary
 * subtitle under [peakDisplayName]. Null when we did not flip — i.e. when the
 * displayed label already IS the original, so repeating it would be noise.
 */
fun peakOriginalName(name: String, nameEn: String?): String? =
    if (peakDisplayName(name, nameEn) != name) name else null
