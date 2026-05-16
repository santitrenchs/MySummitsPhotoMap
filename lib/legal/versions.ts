/**
 * Legal document version constants.
 *
 * How to update:
 *  1. Bump the constant below (e.g. "1.0" → "1.1")
 *  2. Copy content/legal/terms/v1.0.md → content/legal/terms/v1.1.md (keep old files for audit)
 *  3. Run: npx prisma db push && npx prisma generate
 *  4. Deploy — authenticated users will be redirected to /accept-terms on next page load.
 *
 * Never delete old version files. They serve as the legal audit trail.
 */
export const CURRENT_TERMS_VERSION   = "1.0";
export const CURRENT_PRIVACY_VERSION = "1.0";

export type DocumentType = "terms" | "privacy";
