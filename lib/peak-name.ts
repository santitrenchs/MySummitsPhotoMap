// ─── Peak display name ───────────────────────────────────────────────────────
//
// Peaks imported from OSM keep their local-language `name` (e.g. 富士山, Эльбрус).
// When that name contains characters from a non-Western script and a Latin
// `nameEn` exists, we show the readable Latin name as the primary label and keep
// the original as a secondary subtitle.
//
// Detection is by SCRIPT presence, not "has a Latin letter": a mixed name like
// "俄宗巴岗 I (丹增峰)" contains a stray Latin "I" but is clearly non-Western, so it
// must still flip to nameEn. Western names (Pedraforca, Müller, Cervino, K2) have
// no non-Western script char → they keep their original `name`.

// Common non-Western scripts: CJK ideographs + kana, Hangul, Cyrillic, Greek,
// Arabic, Hebrew, Thai, Devanagari, Ethiopic, Georgian, Armenian.
const NON_WESTERN_SCRIPT =
  /[Ͱ-ϿЀ-ԯ԰-֏֐-׿؀-ۿऀ-ॿ฀-๿Ⴀ-ჿሀ-፿ᄀ-ᇿ぀-ヿ㐀-鿿가-힯豈-﫿]/;
const HAS_LATIN = /[A-Za-z]/;

type PeakNameInput = { name: string; nameEn?: string | null };

function shouldFlip(name: string, nameEn?: string | null): nameEn is string {
  return NON_WESTERN_SCRIPT.test(name) && !!nameEn && HAS_LATIN.test(nameEn);
}

/** The single label to show for a peak: the Latin nameEn when the name is non-Western. */
export function peakDisplayName({ name, nameEn }: PeakNameInput): string {
  return shouldFlip(name, nameEn) ? nameEn : name;
}

/**
 * { primary, original } for surfaces that show the original name as a secondary
 * subtitle. `original` is non-null only when we flipped to nameEn.
 */
export function peakDisplayParts({ name, nameEn }: PeakNameInput): { primary: string; original: string | null } {
  return shouldFlip(name, nameEn) ? { primary: nameEn, original: name } : { primary: name, original: null };
}
