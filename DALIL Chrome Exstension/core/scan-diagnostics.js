/* Explains, in user terms, why one search view produced the records it produced.
 * Pure: no DOM, no storage, no network. Used by the service worker and tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScanDiagnostics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MESSAGES = {
    ITEMS_SAVED: {
      severity: 'ok',
      ar: 'تم حفظ سجلات جديدة من هذا العرض.',
      en: 'New records were saved from this view.'
    },
    ONLY_DUPLICATES: {
      severity: 'warn',
      ar: 'كل ما ظهر في هذا العرض مسجّل مسبقًا (تكرار)، لذلك لم يُضف سجل جديد.',
      en: 'Everything this view returned was already stored, so no new record was added.'
    },
    OUTSIDE_STUDY_AREA: {
      severity: 'error',
      ar: 'المصدر أرجع أماكن، لكنها كلها خارج منطقة الدراسة أو خارج كل خلايا الشبكة. وسّع منطقة الدراسة أو أعد توليد الشبكة لتغطيها.',
      en: 'The source returned places, but all of them fall outside the study area or outside every grid cell. Widen the study area or regenerate the grid so it covers them.'
    },
    NO_GEOMETRY: {
      severity: 'error',
      ar: 'المصدر أرجع أماكن، لكن بلا إحداثيات دقيقة (X/Y)، فلم يمكن إسنادها لخلية. هذه حالة الصفحة/المصدر، وليست مشكلة في الشبكة.',
      en: 'The source returned places without exact X/Y coordinates, so they could not be assigned to a cell. This is a page/source condition, not a grid problem.'
    },
    SOURCE_EMPTY: {
      severity: 'ok',
      ar: 'المصدر أكّد أن هذه المنطقة بلا نتائج لهذا الاستعلام.',
      en: 'The source confirmed this area has no results for this query.'
    },
    SOURCE_UNKNOWN: {
      severity: 'warn',
      ar: 'لم تُقرأ أي بطاقات نتيجة، ولم يؤكد المصدر أنها خالية. غالبًا الصفحة لم تكتمل أو تغيّر تصميمها؛ أعد المحاولة أو شخّص الخلية.',
      en: 'No result cards were read, and the source did not confirm an empty result. The page likely did not finish loading or its markup changed; retry or diagnose the cell.'
    },
    VIEWPORT_SMALLER_THAN_CELL: {
      severity: 'warn',
      ar: 'عرض الخريطة كان أصغر من الخلية، فانتهت قائمة Google قبل أن تغطي الخلية كلها. الخلية تُسجَّل «جزئية» ولا تُعد مكتملة، وقد توجد معالم داخلها لم تُقرأ. صغّر حجم الخلية أو أعد المحاولة.',
      en: 'The map viewport was smaller than the cell, so Google’s list ended before the whole cell was covered. The cell is recorded as partial, not complete, and places inside it may remain unread. Use smaller cells or retry.'
    },
    PAGE_NOT_RENDERED: {
      severity: 'error',
      ar: 'الصفحة لم ترسم أي بطاقة نتيجة أصلًا — وليس لأن المنطقة خالية. أشهر سبب أن تبويب البحث كان في الخلفية أو لم يكتمل تحميله. أُعيد تحميل صفحة الخلية تلقائيًا مرة واحدة؛ إن تكرر ذلك فأبقِ نافذة المتصفح أمامك وأعد المحاولة.',
      en: 'The page rendered no result cards at all — and not because the area is empty. The usual cause is a background worker tab or an unfinished load. The cell page was reloaded automatically once; if it repeats, keep the browser window in front and retry.'
    },
    CARDS_VISIBLE_BUT_UNREADABLE: {
      severity: 'error',
      ar: 'بطاقات النتائج موجودة في الصفحة لكن لم تُقرأ أي بطاقة منها — خلل في قراءة الصفحة لا في المصدر. أعد المحاولة، وإن تكرر فأبلغنا لأن تصميم صفحة Google قد تغيّر.',
      en: 'Result cards exist in the page but none of them were read — a page-reading defect, not a source result. Retry; if it repeats the Google page markup has probably changed.'
    }
  };

  function pick(code) {
    return MESSAGES[code] || MESSAGES.SOURCE_UNKNOWN;
  }

  /**
   * @param {object} input
   * @param {number} input.items        cards returned by the source for this view
   * @param {number} input.newCount     records inserted
   * @param {number} input.dupCount     records merged into existing ones
   * @param {number} input.outsideCount records dropped as outside the study area / all cells
   * @param {number} input.unlocatedCount records without exact geometry
   * @param {number} input.discoveredElsewhere records owned by another cell
   * @param {string} input.outcome      complete | partial | capped | confirmed_empty | unknown
   * @param {boolean} [input.cameraAdvisory]
   * @param {boolean} [input.coverage] whether the map viewport contained the whole cell
   * @param {object} [input.dom] live page snapshot: feed/cards/anyCards/visibility/readyState
   */
  function describeScan(input) {
    const value = input || {};
    const items = Number(value.items) || 0;
    const newCount = Number(value.newCount) || 0;
    const dupCount = Number(value.dupCount) || 0;
    const outsideCount = Number(value.outsideCount) || 0;
    const unlocatedCount = Number(value.unlocatedCount) || 0;
    const discoveredElsewhere = Number(value.discoveredElsewhere) || 0;
    const inCellCount = Number(value.inCellCount) || 0;
    const dom = value.dom && typeof value.dom === 'object' ? value.dom : null;
    let code;
    // تغطية ناقصة تسبق أي تفسير آخر: هي سبب بنيوي لبقاء معالم داخل الخلية بلا قراءة.
    if (value.coverage === false) code = 'VIEWPORT_SMALLER_THAN_CELL';
    else if (newCount > 0) code = 'ITEMS_SAVED';
    else if (items === 0) {
      // «صفر» ليس حكمًا واحدًا: صفحة بلا بطاقات ليست منطقة خالية.
      if (value.outcome === 'confirmed_empty') code = 'SOURCE_EMPTY';
      else if (dom && dom.anyCards === 0) code = 'PAGE_NOT_RENDERED';
      else if (dom && dom.anyCards > 0) code = 'CARDS_VISIBLE_BUT_UNREADABLE';
      else code = 'SOURCE_UNKNOWN';
    }
    else if (unlocatedCount === items) code = 'NO_GEOMETRY';
    else if (outsideCount === items) code = 'OUTSIDE_STUDY_AREA';
    else if (dupCount === items || discoveredElsewhere > 0) code = 'ONLY_DUPLICATES';
    else code = 'SOURCE_UNKNOWN';
    const message = pick(code);
    return {
      code,
      severity: message.severity,
      messageAr: message.ar,
      messageEn: message.en,
      counts: { items, newCount, dupCount, outsideCount, unlocatedCount, discoveredElsewhere, inCellCount },
      outcome: value.outcome || 'unknown',
      coverage: typeof value.coverage === 'boolean' ? value.coverage : null,
      page: dom ? { cards: Number(dom.cards) || 0, anyCards: Number(dom.anyCards) || 0,
        feed: dom.feed === true, visibility: dom.visibility || 'unknown' } : null
    };
  }

  return { describeScan, MESSAGES };
});
