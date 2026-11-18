/* Shared Arabic text normalization for DALIL matching keys.
 * The same fold must be used when building an index and when querying it,
 * otherwise letter variants silently fail to match. Display text is never
 * normalized; only identity/search keys are.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DalilArabic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Tashkeel (harakat), Quranic marks, superscript alef and tatweel.
  const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
  const TATWEEL = /\u0640/g;
  // Directional marks, zero-width characters and the BOM are not letters.
  const INVISIBLE = /[\u061C\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  const ARABIC_FOLD = [
    [/[أإآٱ]/g, 'ا'], // hamza forms and alef wasla -> bare alef (إلمدرسة -> المدرسة)
    [/ة/g, 'ه'],     // taa marbuta -> haa
    [/ى/g, 'ي']      // alef maqsura -> yaa
  ];

  function normalize(value) {
    let text = String(value == null ? '' : value).normalize('NFKC');
    text = text.replace(INVISIBLE, '').replace(DIACRITICS, '').replace(TATWEEL, '');
    for (const [pattern, replacement] of ARABIC_FOLD) text = text.replace(pattern, replacement);
    // Strip Latin combining accents without changing Arabic letters.
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  // Fold for exact concept lookups. Same rules as normalize, kept as a named
  // export so call sites read intent rather than implementation.
  function fold(value) {
    return normalize(value);
  }

  function stripDiacritics(value) {
    return String(value == null ? '' : value).replace(DIACRITICS, '').replace(TATWEEL, '');
  }

  function equals(left, right) {
    const a = normalize(left), b = normalize(right);
    return !!a && a === b;
  }

  return { normalize, fold, stripDiacritics, equals, ARABIC_FOLD };
});
