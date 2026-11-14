/* Canonical records and a conservative identity/spatial index. No network or inferred fields. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PlaceRecords = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const normalizeName = value => String(value || '').normalize('NFKC').toLocaleLowerCase('und')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/\s+/g, ' ').trim();
  function hasGeometry(item) {
    return !!item && item.hasExactCoords === true && typeof item.x === 'number' && typeof item.y === 'number' &&
      Number.isFinite(item.x) && Number.isFinite(item.y) && Math.abs(item.x) <= 180 && Math.abs(item.y) <= 90;
  }
  function normalize(item, context = {}) {
    const provider = item.provider || context.provider || 'imported';
    const exact = hasGeometry(item);
    const now = context.timestamp || new Date().toISOString();
    const record = { ...item, provider,
      id: String(item.id || `${provider}:${item.place_id || item.cid || context.sequence || 0}`),
      x: exact ? Number(item.x.toFixed(6)) : null, y: exact ? Number(item.y.toFixed(6)) : null,
      hasExactCoords: exact, geometry: exact ? { type: 'Point', coordinates: [Number(item.x.toFixed(6)), Number(item.y.toFixed(6))] } : null,
      record_status: exact ? 'verified' : 'pending_geocode',
      coordinateConfidence: exact ? (item.coordinateConfidence || 'source_verified') : 'none',
      coordinateSource: exact ? (item.coordinateSource || provider) : (item.coordinateSource || 'missing'),
      crs: 'EPSG:4326', lastUpdated: now,
      providerIds: { ...(item.providerIds || {}), [provider]: item.place_id || item.cid || item.id || '' },
      discoveryCellIds: [...new Set([...(item.discoveryCellIds || []), ...(context.cellId ? [context.cellId] : [])])],
      searchQueryIds: [...new Set([...(item.searchQueryIds || []), ...(context.queryId ? [context.queryId] : [])])],
      provenance: Array.isArray(item.provenance) ? [...item.provenance] : [],
      fieldProvenance: { ...(item.fieldProvenance || {}) },
      qualityFlags: [...new Set([...(item.qualityFlags || []), ...(!exact ? ['unlocated'] : [])])]
    };
    const receipt = { provider, sourceUrl: item.sourceUrl || item.url || context.sourceUrl || '', observedAt: now,
      license: item.license || context.license || 'unspecified', exportAllowed: context.exportAllowed === true,
      jobId: context.jobId || null, cellId: context.cellId || null, queryId: context.queryId || null };
    if (!record.provenance.some(p => p.jobId === receipt.jobId && p.cellId === receipt.cellId && p.queryId === receipt.queryId && p.provider === provider)) record.provenance.push(receipt);
    record.exportAllowed = context.exportAllowed === true;
    // Only fields actually observed receive an observed provenance claim. Missing is explicit.
    const fields = ['name', 'name_en', 'category', 'address', 'phone', 'website', 'email', 'rating', 'reviewsCount', 'opening_hours', 'status', 'plus_code', 'price_level'];
    for (const field of fields) {
      if (!record.fieldProvenance[field]) record.fieldProvenance[field] = {
        provider, sourceUrl: receipt.sourceUrl, observedAt: now,
        state: item[field] !== '' && item[field] != null ? 'provided' : 'not_provided',
        confidence: item[field] !== '' && item[field] != null ? 'observed' : 'none',
        language: context.resultLanguage || 'und', unit: null
      };
    }
    if (!exact) record.ownerCellId = null;
    return record;
  }
  function distanceMeters(a, b) {
    const radians = Math.PI / 180;
    const dy = (a.y - b.y) * radians;
    let dx = (a.x - b.x) * radians;
    if (dx > Math.PI) dx -= 2 * Math.PI;
    if (dx < -Math.PI) dx += 2 * Math.PI;
    const h = Math.sin(dy / 2) ** 2 + Math.cos(a.y * radians) * Math.cos(b.y * radians) * Math.sin(dx / 2) ** 2;
    return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }
  class RecordIndex {
    constructor(records = []) { this.rebuild(records); }
    rebuild(records) {
      this.identities = new Map(); this.buckets = new Map(); this.records = records;
      records.forEach((r, i) => this.add(r, i));
    }
    identityKeys(record) {
      const provider = record.provider || 'imported';
      return ['place_id', 'cid', 'id'].filter(key => record[key]).map(key => `${provider}|${key}|${record[key]}`);
    }
    bucket(record) { return [Math.floor(record.x / 0.001), Math.floor(record.y / 0.001)]; }
    add(record, index) {
      this.identityKeys(record).forEach(key => this.identities.set(key, index));
      if (hasGeometry(record)) {
        const [x, y] = this.bucket(record), key = `${x}|${y}`;
        if (!this.buckets.has(key)) this.buckets.set(key, new Set());
        this.buckets.get(key).add(index);
      }
    }
    find(record) {
      for (const key of this.identityKeys(record)) if (this.identities.has(key)) {
        const candidate=this.records[this.identities.get(key)];
        if(record.place_id && candidate.place_id && record.place_id!==candidate.place_id)continue;
        if(record.cid && candidate.cid && record.cid!==candidate.cid)continue;
        return this.identities.get(key);
      }
      if (!hasGeometry(record)) return -1;
      const name = normalizeName(record.name);
      if (!name) return -1;
      const [x, y] = this.bucket(record);
      // A latitude-aware neighbourhood avoids losing nearby points at high latitudes.
      const lonRange = Math.min(360000, Math.ceil(0.00032 / (0.001 * Math.max(0.000001, Math.cos(record.y * Math.PI / 180)))));
      // Near poles a name bucket would be preferable; do not perform an unbounded neighbour loop.
      if (lonRange > 50) return -1;
      for (let dx = -lonRange; dx <= lonRange; dx++) for (let dy = -1; dy <= 1; dy++) {
        const wrapX = ((x + dx + 180000) % 360000 + 360000) % 360000 - 180000;
        const candidates = this.buckets.get(`${wrapX}|${y + dy}`);
        if (!candidates) continue;
        for (const index of candidates) {
          const other = this.records[index];
          if ((other.provider || 'imported') !== (record.provider || 'imported')) continue;
          // Different provider IDs are independent venues even when names/locations coincide.
          if (other.place_id && record.place_id && other.place_id !== record.place_id) continue;
          if (other.cid && record.cid && other.cid !== record.cid) continue;
          if (normalizeName(other.name) !== name) continue;
          if (other.category && record.category && normalizeName(other.category) !== normalizeName(record.category)) continue;
          if (distanceMeters(other, record) <= 25) return index;
        }
      }
      return -1;
    }
  }
  function merge(existing, incoming) {
    const result = { ...existing };
    for (const [key, value] of Object.entries(incoming)) {
      if ((result[key] == null || result[key] === '') && value != null && value !== '') result[key] = value;
    }
    for (const key of ['discoveryCellIds', 'searchQueryIds', 'qualityFlags', 'categoryIds']) result[key] = [...new Set([...(existing[key] || []), ...(incoming[key] || [])])];
    const receipts = [...(existing.provenance || []), ...(incoming.provenance || [])];
    result.provenance = [...new Map(receipts.map(p => [JSON.stringify(p), p])).values()];
    result.fieldProvenance = { ...(incoming.fieldProvenance || {}), ...(existing.fieldProvenance || {}) };
    const provided=value=>value!=null && value!=='';
    for (const [key, value] of Object.entries(incoming.fieldProvenance || {})) if (!provided(existing[key]) && provided(incoming[key])) result.fieldProvenance[key] = value;
    for(const key of ['names','osmTags','providerIds']){
      result[key]={...(existing[key]||{})};
      for(const [field,value] of Object.entries(incoming[key]||{}))if(!provided(result[key][field]))result[key][field]=value;
    }
    if(Array.isArray(existing.attributes) || Array.isArray(incoming.attributes)){
      const attributes=[...(Array.isArray(existing.attributes)?existing.attributes:[]),...(Array.isArray(incoming.attributes)?incoming.attributes:[])];
      result.attributes=[...new Map(attributes.map(attr=>[JSON.stringify([attr.key,attr.provider,attr.sourceUrl,attr.value,attr.unit]),attr])).values()];
    }
    const observations=[...(existing.fieldObservations||[]),...(incoming.fieldObservations||[])];
    for(const key of Object.keys(incoming.fieldProvenance||{}))if(provided(existing[key]) && provided(incoming[key]) && existing[key]!==incoming[key]){
      observations.push({field:key,value:incoming[key],...(incoming.fieldProvenance[key]||{})});
    }
    result.fieldObservations=[...new Map(observations.map(row=>[JSON.stringify(row),row])).values()];
    result.observationsCount = (existing.observationsCount || 1) + (incoming.observationsCount || 1);
    result.lastUpdated = incoming.lastUpdated || existing.lastUpdated;
    // Upgrade a formerly unlocated identity with an observed source point, never a camera centre.
    if (!hasGeometry(existing) && hasGeometry(incoming)) {
      for (const key of ['x','y','geometry','hasExactCoords','coordinateSource','coordinateConfidence','record_status','ownerCellId','ownerCellName','cellId','cellName']) result[key] = incoming[key];
      result.qualityFlags=result.qualityFlags.filter(flag=>flag!=='unlocated' && flag!=='nonpoint_geometry_not_downloaded');
    }
    return result;
  }
  function deduplicate(records) {
    const clean=[],index=new RecordIndex(clean);
    for(const record of records){const matched=index.find(record);if(matched<0){clean.push(record);index.add(record,clean.length-1);}else{clean[matched]=merge(clean[matched],record);index.add(clean[matched],matched);}}
    clean.forEach((record,i)=>record.index=i+1);
    return clean;
  }
  return { normalizeName, hasGeometry, normalize, merge, deduplicate, distanceMeters, RecordIndex };
});
