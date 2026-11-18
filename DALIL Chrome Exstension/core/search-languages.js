/* Search locales and terms are independent from UI locales and provider data names.
 * Basic terms: extracted iD tagging-schema translations, ISC (see docs/TAXONOMY_OSM_LICENSE.md).
 * They are local search suggestions, never official Google category translations.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SearchLanguages = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SOURCES = Object.freeze({
    bcp47: 'https://www.rfc-editor.org/rfc/rfc5646',
    google: 'https://developers.google.com/maps/documentation/javascript/localization#SupportedLanguages',
    osm: 'https://wiki.openstreetmap.org/wiki/Names#Localization',
    translations: 'https://github.com/openstreetmap/id-tagging-schema'
  });
  // Provider-documentation snapshot reviewed 2026-11-14, page updated 2026-11-09.
  // This is a Maps Platform catalogue, not a claim about Google Maps DOM hl.
  const GOOGLE_PROVIDER_CODES = 'af sq am ar hy az eu be bn bs bg my ca zh zh-CN zh-HK zh-TW hr cs da nl en en-AU en-GB et fa fi fil fr fr-CA gl ka de el gu iw hi hu is id it ja kn kk km ko ky lo lv lt mk ms ml mr mn ne no pl pt pt-BR pt-PT pa ro ru sr sr-Latn si sk sl es es-419 sw sv ta te th tr uk ur uz vi zu'.split(' ');
  const GRANDFATHERED = {
    'art-lojban':'jbo','en-gb-oed':'en-GB-oxendict','i-ami':'ami','i-bnn':'bnn','i-hak':'hak',
    'i-klingon':'tlh','i-lux':'lb','i-navajo':'nv','i-pwn':'pwn','i-tao':'tao','i-tay':'tay','i-tsu':'tsu',
    'no-bok':'nb','no-nyn':'nn','sgn-be-fr':'sfb','sgn-be-nl':'vgt','sgn-ch-de':'sgg',
    'zh-guoyu':'cmn','zh-hakka':'hak','zh-min-nan':'nan','zh-xiang':'hsn',
    'i-default':'i-default','i-enochian':'i-enochian','i-mingo':'i-mingo','zh-min':'zh-min','cel-gaulish':'cel-gaulish'
  };
  const invalidLocale = value => Object.assign(new RangeError('Invalid BCP 47 language tag: ' + String(value)), { code: 'INVALID_LOCALE' });
  function parseSyntax(tag) {
    const parts = tag.split('-');
    if (parts.some(p => !/^[a-z0-9]{1,8}$/i.test(p))) return null;
    if (/^x$/i.test(parts[0])) return parts.length > 1 ? { language: 'und', script: null, region: null, privateOnly: true } : null;
    const language = parts[0];
    if (!/^[a-z]{2,8}$/i.test(language)) return null;
    let i = 1, script = null, region = null;
    if (language.length <= 3) for (let n = 0; n < 3 && /^[a-z]{3}$/i.test(parts[i] || ''); n++) i++;
    if (/^[a-z]{4}$/i.test(parts[i] || '')) script = parts[i++];
    if (/^(?:[a-z]{2}|\d{3})$/i.test(parts[i] || '')) region = parts[i++];
    const variants = new Set();
    while (/^(?:[a-z0-9]{5,8}|\d[a-z0-9]{3})$/i.test(parts[i] || '')) {
      const v = parts[i++].toLowerCase(); if (variants.has(v)) return null; variants.add(v);
    }
    const singletons = new Set();
    while (/^[0-9a-wy-z]$/i.test(parts[i] || '')) {
      const s = parts[i++].toLowerCase(); if (singletons.has(s)) return null; singletons.add(s);
      const start = i; while (/^[a-z0-9]{2,8}$/i.test(parts[i] || '')) i++;
      if (start === i) return null;
    }
    if (/^x$/i.test(parts[i] || '')) { i++; const start = i; while (/^[a-z0-9]{1,8}$/i.test(parts[i] || '')) i++; if (start === i) return null; }
    return i === parts.length ? { language: language.toLowerCase(), script: script ? script[0].toUpperCase() + script.slice(1).toLowerCase() : null, region: region?.toUpperCase() || null, privateOnly: false } : null;
  }
  function normalizeLocale(value = 'ar') {
    if (typeof value !== 'string' || !value.trim() || value.length > 255) throw invalidLocale(value);
    let tag = value.trim();
    const grandfathered = GRANDFATHERED[tag.toLowerCase()];
    if (grandfathered) {
      if (grandfathered.toLowerCase() === tag.toLowerCase()) return grandfathered;
      tag = grandfathered;
    }
    const parsed = parseSyntax(tag); if (!parsed) throw invalidLocale(value);
    try { return Intl.getCanonicalLocales(tag)[0]; } catch (_) {
      // Intl implements Unicode locale identifiers, a subset of BCP 47. Preserve
      // well-formed extlang/private-use tags without inventing registry membership.
      const parts = tag.toLowerCase().split('-');
      if (parsed.privateOnly) return parts.join('-');
      if (parsed.script) { const index = parts.indexOf(parsed.script.toLowerCase()); parts[index] = parsed.script; }
      if (parsed.region) { const index = parts.indexOf(parsed.region.toLowerCase()); parts[index] = parsed.region; }
      return parts.join('-');
    }
  }
  function localeInfo(value = 'ar') {
    const locale = normalizeLocale(value), parsed = parseSyntax(locale);
    if (!parsed) return { locale, language: locale.split('-')[0], script: null, region: null, baseName: locale };
    let baseName = locale;
    try { baseName = new Intl.Locale(locale).baseName; } catch (_) {}
    return { locale, ...parsed, baseName };
  }
  function lookupChain(value) {
    const info = localeInfo(value), chain = [info.locale];
    if (info.privateOnly) return chain;
    if (GRANDFATHERED[info.locale.toLowerCase()] === info.locale.toLowerCase()) return chain;
    let script = info.script;
    if (info.language === 'zh' && !script && info.region) {
      if (['TW','HK','MO'].includes(info.region)) script = 'Hant';
      else if (['CN','SG'].includes(info.region)) script = 'Hans';
    }
    let defaultScript = null;
    try { defaultScript = new Intl.Locale(info.language).maximize().script; } catch (_) {}
    if (info.baseName !== info.locale) chain.push(info.baseName);
    if (info.region) chain.push([info.language, info.script, info.region].filter(Boolean).join('-'));
    if (script) chain.push(info.language + '-' + script);
    // A locale parent is allowed, but a different writing system is not silently substituted.
    if (!script || script === defaultScript) chain.push(info.language);
    return [...new Set(chain)];
  }
  const BASIC_TERMS = {
  "de": {
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/dist/translations/de.json",
    "blobSha": "3fd81b247168b8af7be05b282905754862cb1220",
    "sourceLocale": "de",
    "license": "ISC",
    "terms": {
      "google_places:mosque": {
        "text": "Muslimische Moschee",
        "preset": "amenity/place_of_worship/muslim"
      },
      "google_places:church": {
        "text": "Christliche Kirche",
        "preset": "amenity/place_of_worship/christian"
      },
      "google_places:synagogue": {
        "text": "Jüdische Synagoge",
        "preset": "amenity/place_of_worship/jewish"
      },
      "google_places:restaurant": {
        "text": "Restaurant",
        "preset": "amenity/restaurant"
      },
      "google_places:cafe": {
        "text": "Café",
        "preset": "amenity/cafe"
      },
      "google_places:school": {
        "text": "Schulgelände",
        "preset": "education/school"
      },
      "google_places:hospital": {
        "text": "Krankenhaus",
        "preset": "amenity/hospital"
      },
      "google_places:pharmacy": {
        "text": "Apotheke",
        "preset": "amenity/pharmacy"
      },
      "google_places:bank": {
        "text": "Bank-Filiale",
        "preset": "amenity/bank"
      },
      "google_places:atm": {
        "text": "Geldautomat",
        "preset": "amenity/atm"
      },
      "google_places:gas_station": {
        "text": "Tankstelle",
        "preset": "amenity/fuel"
      },
      "google_places:hotel": {
        "text": "Hotel",
        "preset": "tourism/hotel"
      },
      "google_places:supermarket": {
        "text": "Supermarkt",
        "preset": "shop/supermarket"
      },
      "google_places:park": {
        "text": "Park",
        "preset": "leisure/park"
      },
      "google_places:library": {
        "text": "Bibliothek",
        "preset": "amenity/library"
      }
    }
  },
  "fr": {
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/dist/translations/fr.json",
    "blobSha": "461668da13b5e7992de88f3cff919d33f913cc0a",
    "sourceLocale": "fr",
    "license": "ISC",
    "terms": {
      "google_places:mosque": {
        "text": "Mosquée",
        "preset": "amenity/place_of_worship/muslim"
      },
      "google_places:church": {
        "text": "Église chrétienne",
        "preset": "amenity/place_of_worship/christian"
      },
      "google_places:synagogue": {
        "text": "Synagogue",
        "preset": "amenity/place_of_worship/jewish"
      },
      "google_places:restaurant": {
        "text": "Restaurant",
        "preset": "amenity/restaurant"
      },
      "google_places:cafe": {
        "text": "Café",
        "preset": "amenity/cafe"
      },
      "google_places:school": {
        "text": "École élémentaire ou secondaire (terrain)",
        "preset": "education/school"
      },
      "google_places:hospital": {
        "text": "Centre hospitalier",
        "preset": "amenity/hospital"
      },
      "google_places:pharmacy": {
        "text": "Pharmacie",
        "preset": "amenity/pharmacy"
      },
      "google_places:bank": {
        "text": "Banque",
        "preset": "amenity/bank"
      },
      "google_places:atm": {
        "text": "Distributeur de billets",
        "preset": "amenity/atm"
      },
      "google_places:gas_station": {
        "text": "Station-service",
        "preset": "amenity/fuel"
      },
      "google_places:hotel": {
        "text": "Hôtel",
        "preset": "tourism/hotel"
      },
      "google_places:supermarket": {
        "text": "Supermarché",
        "preset": "shop/supermarket"
      },
      "google_places:park": {
        "text": "Parc",
        "preset": "leisure/park"
      },
      "google_places:library": {
        "text": "Bibliothèque",
        "preset": "amenity/library"
      }
    }
  },
  "zh-Hans": {
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/dist/translations/zh-CN.json",
    "blobSha": "8282b5b3c8409f411b2d178b0ca1aac44ce8d65f",
    "sourceLocale": "zh-CN",
    "license": "ISC",
    "terms": {
      "google_places:mosque": {
        "text": "清真寺殿堂",
        "preset": "amenity/place_of_worship/muslim"
      },
      "google_places:church": {
        "text": "基督教堂",
        "preset": "amenity/place_of_worship/christian"
      },
      "google_places:synagogue": {
        "text": "犹太教堂",
        "preset": "amenity/place_of_worship/jewish"
      },
      "google_places:restaurant": {
        "text": "餐馆",
        "preset": "amenity/restaurant"
      },
      "google_places:cafe": {
        "text": "咖啡餐馆",
        "preset": "amenity/cafe"
      },
      "google_places:school": {
        "text": "学校",
        "preset": "education/school"
      },
      "google_places:hospital": {
        "text": "医院",
        "preset": "amenity/hospital"
      },
      "google_places:pharmacy": {
        "text": "药房",
        "preset": "amenity/pharmacy"
      },
      "google_places:bank": {
        "text": "银行",
        "preset": "amenity/bank"
      },
      "google_places:atm": {
        "text": "ATM机",
        "preset": "amenity/atm"
      },
      "google_places:gas_station": {
        "text": "加油站",
        "preset": "amenity/fuel"
      },
      "google_places:hotel": {
        "text": "酒店",
        "preset": "tourism/hotel"
      },
      "google_places:supermarket": {
        "text": "超市",
        "preset": "shop/supermarket"
      },
      "google_places:park": {
        "text": "公园",
        "preset": "leisure/park"
      },
      "google_places:library": {
        "text": "图书馆",
        "preset": "amenity/library"
      }
    }
  },
  "es": {
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/dist/translations/es.json",
    "blobSha": "53585ffc561c4d1c9163baf8f274a31fc233b198",
    "sourceLocale": "es",
    "license": "ISC",
    "terms": {
      "google_places:mosque": {
        "text": "Mezquita musulmana",
        "preset": "amenity/place_of_worship/muslim"
      },
      "google_places:church": {
        "text": "Iglesia cristiana",
        "preset": "amenity/place_of_worship/christian"
      },
      "google_places:synagogue": {
        "text": "Sinagoga judia",
        "preset": "amenity/place_of_worship/jewish"
      },
      "google_places:restaurant": {
        "text": "Restaurante",
        "preset": "amenity/restaurant"
      },
      "google_places:cafe": {
        "text": "Cafetería",
        "preset": "amenity/cafe"
      },
      "google_places:school": {
        "text": "Terreno escolar",
        "preset": "education/school"
      },
      "google_places:hospital": {
        "text": "Terreno del hospital",
        "preset": "amenity/hospital"
      },
      "google_places:pharmacy": {
        "text": "Farmacia",
        "preset": "amenity/pharmacy"
      },
      "google_places:bank": {
        "text": "Banco",
        "preset": "amenity/bank"
      },
      "google_places:atm": {
        "text": "Cajero automático",
        "preset": "amenity/atm"
      },
      "google_places:gas_station": {
        "text": "Estación de servicio / Gasolinera",
        "preset": "amenity/fuel"
      },
      "google_places:hotel": {
        "text": "Hotel",
        "preset": "tourism/hotel"
      },
      "google_places:supermarket": {
        "text": "Supermercado",
        "preset": "shop/supermarket"
      },
      "google_places:park": {
        "text": "Parque / Plaza verde",
        "preset": "leisure/park"
      },
      "google_places:library": {
        "text": "Biblioteca",
        "preset": "amenity/library"
      }
    }
  }
};

  Object.assign(BASIC_TERMS, {
  "ja": {
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/dist/translations/ja.json",
    "blobSha": "6517b4b8834782eb7267f1cdd2cf3e7761511d48",
    "sourceLocale": "ja",
    "license": "ISC",
    "terms": {
      "google_places:mosque": {
        "text": "イスラム教のモスク",
        "preset": "amenity/place_of_worship/muslim"
      },
      "google_places:church": {
        "text": "キリスト教の教会",
        "preset": "amenity/place_of_worship/christian"
      },
      "google_places:synagogue": {
        "text": "ユダヤ教のシナゴーグ",
        "preset": "amenity/place_of_worship/jewish"
      },
      "google_places:restaurant": {
        "text": "レストラン全般",
        "preset": "amenity/restaurant"
      },
      "google_places:cafe": {
        "text": "喫茶店",
        "preset": "amenity/cafe"
      },
      "google_places:school": {
        "text": "学校（代表点または敷地）",
        "preset": "education/school"
      },
      "google_places:hospital": {
        "text": "大規模病院（代表点または敷地）",
        "preset": "amenity/hospital"
      },
      "google_places:pharmacy": {
        "text": "薬局・ドラッグストア（薬剤師が居る店）",
        "preset": "amenity/pharmacy"
      },
      "google_places:bank": {
        "text": "銀行",
        "preset": "amenity/bank"
      },
      "google_places:atm": {
        "text": "ATM",
        "preset": "amenity/atm"
      },
      "google_places:gas_station": {
        "text": "ガソリンスタンド",
        "preset": "amenity/fuel"
      },
      "google_places:hotel": {
        "text": "ホテル",
        "preset": "tourism/hotel"
      },
      "google_places:supermarket": {
        "text": "スーパーマーケット",
        "preset": "shop/supermarket"
      },
      "google_places:park": {
        "text": "公園",
        "preset": "leisure/park"
      },
      "google_places:library": {
        "text": "図書館",
        "preset": "amenity/library"
      }
    }
  },
  "pt-BR": {
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/dist/translations/pt-BR.json",
    "blobSha": "0e1d43b50b7b8003499647831c4a46362e3c4086",
    "sourceLocale": "pt-BR",
    "license": "ISC",
    "terms": {
      "google_places:mosque": {
        "text": "Mesquita muçulmana",
        "preset": "amenity/place_of_worship/muslim"
      },
      "google_places:church": {
        "text": "Igreja cristã",
        "preset": "amenity/place_of_worship/christian"
      },
      "google_places:synagogue": {
        "text": "Sinagoga judaica",
        "preset": "amenity/place_of_worship/jewish"
      },
      "google_places:restaurant": {
        "text": "Restaurante",
        "preset": "amenity/restaurant"
      },
      "google_places:cafe": {
        "text": "Cafeteria",
        "preset": "amenity/cafe"
      },
      "google_places:school": {
        "text": "Escola",
        "preset": "education/school"
      },
      "google_places:hospital": {
        "text": "Hospital",
        "preset": "amenity/hospital"
      },
      "google_places:pharmacy": {
        "text": "Farmácia",
        "preset": "amenity/pharmacy"
      },
      "google_places:bank": {
        "text": "Banco",
        "preset": "amenity/bank"
      },
      "google_places:atm": {
        "text": "Caixa eletrônico",
        "preset": "amenity/atm"
      },
      "google_places:gas_station": {
        "text": "Posto de combustível",
        "preset": "amenity/fuel"
      },
      "google_places:hotel": {
        "text": "Hotel",
        "preset": "tourism/hotel"
      },
      "google_places:supermarket": {
        "text": "Supermercado",
        "preset": "shop/supermarket"
      },
      "google_places:park": {
        "text": "Parque ou praça",
        "preset": "leisure/park"
      },
      "google_places:library": {
        "text": "Biblioteca",
        "preset": "amenity/library"
      }
    }
  },
  "zh-Hant": {
    "source": "https://github.com/openstreetmap/id-tagging-schema/blob/main/dist/translations/zh-TW.json",
    "blobSha": "e794c6d032ff610639e76c0680475e78cfd9dd18",
    "sourceLocale": "zh-TW",
    "license": "ISC",
    "terms": {
      "google_places:mosque": {
        "text": "清真寺",
        "preset": "amenity/place_of_worship/muslim"
      },
      "google_places:church": {
        "text": "教堂",
        "preset": "amenity/place_of_worship/christian"
      },
      "google_places:synagogue": {
        "text": "猶太教堂",
        "preset": "amenity/place_of_worship/jewish"
      },
      "google_places:restaurant": {
        "text": "餐廳",
        "preset": "amenity/restaurant"
      },
      "google_places:cafe": {
        "text": "咖啡館",
        "preset": "amenity/cafe"
      },
      "google_places:school": {
        "text": "學校範圍",
        "preset": "education/school"
      },
      "google_places:hospital": {
        "text": "醫院",
        "preset": "amenity/hospital"
      },
      "google_places:pharmacy": {
        "text": "藥局",
        "preset": "amenity/pharmacy"
      },
      "google_places:bank": {
        "text": "銀行",
        "preset": "amenity/bank"
      },
      "google_places:atm": {
        "text": "自動提款機",
        "preset": "amenity/atm"
      },
      "google_places:gas_station": {
        "text": "加油站",
        "preset": "amenity/fuel"
      },
      "google_places:hotel": {
        "text": "旅館",
        "preset": "tourism/hotel"
      },
      "google_places:supermarket": {
        "text": "超級市場",
        "preset": "shop/supermarket"
      },
      "google_places:park": {
        "text": "公園",
        "preset": "leisure/park"
      },
      "google_places:library": {
        "text": "圖書館",
        "preset": "amenity/library"
      }
    }
  }
});

  function getCatalog(provider = 'osm_overpass') {
    if (provider === 'google_maps_platform' || provider === 'google_maps_dom') return {
      provider, source: SOURCES.google, snapshotDate: '2026-11-09', retrievedAt: '2026-11-14',
      scope: 'maps_javascript_api_localization', exhaustive: false,
      domSupportVerified: false, locales: GOOGLE_PROVIDER_CODES.map(providerCode => ({ locale: normalizeLocale(providerCode), providerCode }))
    };
    if (provider === 'osm_overpass') return {
      provider, source: SOURCES.osm, scope: 'multilingual_name_tags', exhaustive: false,
      acceptsLanguageParameter: false, resultLanguageGuaranteed: false, locales: []
    };
    return { provider, source: null, scope: 'unknown_provider', exhaustive: false, locales: [] };
  }
  function describeLocale(value, provider = 'osm_overpass') {
    const info = localeInfo(value), catalog = getCatalog(provider);
    if (provider === 'osm_overpass') return { ...info, provider, providerSupported: null,
      status: 'name_tag_locale', source: catalog.source, nameTagCandidates: lookupChain(info.locale).map(l => 'name:' + l), resultLanguageGuaranteed: false };
    const exact = catalog.locales.find(row => row.locale === info.locale);
    const base = catalog.locales.find(row => row.locale === info.language);
    return { ...info, provider, providerSupported: provider === 'google_maps_dom' ? null : !!exact,
      status: provider === 'google_maps_dom' ? 'unverified_dom_language_support' : exact ? 'listed' : 'not_listed_in_snapshot',
      providerLocale: exact?.providerCode || null, suggestedProviderLocale: !exact ? base?.providerCode || null : null,
      source: catalog.source, resultLanguageGuaranteed: false };
  }
  function listProviderLanguages(provider = 'google_maps_platform', displayLocale = 'ar') {
    const rows = getCatalog(provider).locales;
    let names = null; try { names = new Intl.DisplayNames([normalizeLocale(displayLocale)], { type: 'language' }); } catch (_) {}
    return rows.map(row => ({ ...row, label: names?.of(row.locale) || row.locale }));
  }
  function validateTerms(value) {
    const terms = Array.isArray(value) ? value : [value];
    if (!terms.length || terms.some(t => typeof t !== 'string' || !t.trim() || t.length > 1000)) throw Object.assign(new Error('Query terms must be nonempty strings of at most 1000 characters.'), { code: 'INVALID_QUERY_TERM' });
    return [...new Set(terms)];
  }
  function lookupMap(map, chain) {
    if (!map || typeof map !== 'object' || Array.isArray(map)) return null;
    const entries = new Map(Object.entries(map).map(([key, value]) => [normalizeLocale(key), value]));
    for (const locale of chain) if (entries.has(locale)) return { locale, value: entries.get(locale) };
    return null;
  }
  function resolveTerms(selection, options = {}) {
    const locale = normalizeLocale(selection?.kind === 'free_text' && selection.locale ? selection.locale : options.locale || 'ar');
    const id = selection?.id || selection?.canonicalId || null;
    if (selection?.kind === 'free_text' && typeof selection.text !== 'string') throw Object.assign(new Error('Free text must be a string.'), { code: 'INVALID_QUERY_TERM' });
    if (selection?.kind === 'free_text') return {
      terms: validateTerms(selection.text).map(text => ({ text, locale, requestedLocale: locale, source: 'user_free_text', localeMatch: 'exact' })),
      missingTranslation: null, fallbackUsed: false
    };
    const category = options.category || selection;
    const canonicalId = selection?.canonicalId || category?.canonicalId || null;
    const keys = [...new Set([id, canonicalId].filter(Boolean))];
    function atLocale(requested) {
      const chain = lookupChain(requested);
      for (const key of keys) {
        const custom = lookupMap(options.queryTerms?.[key], chain);
        if (custom) return validateTerms(custom.value).map(text => ({ text, locale: custom.locale, requestedLocale: locale,
          source: 'user_override', scopeId: key, localeMatch: custom.locale === requested ? 'exact' : 'locale_parent' }));
      }
      const label = lookupMap(selection?.labels || { ar: selection?.name_ar, en: selection?.name_en }, chain);
      if (label && typeof label.value === 'string' && label.value.trim()) return [{ text: label.value, locale: label.locale, requestedLocale: locale,
        source: selection?.labelOrigin || 'dalil_label', scopeId: id, localeMatch: label.locale === requested ? 'exact' : 'locale_parent' }];
      const isLeaf = /^S\d+\.B\d+\.L\d+$/.test(selection?.id || '');
      const canUseConcept = !isLeaf || (selection.mappingRelation === 'equivalent' && !selection.descriptiveAttributes?.length);
      if (!canUseConcept) return [];
      for (const candidateLocale of chain) {
        const local = BASIC_TERMS[candidateLocale], term = local?.terms[canonicalId];
        if (term) return [{ text: term.text, locale: candidateLocale, requestedLocale: locale, source: 'id_tagging_schema_translation',
          sourceUrl: local.source, sourceBlobSha: local.blobSha, preset: term.preset, scopeId: canonicalId,
          localeMatch: candidateLocale === requested ? 'exact' : 'locale_parent' }];
        const aliases = category?.aliases?.[candidateLocale];
        if (Array.isArray(aliases) && aliases.length) return [{ text: aliases[0], locale: candidateLocale, requestedLocale: locale,
          source: 'dalil_local_alias', scopeId: canonicalId, localeMatch: candidateLocale === requested ? 'exact' : 'locale_parent' }];
      }
      return [];
    }
    const terms = atLocale(locale);
    if (terms.length) return { terms, missingTranslation: null, fallbackUsed: false };
    const missingTranslation = { selectionId: id, canonicalId, locale, reason: 'query_term_not_available', resolvedByFallback: false };
    if (options.fallbackLanguage) {
      const fallback = normalizeLocale(options.fallbackLanguage), fallbackTerms = atLocale(fallback);
      if (fallbackTerms.length) return {
        terms: fallbackTerms.map(t => ({ ...t, explicitFallback: true, fallbackFrom: locale })),
        missingTranslation: { ...missingTranslation, resolvedByFallback: true, fallbackLanguage: fallback }, fallbackUsed: true
      };
    }
    return { terms: [], missingTranslation, fallbackUsed: false };
  }
  const ArabicFold = (typeof DalilArabic !== 'undefined' && DalilArabic?.fold) ? DalilArabic
    : (typeof require === 'function' ? (() => { try { return require('./arabic-normalize.js'); } catch (_) { return null; } })() : null);
  const fold = value => ArabicFold?.fold ? ArabicFold.fold(value) : String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
  function findConceptIds(text, locale = null) {
    const match = fold(text), allowed = locale ? new Set(lookupChain(locale)) : null, ids = new Set();
    if (!match) return [];
    for (const [language, dictionary] of Object.entries(BASIC_TERMS)) {
      if (allowed && !allowed.has(language)) continue;
      for (const [id, term] of Object.entries(dictionary.terms)) if (fold(term.text) === match) ids.add(id);
    }
    return [...ids];
  }
  function createFreeText(text, locale = 'ar') {
    if (typeof text !== 'string') throw Object.assign(new Error('Free text must be a string.'), { code: 'INVALID_QUERY_TERM' });
    validateTerms(text); return { kind: 'free_text', text, locale: normalizeLocale(locale) };
  }
  return { SOURCES, BASIC_TERMS, normalizeLocale, localeInfo, lookupChain, getCatalog, describeLocale, listProviderLanguages, resolveTerms, findConceptIds, createFreeText };
});
