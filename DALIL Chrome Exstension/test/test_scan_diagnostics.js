/* Contract tests for the "why did this view save nothing?" explanation. */
'use strict';
const assert = require('assert');
const Diagnostics = require('../core/scan-diagnostics');

const base = { items: 0, newCount: 0, dupCount: 0, outsideCount: 0, unlocatedCount: 0, discoveredElsewhere: 0, outcome: 'unknown' };

// A successful view is reported as such, not as a warning.
assert.strictEqual(Diagnostics.describeScan({ ...base, items: 4, newCount: 3, dupCount: 1 }).code, 'ITEMS_SAVED');

// Source returned nothing and proved it.
assert.strictEqual(Diagnostics.describeScan({ ...base, outcome: 'confirmed_empty' }).code, 'SOURCE_EMPTY');
assert.strictEqual(Diagnostics.describeScan({ ...base, outcome: 'unknown' }).code, 'SOURCE_UNKNOWN');

// Every card was outside the study area / every grid cell: actionable.
const outside = Diagnostics.describeScan({ ...base, items: 7, outsideCount: 7, outcome: 'complete' });
assert.strictEqual(outside.code, 'OUTSIDE_STUDY_AREA');
assert.strictEqual(outside.severity, 'error');
assert.ok(outside.messageAr.includes('خارج منطقة الدراسة'));
assert.strictEqual(outside.counts.items, 7);

// Cards without exact X/Y: a source/page condition, not a grid bug.
assert.strictEqual(Diagnostics.describeScan({ ...base, items: 5, unlocatedCount: 5 }).code, 'NO_GEOMETRY');
assert.strictEqual(Diagnostics.describeScan({ ...base, items: 3, unlocatedCount: 3, dupCount: 0 }).severity, 'error');

// Everything was already stored.
assert.strictEqual(Diagnostics.describeScan({ ...base, items: 6, dupCount: 6 }).code, 'ONLY_DUPLICATES');
assert.strictEqual(Diagnostics.describeScan({ ...base, items: 6, discoveredElsewhere: 6 }).code, 'ONLY_DUPLICATES');

// A viewport narrower than the cell explains missing places even when records were saved.
const partialView = Diagnostics.describeScan({ ...base, items: 9, newCount: 9, outcome: 'complete', coverage: false });
assert.strictEqual(partialView.code, 'VIEWPORT_SMALLER_THAN_CELL');
assert.strictEqual(partialView.severity, 'warn');
assert.ok(partialView.messageAr.includes('أصغر من الخلية'));
assert.strictEqual(partialView.coverage, false);
// A covered view keeps its normal verdict.
assert.strictEqual(Diagnostics.describeScan({ ...base, items: 9, newCount: 9, outcome: 'complete', coverage: true }).code, 'ITEMS_SAVED');

// "Zero" has two very different causes: a blank page is not an empty area.
const blankPage = Diagnostics.describeScan({ ...base, dom: { anyCards: 0, cards: 0, feed: false, visibility: 'hidden' } });
assert.strictEqual(blankPage.code, 'PAGE_NOT_RENDERED');
assert.strictEqual(blankPage.severity, 'error');
assert.ok(blankPage.messageAr.includes('لم ترسم أي بطاقة'));
assert.strictEqual(blankPage.page.anyCards, 0);
assert.strictEqual(blankPage.page.visibility, 'hidden');
// Cards on screen but nothing read: a page-reading defect, not an empty area.
const unread = Diagnostics.describeScan({ ...base, dom: { anyCards: 12, cards: 12, feed: true, visibility: 'visible' } });
assert.strictEqual(unread.code, 'CARDS_VISIBLE_BUT_UNREADABLE');
assert.strictEqual(unread.severity, 'error');
assert.strictEqual(unread.page.anyCards, 12);
// A confirmed empty result stays an empty result even with a rendered page.
assert.strictEqual(Diagnostics.describeScan({ ...base, outcome: 'confirmed_empty', dom: { anyCards: 0 } }).code, 'SOURCE_EMPTY');
// A saved view is never downgraded by the page snapshot.
assert.strictEqual(Diagnostics.describeScan({ ...base, items: 2, newCount: 2, dom: { anyCards: 0 } }).code, 'ITEMS_SAVED');

// No message is ever empty, in either language.
Object.values(Diagnostics.MESSAGES).forEach(message => {
  assert.ok(message.ar && message.en, 'every diagnosis needs Arabic and English text');
  assert.ok(['ok', 'info', 'warn', 'error'].includes(message.severity));
});

console.log('PASS scan diagnostics: covers saved, empty, outside, unlocated, duplicate, other-cell and camera-only outcomes');
