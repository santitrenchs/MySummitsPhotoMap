#!/usr/bin/env node
// Verifies that every key defined in lib/i18n/types.ts exists in all 5 locale files.
// Exits with code 1 if any keys are missing.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TYPES_FILE = path.join(ROOT, "lib/i18n/types.ts");
const LOCALES = ["es", "en", "ca", "fr", "de"];

// Extract all property keys from the Dict type definition in types.ts.
// Handles keys on any column position, e.g.:
//   key1: string; key2: string;
//   key3: string;
function extractTypeKeys(source) {
  const keys = new Set();
  // Match any `identifier:` that looks like a Dict property (not a type alias)
  const re = /\b([a-z][a-zA-Z0-9_]*)\s*:/g;
  // Only scan inside the Dict type body
  const dictMatch = source.match(/export type Dict = \{([\s\S]*?)\};/);
  if (!dictMatch) throw new Error("Could not find Dict type in types.ts");
  let match;
  while ((match = re.exec(dictMatch[1])) !== null) {
    keys.add(match[1]);
  }
  return Array.from(keys);
}

// Extract all property keys present in a locale object.
function extractLocaleKeys(source) {
  const keys = new Set();
  // Strip the outer `export const xx: Dict = { ... }` and scan inside
  const re = /\b([a-z][a-zA-Z0-9_]*)\s*:/g;
  const bodyMatch = source.match(/:\s*Dict\s*=\s*\{([\s\S]*)\};?\s*$/);
  if (!bodyMatch) throw new Error("Could not parse locale file");
  let match;
  while ((match = re.exec(bodyMatch[1])) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

const typesSource = fs.readFileSync(TYPES_FILE, "utf8");
const typeKeys = extractTypeKeys(typesSource);

let hasErrors = false;

for (const locale of LOCALES) {
  const localeFile = path.join(ROOT, `lib/i18n/${locale}.ts`);
  const localeSource = fs.readFileSync(localeFile, "utf8");
  const localeKeys = extractLocaleKeys(localeSource);

  const missing = typeKeys.filter((k) => !localeKeys.has(k));
  if (missing.length > 0) {
    console.error(`\n❌ ${locale}.ts — ${missing.length} missing key(s):`);
    missing.forEach((k) => console.error(`   - ${k}`));
    hasErrors = true;
  } else {
    console.log(`✅ ${locale}.ts — all ${typeKeys.length} keys present`);
  }
}

if (hasErrors) {
  console.error("\nFailed: add the missing keys to the locale files above.");
  process.exit(1);
} else {
  console.log("\nAll locales are complete.");
}
