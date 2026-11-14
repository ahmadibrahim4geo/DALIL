/**
 * DALIL - Smart Brands & Categorized Knowledge Engine
 * محرك ذكي شامل للمفردات والعلامات التجارية والقطاعات الحيوية،
 * يدعم الترجمة التلقائية وتوسيع كلمات البحث ثنائياً (عربي + إنجليزي).
 */

const SMART_CATEGORIES = [
  {
    id: "telecom",
    name: "📱 الاتصالات والشبكات",
    brands: [
      { ar: "فودافون", en: "Vodafone, Vodafone Store", aliases: ["فودافون", "فوادفون", "vodafone"] },
      { ar: "اتصالات", en: "Etisalat, e&", aliases: ["اتصالات", "etisalat", "e&"] },
      { ar: "وي", en: "WE, Telecom Egypt", aliases: ["وي", "المصرية للاتصالات", "we", "telecom egypt"] },
      { ar: "أورانج", en: "Orange, Orange Egypt", aliases: ["اورانج", "أورانج", "orange"] },
      { ar: "إس تي سي", en: "stc, Saudi Telecom", aliases: ["اس تي سي", "الاتصالات السعودية", "stc"] },
      { ar: "زين", en: "Zain", aliases: ["زين", "zain"] },
      { ar: "موبايلي", en: "Mobily", aliases: ["موبايلي", "mobily"] },
      { ar: "أوريدو", en: "Ooredoo", aliases: ["اوريدو", "ooredoo"] },
      { ar: "دو", en: "du, Emirates Integrated", aliases: ["دو", "du"] },
      { ar: "أبل ستور", en: "Apple Store, Apple Authorized", aliases: ["ابل", "أبل", "apple"] },
      { ar: "سامسونج", en: "Samsung Store, Samsung Service", aliases: ["سامسونج", "samsung"] }
    ]
  },
  {
    id: "banking",
    name: "🏦 البنوك والخدمات المالية",
    brands: [
      { ar: "البنك الأهلي المصري", en: "National Bank of Egypt, NBE", aliases: ["الأهلي", "البنك الاهلي", "nbe"] },
      { ar: "بنك مصر", en: "Banque Misr", aliases: ["بنك مصر", "banque misr"] },
      { ar: "البنك التجاري الدولي", en: "Commercial International Bank, CIB", aliases: ["cib", "التجاري الدولي"] },
      { ar: "بنك القاهرة", en: "Banque du Caire", aliases: ["بنك القاهرة", "bdc"] },
      { ar: "بنك قطر الوطني", en: "QNB Alahli, QNB", aliases: ["qnb", "قطر الوطني"] },
      { ar: "بنك الراجحي", en: "Al Rajhi Bank", aliases: ["الراجحي", "al rajhi"] },
      { ar: "بنك الرياض", en: "Riyad Bank", aliases: ["بنك الرياض", "riyad bank"] },
      { ar: "البنك الأهلي السعودي", en: "Saudi National Bank, SNB", aliases: ["snb", "الاهلي السعودي"] },
      { ar: "مصرف الإنماء", en: "Alinma Bank", aliases: ["الانماء", "مصرف الإنماء"] },
      { ar: "بنك أبوظبي الأول", en: "First Abu Dhabi Bank, FAB", aliases: ["fab", "ابوظبي الاول"] },
      { ar: "فوري بلس", en: "Fawry Plus, Fawry", aliases: ["فوري", "فوري بلس", "fawry"] },
      { ar: "أمان", en: "Aman Store, Aman", aliases: ["امان", "أمان", "aman"] },
      { ar: "ويسترن يونيون", en: "Western Union", aliases: ["ويسترن يونيون", "western union", "ibag"] }
    ]
  },
  {
    id: "health",
    name: "🏥 الصحة والصيدليات والمستشفيات",
    brands: [
      { ar: "صيدليات العزبي", en: "El Ezaby Pharmacy", aliases: ["العزبي", "صيدلية العزبي", "elezaby"] },
      { ar: "صيدليات النهدي", en: "Nahdi Pharmacy", aliases: ["النهدي", "صيدلية النهدي", "nahdi"] },
      { ar: "صيدليات الدواء", en: "Al Dawaa Pharmacy", aliases: ["الدواء", "صيدلية الدواء", "al dawaa"] },
      { ar: "صيدليات سيف", en: "Seif Pharmacy", aliases: ["سيف", "صيدلية سيف", "seif"] },
      { ar: "صيدليات 19011", en: "19011 Pharmacy", aliases: ["19011"] },
      { ar: "مستشفى السعودي الألماني", en: "Saudi German Hospital, SGH", aliases: ["السعودي الالماني", "sgh"] },
      { ar: "مستشفى الدكتور سليمان الحبيب", en: "Dr. Sulaiman Al Habib Hospital", aliases: ["الحبيب", "سليمان الحبيب"] },
      { ar: "مستشفى دار الفؤاد", en: "Dar Al Fouad Hospital", aliases: ["دار الفؤاد"] },
      { ar: "مستشفيات كليوباترا", en: "Cleopatra Hospital", aliases: ["كليوباترا"] },
      { ar: "معامل البرج", en: "Al Borg Laboratories", aliases: ["البرج", "معمل البرج"] },
      { ar: "معامل المختبر", en: "Al Mokhtabar Laboratories", aliases: ["المختبر", "معمل المختبر"] }
    ]
  },
  {
    id: "retail",
    name: "🛒 السوبرماركت والمولات",
    brands: [
      { ar: "كارفور", en: "Carrefour, Carrefour Hypermarket", aliases: ["كارفور", "carrefour"] },
      { ar: "لولو هايبرماركت", en: "Lulu Hypermarket", aliases: ["لولو", "lulu"] },
      { ar: "هايبر وان", en: "Hyper One", aliases: ["هايبر وان", "hyper one"] },
      { ar: "بنده", en: "Panda, Hyper Panda", aliases: ["بنده", "هايبر بنده", "panda"] },
      { ar: "أسواق العثيم", en: "Othaim Markets", aliases: ["العثيم", "othaim"] },
      { ar: "فتح الله جملة ماركت", en: "Fathalla Gomla Market", aliases: ["فتح الله", "fathalla"] },
      { ar: "سبينيس", en: "Spinneys", aliases: ["سبينيس", "spinneys"] },
      { ar: "كازيون", en: "Kazyon", aliases: ["كازيون", "kazyon"] },
      { ar: "خير زمان", en: "Kheir Zaman", aliases: ["خير زمان"] },
      { ar: "سعودي ماركت", en: "Seoudi Supermarket", aliases: ["سعودي ماركت", "seoudi"] }
    ]
  },
  {
    id: "food",
    name: "☕ المطاعم والمقاهي",
    brands: [
      { ar: "ماكدونالدز", en: "McDonald's", aliases: ["ماكدونالدز", "ماك", "mcdonalds"] },
      { ar: "كنتاكي", en: "KFC", aliases: ["كنتاكي", "kfc"] },
      { ar: "البيك", en: "Al Baik", aliases: ["البيك", "albaik"] },
      { ar: "برجر كنج", en: "Burger King", aliases: ["برجر كنج", "burger king"] },
      { ar: "بيتزا هت", en: "Pizza Hut", aliases: ["بيتزا هت", "pizza hut"] },
      { ar: "ستارباكس", en: "Starbucks, Starbucks Coffee", aliases: ["ستارباكس", "starbucks"] },
      { ar: "كوستا كوفي", en: "Costa Coffee", aliases: ["كوستا", "costa"] },
      { ar: "دانكن", en: "Dunkin', Dunkin' Donuts", aliases: ["دانكن", "dunkin"] },
      { ar: "بارنز", en: "Barn's Coffee", aliases: ["بارنز", "barns"] },
      { ar: "كشري أبو طارق", en: "Koshary Abou Tarek", aliases: ["ابو طارق", "كشري ابو طارق"] },
      { ar: "كشري التحرير", en: "Koshary El Tahrir", aliases: ["كشري التحرير"] }
    ]
  },
  {
    id: "fuel",
    name: "⛽ محطات الوقود والسيارات",
    brands: [
      { ar: "شل", en: "Shell, Shell Station", aliases: ["شل", "shell"] },
      { ar: "تشيل أوت", en: "ChillOut, ChillOut Station", aliases: ["تشيل اوت", "chillout"] },
      { ar: "وطنية للبترول", en: "Wataniya Petroleum", aliases: ["وطنية", "وطنيه"] },
      { ar: "موبيل", en: "Mobil, ExxonMobil", aliases: ["موبيل", "mobil"] },
      { ar: "توتال إنرجيز", en: "TotalEnergies, Total Station", aliases: ["توتال", "total"] },
      { ar: "أرامكو", en: "Aramco Station", aliases: ["ارامكو", "أرامكو", "aramco"] },
      { ar: "أدنوك", en: "ADNOC Distribution", aliases: ["ادنوك", "أدنوك", "adnoc"] },
      { ar: "ساسكو", en: "SASCO Station", aliases: ["ساسكو", "sasco"] },
      { ar: "مصر للبترول", en: "Misr Petroleum", aliases: ["مصر للبترول"] },
      { ar: "بترومين", en: "Petromin Express", aliases: ["بترومين", "petromin"] }
    ]
  }
];

// مفاهيم ومصطلحات عامة وترجمتها التلقائية
const GENERAL_CONCEPTS = [
  { ar: "صيدلية", en: "Pharmacy", aliases: ["صيدليات", "صيدليه", "pharmacy", "drugstore"] },
  { ar: "مستشفى", en: "Hospital", aliases: ["مستشفيات", "مستشفي", "hospital"] },
  { ar: "عيادة", en: "Clinic", aliases: ["عيادات", "clinic"] },
  { ar: "بنك", en: "Bank", aliases: ["بنوك", "مصرف", "bank"] },
  { ar: "صراف آلي", en: "ATM", aliases: ["ماكينة صراف آلي", "atm"] },
  { ar: "سوبرماركت", en: "Supermarket", aliases: ["سوبر ماركت", "supermarket"] },
  { ar: "بقالة", en: "Grocery store", aliases: ["بقالات", "grocery"] },
  { ar: "هايبرماركت", en: "Hypermarket", aliases: ["هايبر ماركت", "hypermarket"] },
  { ar: "مطعم", en: "Restaurant", aliases: ["مطاعم", "restaurant"] },
  { ar: "مطعم وجبات سريعة", en: "Fast food restaurant", aliases: ["وجبات سريعة", "fast food"] },
  { ar: "مقهى", en: "Cafe", aliases: ["كافيه", "كافيهات", "cafe"] },
  { ar: "محل قهوة", en: "Coffee shop", aliases: ["coffee shop"] },
  { ar: "محطة بنزين", en: "Gas station", aliases: ["محطة وقود", "بنزينة", "gas station", "petrol station"] },
  { ar: "مدرسة", en: "School", aliases: ["مدارس", "school"] },
  { ar: "حضانة", en: "Nursery", aliases: ["حضانات", "nursery"] },
  { ar: "جامعة", en: "University", aliases: ["جامعات", "university"] },
  { ar: "كلية", en: "College", aliases: ["كليات", "college"] },
  { ar: "فندق", en: "Hotel", aliases: ["فنادق", "hotel"] },
  { ar: "منتجع", en: "Resort", aliases: ["منتجعات", "resort"] },
  { ar: "محل ملابس", en: "Clothing store, Fashion", aliases: ["ملابس", "ازياء", "clothing store"] }
];

/**
 * البحث الذكي الفائق عن العلامة أو المفهوم
 */
const SMART_CATEGORY_LABELS = {
  telecom: { ar: 'الاتصالات والشبكات', en: 'Telecommunications & Networks' },
  banking: { ar: 'البنوك والخدمات المالية', en: 'Banks & Financial Services' },
  health: { ar: 'الصحة والصيدليات والمستشفيات', en: 'Health, Pharmacies & Hospitals' },
  retail: { ar: 'السوبرماركت والمولات', en: 'Supermarkets & Shopping Malls' },
  food: { ar: 'المطاعم والمقاهي', en: 'Restaurants & Cafes' },
  fuel: { ar: 'محطات الوقود والسيارات', en: 'Fuel Stations & Automotive' }
};
SMART_CATEGORIES.forEach(category => { category.labels = SMART_CATEGORY_LABELS[category.id]; });

function findSmartBrandMatch(query, locale = 'ar') {
  if (!query) return null;
  const fold = value => String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا')
    .replace(/[^\p{L}\p{N}&]+/gu, ' ').trim().replace(/\s+/g, ' ');
  const cleanQ = fold(query);
  if (!cleanQ) return null;
  // Short brand aliases (WE, du, stc) must be whole queries. Longer aliases can
  // match whole terms in a phrase; partial words never establish brand identity.
  const matches = value => {
    const terms = String(value || '').split(/[,،]/).map(fold).filter(Boolean);
    return terms.some(term => term === cleanQ || (term.length > 3 && (' ' + cleanQ + ' ').includes(' ' + term + ' ')));
  };
  const language = String(locale).startsWith('en') ? 'en' : 'ar';

  // 1. البحث في العلامات التجارية المصنفة
  for (const cat of SMART_CATEGORIES) {
    for (const b of cat.brands) {
      if (
        matches(b.ar) || matches(b.en) || (b.aliases && b.aliases.some(matches))
      ) {
        return {
          category: cat.labels[language],
          categoryId: cat.id,
          ar: b.ar,
          en: b.en
        };
      }
    }
  }

  // Prefer canonical type aliases so Bank and ATM, Hospital and Clinic, and
  // School and Nursery do not become interchangeable categories.
  const taxonomy = typeof TaxonomyEngine !== 'undefined' ? TaxonomyEngine : null;
  const canonical = taxonomy?.resolveConcept?.(query);
  if (canonical) return {
    category: language === 'en' ? 'General concept' : 'مفهوم عام',
    categoryId: canonical.canonicalId, canonicalId: canonical.canonicalId,
    ar: canonical.labels.ar || '', en: canonical.labels.en || ''
  };

  // 2. Legacy concepts remain suggestions for backward compatibility.
  for (const c of GENERAL_CONCEPTS) {
    if (
      matches(c.ar) || matches(c.en) || (c.aliases && c.aliases.some(matches))
    ) {
      return {
        category: language === 'en' ? 'General concept' : 'مفهوم عام',
        categoryId: "general",
        ar: c.ar,
        en: c.en
      };
    }
  }

  return null;
}

if (typeof window !== "undefined") {
  window.SMART_CATEGORIES = SMART_CATEGORIES;
  window.GENERAL_CONCEPTS = GENERAL_CONCEPTS;
  window.findSmartBrandMatch = findSmartBrandMatch;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SMART_CATEGORIES, GENERAL_CONCEPTS, findSmartBrandMatch, SMART_CATEGORY_LABELS };
}
