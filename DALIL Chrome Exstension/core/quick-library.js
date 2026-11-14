/* Broad discovery targets. These are DALIL search presets, not extra Google types.
 * A target schedules a few general terms, never expands its detailed descendants.
 * Missing locale terms use the existing explicit translation-review workflow.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DalilQuickLibrary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const rows = [
    ['restaurants','restaurant','مطاعم','Restaurants'],
    ['cafes','cafe','مقاهٍ','Cafes'],
    ['pharmacies','pharmacy','صيدليات','Pharmacies'],
    ['mosques','mosque','مساجد ومصليات','Mosques and prayer rooms'],
    ['churches','church','كنائس','Churches'],
    ['monasteries',null,'أديرة','Monasteries'],
    ['synagogues','synagogue','معابد يهودية','Synagogues'],
    ['temples',null,'معابد','Temples'],
    ['companies','corporate_office','شركات','Companies'],
    ['factories','manufacturer','مصانع','Factories'],
    ['banks','bank','بنوك','Banks'],
    ['supermarkets','supermarket','سوبر ماركت','Supermarkets'],
    ['hotels','hotel','فنادق','Hotels'],
    ['fuel','gas_station','محطات وقود','Fuel stations'],
    ['hospitals','hospital','مستشفيات','Hospitals'],
    ['schools','school','مدارس','Schools'],
    ['clinics','medical_clinic','عيادات','Clinics'],
    ['dentists','dentist','عيادات أسنان','Dentists'],
    ['labs','medical_lab','معامل تحاليل','Medical laboratories'],
    ['universities','university','جامعات','Universities'],
    ['nurseries','preschool','حضانات','Preschools'],
    ['bakeries','bakery','مخابز','Bakeries'],
    ['sweets','dessert_shop','حلويات','Sweet shops'],
    ['groceries','grocery_store','بقالات','Grocery stores'],
    ['shops','store','محلات','Shops'],
    ['malls','shopping_mall','مراكز تسوق','Shopping malls'],
    ['atms','atm','صرافات آلية','ATMs'],
    ['parks','park','حدائق','Parks'],
    ['gyms','gym','صالات رياضية','Gyms'],
    ['salons','beauty_salon','صالونات تجميل','Beauty salons'],
    ['repair','car_repair','ورش سيارات','Car repair'],
    ['parking','parking','مواقف سيارات','Parking'],
    ['warehouses',null,'مخازن','Warehouses'],
    ['farms','farm','مزارع','Farms'],
    ['libraries','library','مكتبات عامة','Libraries'],
    ['museums','museum','متاحف','Museums'],
    ['police','police','أقسام شرطة','Police stations'],
    ['post','post_office','مكاتب بريد','Post offices']
  ];
  // Authored search terms, deliberately separate from official provider labels.
  const special = {
    mosques: { ar:['مساجد','مصليات','زوايا'], en:['Mosque','Prayer room','Zawiya'],
      fr:['Mosquée','Salle de prière','Zaouïa'], de:['Moschee','Gebetsraum','Zawiya'],
      es:['Mezquita','Sala de oración','Zauía'], pt:['Mesquita','Sala de oração','Zauia'],
      'pt-BR':['Mesquita','Sala de oração','Zauia'], ja:['モスク','礼拝室'],
      zh:['清真寺','祈祷室'], 'zh-Hant':['清真寺','祈禱室'], hi:['मस्जिद','नमाज़ कक्ष'] },
    monasteries: { ar:['أديرة'], en:['Monastery'], fr:['Monastère'], de:['Kloster'], es:['Monasterio'],
      pt:['Mosteiro'], ja:['修道院'], zh:['修道院'], 'zh-Hant':['修道院'], hi:['मठ'], ru:['Монастырь'], it:['Monastero'], tr:['Manastır'] },
    companies: { ar:['شركات'], en:['Company'], fr:['Entreprise'], de:['Unternehmen'], es:['Empresa'],
      pt:['Empresa'], ja:['会社'], zh:['公司'], 'zh-Hant':['公司'], hi:['कंपनी'], ru:['Компания'], it:['Azienda'], tr:['Şirket'] },
    factories: { ar:['مصانع'], en:['Factory'], fr:['Usine'], de:['Fabrik'], es:['Fábrica'],
      pt:['Fábrica'], ja:['工場'], zh:['工厂'], 'zh-Hant':['工廠'], hi:['कारखाना'], ru:['Завод'], it:['Fabbrica'], tr:['Fabrika'] },
    temples: { ar:['معابد'], en:['Temple'] },
    warehouses: { ar:['مخازن'], en:['Warehouse'] }
  };
  // DALIL-authored broad search phrases; not official Google translations.
  const translated = {
    fr:'Restaurant|Café|Pharmacie|Mosquée|Église|Monastère|Synagogue|Temple|Entreprise|Usine|Banque|Supermarché|Hôtel|Station-service|Hôpital|École|Clinique|Dentiste|Laboratoire d’analyses médicales|Université|Crèche|Boulangerie|Confiserie|Épicerie|Magasin|Centre commercial|Distributeur automatique de billets|Parc|Salle de sport|Salon de beauté|Garage automobile|Parking|Entrepôt|Ferme|Bibliothèque|Musée|Commissariat|Bureau de poste',
    de:'Restaurant|Café|Apotheke|Moschee|Kirche|Kloster|Synagoge|Tempel|Unternehmen|Fabrik|Bank|Supermarkt|Hotel|Tankstelle|Krankenhaus|Schule|Arztpraxis|Zahnarzt|Medizinisches Labor|Universität|Kindergarten|Bäckerei|Süßwarengeschäft|Lebensmittelgeschäft|Geschäft|Einkaufszentrum|Geldautomat|Park|Fitnessstudio|Kosmetiksalon|Autowerkstatt|Parkplatz|Lagerhaus|Bauernhof|Bibliothek|Museum|Polizeistation|Postamt',
    es:'Restaurante|Cafetería|Farmacia|Mezquita|Iglesia|Monasterio|Sinagoga|Templo|Empresa|Fábrica|Banco|Supermercado|Hotel|Gasolinera|Hospital|Escuela|Clínica|Dentista|Laboratorio de análisis clínicos|Universidad|Guardería|Panadería|Confitería|Tienda de alimentación|Tienda|Centro comercial|Cajero automático|Parque|Gimnasio|Salón de belleza|Taller mecánico|Aparcamiento|Almacén|Granja|Biblioteca|Museo|Comisaría de policía|Oficina de correos',
    pt:'Restaurante|Café|Farmácia|Mesquita|Igreja|Mosteiro|Sinagoga|Templo|Empresa|Fábrica|Banco|Supermercado|Hotel|Posto de combustível|Hospital|Escola|Clínica|Dentista|Laboratório de análises clínicas|Universidade|Creche|Padaria|Confeitaria|Mercearia|Loja|Centro comercial|Caixa automático|Parque|Ginásio|Salão de beleza|Oficina mecânica|Estacionamento|Armazém|Fazenda|Biblioteca|Museu|Esquadra de polícia|Correios',
    ja:'レストラン|カフェ|薬局|モスク|教会|修道院|シナゴーグ|寺院|会社|工場|銀行|スーパーマーケット|ホテル|ガソリンスタンド|病院|学校|クリニック|歯科医院|臨床検査センター|大学|保育園|パン屋|菓子店|食料品店|店舗|ショッピングモール|ATM|公園|ジム|美容サロン|自動車修理工場|駐車場|倉庫|農場|図書館|博物館|警察署|郵便局',
    zh:'餐厅|咖啡馆|药房|清真寺|教堂|修道院|犹太教堂|寺庙|公司|工厂|银行|超市|酒店|加油站|医院|学校|诊所|牙科诊所|医学检验所|大学|幼儿园|面包店|糖果店|杂货店|商店|购物中心|自动取款机|公园|健身房|美容院|汽车修理厂|停车场|仓库|农场|图书馆|博物馆|警察局|邮局',
    'zh-Hant':'餐廳|咖啡館|藥房|清真寺|教堂|修道院|猶太教堂|寺廟|公司|工廠|銀行|超市|飯店|加油站|醫院|學校|診所|牙科診所|醫學檢驗所|大學|幼兒園|麵包店|糖果店|雜貨店|商店|購物中心|自動提款機|公園|健身房|美容院|汽車修理廠|停車場|倉庫|農場|圖書館|博物館|警察局|郵局',
    hi:'रेस्तरां|कैफ़े|दवा की दुकान|मस्जिद|चर्च|मठ|यहूदी उपासना स्थल|मंदिर|कंपनी|कारखाना|बैंक|सुपरमार्केट|होटल|पेट्रोल पंप|अस्पताल|विद्यालय|क्लिनिक|दंत चिकित्सालय|चिकित्सा प्रयोगशाला|विश्वविद्यालय|नर्सरी स्कूल|बेकरी|मिठाई की दुकान|किराने की दुकान|दुकान|शॉपिंग मॉल|एटीएम|पार्क|जिम|ब्यूटी सैलून|कार मरम्मत की दुकान|पार्किंग|गोदाम|खेत|पुस्तकालय|संग्रहालय|पुलिस थाना|डाकघर'
  };
  const dictionaries=Object.fromEntries(Object.entries(translated).map(([locale,text])=>{
    const values=text.split('|');if(values.length!==rows.length)throw Error('Incomplete broad search terms: '+locale);
    return [locale,values];
  }));
  const presets = rows.map(([key,type,ar,en],index) => Object.freeze({
    id:'quick:'+key, kind:'quick_category', canonicalId:type?'google_places:'+type:null,
    labels:{ar,en}, terms:{ar:[ar],en:[en],...Object.fromEntries(Object.entries(dictionaries).map(([locale,values])=>[locale,[values[index]]])),...special[key]}
  }));
  const byId = new Map(presets.map(p => [p.id,p]));
  function get(value) { return typeof value === 'string' ? byId.get(value) || null : null; }
  function findHintIds(text) {
    const fold=value=>String(value||'').normalize('NFKC').trim().toLowerCase(),key=fold(text);
    if(!key)return [];
    // Only primary broad phrases qualify. Related terms such as Zawiya must not
    // be asserted to be an equivalent official mosque category.
    return [...new Set(presets.filter(p=>p.canonicalId&&
      [...Object.values(p.labels),...Object.values(p.terms).map(terms=>terms[0])].some(term=>fold(term)===key))
      .map(p=>p.canonicalId))];
  }
  function resolveTerms(preset, options, languages) {
    const overrides = options.queryTerms || {};
    // An override for this broad target takes precedence over its authored terms.
    const resolution=languages.resolveTerms(preset, { ...options,
      queryTerms:{...overrides,[preset.id]:{...preset.terms,...overrides[preset.id]}} });
    for(const term of resolution.terms){
      const manual=Object.keys(overrides[preset.id]||{}).some(locale=>languages.normalizeLocale(locale)===term.locale);
      if(term.scopeId===preset.id&&!manual){term.source='dalil_broad_search_term';term.sourceUrl='local:core/quick-library.js';}
    }
    return resolution;
  }
  return { list:() => presets.slice(), get, resolveTerms, findHintIds };
});
