/* Provider capabilities are explicit: basemap tiles are never POI data adapters. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SourceAdapters = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const descriptors = Object.freeze({
    osm_overpass: Object.freeze({ id: 'osm_overpass', name: 'OpenStreetMap / Overpass', canCollect: true,
      exportAllowed: true, license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/', documentation: 'https://dev.overpass-api.de/overpass-doc/en/',
      endpoint: 'https://overpass-api.de/api/interpreter', maxPublicJobTasks: 100, maxDailyRequests: 100,
      minDelayMs: 5000, coverage: 'community_mapped; varies by location and tag', geometry: 'node_points; ways_and_relations_retained_as_unlocated' }),
    google_maps_dom: Object.freeze({ id: 'google_maps_dom', name: 'Google Maps', canCollect: true, minDelayMs:2500,
      exportAllowed: false, license: 'Google Maps terms; no general bulk extraction/export grant',
      documentation: 'https://developers.google.com/maps/faq' })
  });
  class SourceError extends Error {
    constructor(code, message, options = {}) { super(message || code); this.name = 'SourceError'; this.code = code; Object.assign(this, options); }
  }
  function get(id) {
    if (!descriptors[id]) throw new SourceError('UNKNOWN_PROVIDER', 'Unknown data source.');
    return descriptors[id];
  }
  function validateBounds(bounds) {
    if (!bounds || !['minLat','maxLat','minLng','maxLng'].every(k => typeof bounds[k] === 'number' && Number.isFinite(bounds[k])) ||
      bounds.minLat >= bounds.maxLat || bounds.minLng >= bounds.maxLng || bounds.minLat < -90 || bounds.maxLat > 90 || bounds.minLng < -180 || bounds.maxLng > 180) throw new SourceError('INVALID_BOUNDS', 'Invalid WGS84 cell bounds.');
    return bounds;
  }
  const fallbackTags = { mosque: { amenity:'place_of_worship', religion:'muslim' }, 'مسجد':{amenity:'place_of_worship',religion:'muslim'}, 'مساجد':{amenity:'place_of_worship',religion:'muslim'}, 'جامع':{amenity:'place_of_worship',religion:'muslim'}, restaurant:{amenity:'restaurant'}, 'مطعم':{amenity:'restaurant'}, cafe:{amenity:'cafe'}, 'مقهى':{amenity:'cafe'}, school:{amenity:'school'}, 'مدرسة':{amenity:'school'}, pharmacy:{amenity:'pharmacy'}, 'صيدلية':{amenity:'pharmacy'}, hospital:{amenity:'hospital'}, 'مستشفى':{amenity:'hospital'}, bank:{amenity:'bank'}, 'بنك':{amenity:'bank'}, atm:{amenity:'atm'}, fuel:{amenity:'fuel'} };
  function resolveTags(query,canonicalIds=[]) {
    let concept = null;
    if(canonicalIds.length){
      const mapped=canonicalIds.map(id=>root.DalilCategoryRegistry?.resolveConcept?.(id)).filter(Boolean);
      const mappings=mapped.filter(c=>c.osmTags?.length).map(c=>c.osmTags);
      if(mapped.length===canonicalIds.length&&mappings.length===mapped.length&&new Set(mappings.map(tags=>JSON.stringify(tags))).size===1)return Object.fromEntries(mappings[0].map(t=>[t.key,t.value]));
      return null; // A text shared by incompatible concepts must not invent a tag filter.
    }
    try { if (root.DalilCategoryRegistry && typeof root.DalilCategoryRegistry.resolveConcept === 'function') concept = root.DalilCategoryRegistry.resolveConcept(query); } catch (_) {}
    const tags = concept && concept.osmTags;
    if (Array.isArray(tags) && tags.length && tags.every(t => t && typeof t.key === 'string' && typeof t.value === 'string')) return Object.fromEntries(tags.map(t => [t.key,t.value]));
    if (tags && !Array.isArray(tags) && typeof tags === 'object' && Object.values(tags).every(v => typeof v === 'string')) return tags;
    return fallbackTags[String(query || '').normalize('NFKC').toLowerCase().trim()] || null;
  }
  function buildOverpassQuery(query, bounds, limit = 5000,canonicalIds=[]) {
    validateBounds(bounds);
    if (typeof query !== 'string' || !query.trim() || query.length > 300) throw new SourceError('INVALID_QUERY', 'A short category or place name is required.');
    const bbox = `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
    const tags = resolveTags(query,canonicalIds);
    const filters = tags ? Object.entries(tags).map(([key,value]) => `[${JSON.stringify(key)}=${JSON.stringify(value)}]`).join('') :
      `[~"^(name|name:[a-zA-Z0-9-]+)$"~${JSON.stringify(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))},i]`;
    const safeLimit = Math.min(10000, Math.max(1, Math.floor(Number(limit) || 5000)));
    return { text: `[out:json][timeout:25][maxsize:16777216];nwr${filters}(${bbox});out body ${safeLimit + 1};`,
      coverageMode: tags ? 'tag_mapping' : 'name_only', limit: safeLimit };
  }
  function fromOsmElement(element, resultLanguage = 'ar') {
    if (!element || !['node','way','relation'].includes(element.type) || !Number.isSafeInteger(element.id) || element.id <= 0) return null;
    const tags = element.tags && typeof element.tags === 'object' ? element.tags : {};
    const exact = element.type === 'node' && Number.isFinite(element.lon) && Number.isFinite(element.lat) && Math.abs(element.lon) <= 180 && Math.abs(element.lat) <= 90;
    const sourceUrl = `https://www.openstreetmap.org/${element.type}/${element.id}`;
    const names = Object.fromEntries(Object.entries(tags).filter(([key]) => key === 'name' || key.startsWith('name:')));
    const originalName = tags.name || tags[`name:${resultLanguage}`] || tags['name:en'] || '';
    const categoryKey = ['amenity','shop','tourism','leisure','office','craft','natural','historic','man_made'].find(key => tags[key]);
    return { id:`osm:${element.type}/${element.id}`, place_id:`${element.type}/${element.id}`, provider:'osm_overpass', source:'OpenStreetMap',
      sourceUrl, url:sourceUrl, license:'ODbL-1.0', attribution:descriptors.osm_overpass.attribution, names,
      name:originalName, name_en:tags['name:en'] || '', category: categoryKey ? `${categoryKey}=${tags[categoryKey]}` : '',
      x:exact ? element.lon : null, y:exact ? element.lat : null, hasExactCoords:exact,
      coordinateSource:exact ? 'osm_node' : 'missing', coordinateConfidence:exact ? 'source_node' : 'none',
      originalGeometryType:element.type, osmTags:{...tags},
      address:tags['addr:full'] || ['addr:housenumber','addr:street','addr:city','addr:postcode','addr:country'].map(k=>tags[k]).filter(Boolean).join(', '),
      phone:tags['contact:phone'] || tags.phone || '', website:tags['contact:website'] || tags.website || '',
      email:tags['contact:email'] || tags.email || '', opening_hours:tags.opening_hours || '',
      attributes:Object.entries(tags).map(([key,value])=>({key,value,type:'string',unit:null,provider:'osm_overpass',sourceUrl,state:'provided',confidence:'source_tag',language:'und'})),
      qualityFlags:[...(!originalName ? ['unnamed'] : []),...(!exact ? ['nonpoint_geometry_not_downloaded'] : [])] };
  }
  async function collectOverpass(task, options = {}) {
    const plan = buildOverpassQuery(task.query, task.cell.bounds, options.limit || 5000,task.canonicalIds||[]);
    const fetcher = options.fetch || root.fetch;
    if (typeof fetcher !== 'function') throw new SourceError('NETWORK_UNAVAILABLE');
    const controller = new AbortController();
    const externalSignal = options.signal;
    const onAbort = () => controller.abort();
    if (externalSignal?.aborted) throw new SourceError('CANCELLED');
    externalSignal?.addEventListener('abort', onAbort, {once:true});
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetcher(descriptors.osm_overpass.endpoint, {method:'POST', credentials:'omit', redirect:'error',
        headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}, body:new URLSearchParams({data:plan.text}).toString(), signal:controller.signal});
      if (response.status === 406 || response.status === 429 || response.status === 503) {
        const retry = response.headers?.get('Retry-After');
        const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : retry ? Math.max(0, (Date.parse(retry)-Date.now())/1000) : 60;
        throw new SourceError('RATE_LIMITED','The source requested a pause.',{retryAfterMs:Math.max(30000, Number.isFinite(seconds)?seconds*1000:60000),blocked:true});
      }
      if (response.status === 403) throw new SourceError('SOURCE_BLOCKED','The source declined this request.',{blocked:true});
      if (!response.ok) throw new SourceError('HTTP_ERROR',`Source HTTP ${response.status}`);
      const size = Number(response.headers?.get('Content-Length') || 0);
      if (size > 20*1024*1024) throw new SourceError('RESPONSE_TOO_LARGE');
      // Read incrementally so an absent/misleading Content-Length cannot allocate an unbounded body.
      let content;
      if (response.body?.getReader) {
        const reader = response.body.getReader(), chunks=[]; let total=0;
        try { for (;;) { const {done,value}=await reader.read(); if(done)break; total+=value.byteLength; if(total>20*1024*1024){await reader.cancel();throw new SourceError('RESPONSE_TOO_LARGE');} chunks.push(value); } }
        finally { reader.releaseLock(); }
        const bytes = new Uint8Array(total); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;} content=new TextDecoder().decode(bytes);
      } else { content=await response.text(); if(content.length>20*1024*1024)throw new SourceError('RESPONSE_TOO_LARGE'); }
      let data; try{data=JSON.parse(content);}catch(_){throw new SourceError('INVALID_RESPONSE');}
      if (!Array.isArray(data.elements)) throw new SourceError('INVALID_RESPONSE');
      const incomplete = !!data.remark;
      const items=data.elements.slice(0,plan.limit).map(e=>fromOsmElement(e,task.locale)).filter(Boolean);
      return {success:true,items,completenessStatus:incomplete?'partial':data.elements.length>plan.limit?'capped':items.length?'complete':'confirmed_empty',
        evidence:{provider:'osm_overpass',requestBounds:task.cell.bounds,coverageMode:plan.coverageMode,responseElementCount:data.elements.length,
          remark:data.remark || null,emptyVerified:!incomplete && data.elements.length===0,observedAt:new Date().toISOString()},task:{...task.identity}};
    } catch(error) {
      if (error.name === 'AbortError') throw new SourceError(externalSignal?.aborted?'CANCELLED':'TIMEOUT');
      throw error;
    } finally { clearTimeout(timer); externalSignal?.removeEventListener('abort',onAbort); }
  }
  return {descriptors,get,SourceError,validateBounds,buildOverpassQuery,fromOsmElement,collectOverpass};
});
