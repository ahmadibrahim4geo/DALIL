/**
 * Coll Data (كول داتا) - Spatial Utilities Library (Universal GIS Engine)
 * المحرك الجغرافي الشامل لقراءة ومعالجة كافة صيغ البيانات المكانية:
 * 1. Shapefile (.shp و .zip)
 * 2. Google Earth KML & KMZ (.kml, .kmz)
 * 3. GeoJSON (.geojson, .json)
 * واحتساب التقاطعات وحسابات Bounding Box وتوليد الشبكات الجغرافية المتداخلة لأي منطقة بالعالم.
 */

const SpatialUtils = {
  // Canonical geometry is always GeoJSON [longitude, latitude]. Legacy Leaflet
  // rings are derived for compatibility; they never replace the full geometry.
  normalizePolygonGeometry(geometry) {
    if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) throw new Error("A Polygon or MultiPolygon is required.");
    const source = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    if (!Array.isArray(source) || !source.length) throw new Error("The study area is empty.");
    const polygons = source.map(polygon => {
      if (!Array.isArray(polygon) || !polygon.length) throw new Error("Polygon exterior is missing.");
      return polygon.map(ring => {
        if (!Array.isArray(ring) || ring.length < 3) throw new Error("A polygon ring requires at least three vertices.");
        const result = ring.map(point => {
          if (!Array.isArray(point) || typeof point[0] !== "number" || typeof point[1] !== "number" || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) throw new Error("Coordinates must be finite WGS84 longitude/latitude values.");
          return [Number(point[0].toFixed(6)), Number(point[1].toFixed(6))];
        });
        if (result[0][0] !== result[result.length - 1][0] || result[0][1] !== result[result.length - 1][1]) result.push([...result[0]]);
        if (new Set(result.map(point => point.join(","))).size < 3) throw new Error("Degenerate polygon ring.");
        return result;
      });
    });
    return polygons.length === 1 ? { type: "Polygon", coordinates: polygons[0] } : { type: "MultiPolygon", coordinates: polygons };
  },

  geometryToLeafletPolygons(geometry) {
    const g = this.normalizePolygonGeometry(geometry);
    return (g.type === "Polygon" ? [g.coordinates] : g.coordinates).map(poly => poly.map(ring => ring.map(([x, y]) => [y, x])));
  },

  normalizeStudyGeometry(geometry) {
    if (!geometry || typeof geometry !== "object") throw new Error("Missing study geometry.");
    if (["Polygon", "MultiPolygon"].includes(geometry.type)) return this.normalizePolygonGeometry(geometry);
    const position = point => {
      if (!Array.isArray(point) || !point.slice(0,2).every(n => typeof n === "number" && Number.isFinite(n)) || point.length < 2 || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) throw new Error("Coordinates must be finite WGS84 longitude/latitude values.");
      return point.slice(0,2).map(n => Number(n.toFixed(6)));
    };
    const list = (values, minimum, convert) => {
      if (!Array.isArray(values) || values.length < minimum) throw new Error("Empty or incomplete study geometry.");
      return values.map(convert);
    };
    const line = points => list(points,2,position);
    const c = geometry.coordinates;
    switch (geometry.type) {
      case "Point": return {type:"Point",coordinates:position(c)};
      case "MultiPoint": return {type:"MultiPoint",coordinates:list(c,1,position)};
      case "LineString": return {type:"LineString",coordinates:line(c)};
      case "MultiLineString": return {type:"MultiLineString",coordinates:list(c,1,line)};
      case "GeometryCollection": return {type:"GeometryCollection",geometries:list(geometry.geometries,1,g => this.normalizeStudyGeometry(g))};
      default: throw new Error("Unsupported study geometry: " + geometry.type);
    }
  },

  combineStudyGeometries(geometries) {
    const parts = geometries.flatMap(g => g.type === "GeometryCollection" ? g.geometries : [g]);
    if (!parts.length) throw new Error("No study geometry was found.");
    if (parts.length === 1) return parts[0];
    for (const [single,multi] of [["Point","MultiPoint"],["LineString","MultiLineString"],["Polygon","MultiPolygon"]]) {
      if (parts.every(g => [single,multi].includes(g.type))) return {type:multi,coordinates:parts.flatMap(g => g.type === single ? [g.coordinates] : g.coordinates)};
    }
    return {type:"GeometryCollection",geometries:parts};
  },

  hasProximityGeometry(geometry) {
    return geometry && (geometry.type === "GeometryCollection" ? geometry.geometries.some(g => this.hasProximityGeometry(g)) : ["Point","MultiPoint","LineString","MultiLineString"].includes(geometry.type));
  },

  geometryPositions(geometry) {
    if (geometry.type === "GeometryCollection") return geometry.geometries.flatMap(g => this.geometryPositions(g));
    const depth = {Point:0,MultiPoint:1,LineString:1,MultiLineString:2,Polygon:2,MultiPolygon:3}[geometry.type];
    return depth === 0 ? [geometry.coordinates] : geometry.coordinates.flat(depth - 1);
  },

  // Metres on a mean-radius sphere, never degrees treated as metres. Arc
  // projection is clamped to segment endpoints, including repeated vertices.
  earthRadiusMeters: 6371008.8,
  unitVector([x,y]) { const r=Math.PI/180, lat=y*r, lon=x*r; return [Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)]; },
  vectorDot(a,b) { return a.reduce((s,n,i) => s+n*b[i],0); },
  vectorCross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; },
  vectorAngle(a,b) { return Math.atan2(Math.hypot(...this.vectorCross(a,b)),this.vectorDot(a,b)); },
  arcContains(a,b,q) { return this.vectorAngle(a,q)+this.vectorAngle(q,b) <= this.vectorAngle(a,b)+1e-10; },
  pointSegmentDistanceMeters(point,start,end) {
    const p=this.unitVector(point),a=this.unitVector(start),b=this.unitVector(end),cross=this.vectorCross(a,b),length=Math.hypot(...cross);
    let distance=Math.min(this.vectorAngle(p,a),this.vectorAngle(p,b));
    if(length>1e-14){
      const normal=cross.map(n=>n/length),dot=this.vectorDot(p,normal),projection=p.map((n,i)=>n-dot*normal[i]),size=Math.hypot(...projection);
      if(size>1e-14) for(const sign of [1,-1]){const q=projection.map(n=>sign*n/size);if(this.arcContains(a,b,q))distance=Math.min(distance,this.vectorAngle(p,q));}
    }
    return distance*this.earthRadiusMeters;
  },
  geometryContainsPoint(geometry, point, radius) {
    const c=geometry.coordinates;
    switch(geometry.type){
      case "Point": return this.vectorAngle(this.unitVector(point),this.unitVector(c))*this.earthRadiusMeters<=radius+1e-6;
      case "MultiPoint": return c.some(p=>this.geometryContainsPoint({type:"Point",coordinates:p},point,radius));
      case "LineString": return c.some((p,i)=>i>0 && this.pointSegmentDistanceMeters(point,c[i-1],p)<=radius+1e-6);
      case "MultiLineString": return c.some(line=>this.geometryContainsPoint({type:"LineString",coordinates:line},point,radius));
      case "GeometryCollection": return geometry.geometries.some(g=>this.geometryContainsPoint(g,point,radius));
      default: return this.isPointInMultiPolygon([point[1],point[0]],this.geometryToLeafletPolygons(geometry));
    }
  },
  proximityBounds(geometry, radius) {
    const positions=this.geometryPositions(geometry).map(p=>[...p]);
    let crossesDateline=false;
    const visit=g=>{
      if(g.type==="GeometryCollection"){g.geometries.forEach(visit);return;}
      const lines=g.type==="LineString"?[g.coordinates]:g.type==="MultiLineString"?g.coordinates:[];
      for(const line of lines)for(let i=1;i<line.length;i++){
        const a=this.unitVector(line[i-1]),b=this.unitVector(line[i]);
        if(Math.abs(line[i][0]-line[i-1][0])>180)crossesDateline=true;
        if(this.vectorDot(a,b)<-1+1e-12)throw new Error("Antipodal line endpoints are ambiguous; split the line first.");
        const n=this.vectorCross(a,b),len=Math.hypot(...n);
        if(len<1e-14)continue;
        const unit=n.map(v=>v/len),q=unit.map((v,j)=>(j===2?1:0)-unit[2]*v),qlen=Math.hypot(...q);
        if(qlen<1e-14)continue;
        for(const sign of [1,-1]){
          const extreme=q.map(v=>sign*v/qlen);
          if(this.arcContains(a,b,extreme))positions.push([Math.atan2(extreme[1],extreme[0])*180/Math.PI,Math.asin(Math.max(-1,Math.min(1,extreme[2])))*180/Math.PI]);
        }
      }
    };visit(geometry);
    const raw=this.calculateBounds(positions.map(([x,y])=>[y,x]));
    const delta=radius/this.earthRadiusMeters,latPad=delta*180/Math.PI;
    const reachesPole=Math.max(Math.abs(raw.minLat),Math.abs(raw.maxLat))+latPad>=90;
    const ratio=Math.sin(delta)/Math.cos(Math.max(Math.abs(raw.minLat),Math.abs(raw.maxLat))*Math.PI/180);
    const lonPad=reachesPole?180:Math.asin(Math.min(1,ratio))*180/Math.PI;
    const west=raw.minLng-lonPad,east=raw.maxLng+lonPad;
    crossesDateline ||= reachesPole || west < -180 || east > 180 || raw.maxLng-raw.minLng>180;
    const floor=n=>Math.floor(n*1e6)/1e6,ceil=n=>Math.ceil(n*1e6)/1e6;
    return {bounds:{minLat:floor(Math.max(-90,raw.minLat-latPad)),maxLat:ceil(Math.min(90,raw.maxLat+latPad)),minLng:floor(Math.max(-180,west)),maxLng:ceil(Math.min(180,east))},crossesDateline};
  },

  parsedAreaFromGeometry(geometry, fileName, sourceFormat, bufferMeters = 500) {
    const normalized = this.normalizeStudyGeometry(geometry);
    if (this.hasProximityGeometry(normalized)) {
      if(typeof bufferMeters!=="number" || !Number.isFinite(bufferMeters) || bufferMeters<1 || bufferMeters>50000)throw new Error("Search distance must be between 1 and 50000 metres.");
      const sourceBounds=this.calculateBounds(this.geometryPositions(normalized).map(([x,y])=>[y,x]));
      const expanded=this.proximityBounds(normalized,bufferMeters);
      return {success:true,type:normalized.type,geometry:normalized,sourceBounds,...expanded,bufferMeters,searchMode:"proximity",distanceModel:"sphere-6371008.8",crs:"EPSG:4326",source:{kind:"import",format:sourceFormat,fileName},name:fileName};
    }
    if(normalized.type==="GeometryCollection")return this.parsedAreaFromGeometry(this.combineStudyGeometries(normalized.geometries),fileName,sourceFormat,bufferMeters);
    const parts = this.geometryToLeafletPolygons(normalized);
    const points = parts.flat(2);
    const crossesDateline = parts.some(poly => poly.some(ring => ring.some((point, index) => index > 0 && Math.abs(point[1] - ring[index - 1][1]) > 180)));
    return { success: true, type: normalized.type, geometry: normalized,
      coordinates: parts[0][0], polygon: parts[0][0],
      multiPolygon: parts.map(poly => ({ outer: poly[0], holes: poly.slice(1) })),
      allPolygons: parts.map(poly => poly[0]), holes: parts.length === 1 ? parts[0].slice(1) : null,
      bounds: this.calculateBounds(points), crs: "EPSG:4326", crossesDateline,
      source: { kind: "import", format: sourceFormat, fileName }, name: fileName };
  },

  groupPolygonRings(rings) {
    const valid = rings.filter(ring => ring && ring.length >= 3);
    const areaOf = ring => Math.abs(ring.reduce((area, point, index) => {
      const next = ring[(index + 1) % ring.length];
      return area + point[1] * next[0] - next[1] * point[0];
    }, 0));
    const sizes = valid.map(areaOf);
    const parents = valid.map((ring, index) => {
      let parent = -1;
      valid.forEach((candidate, other) => {
        if (index !== other && sizes[other] > sizes[index] && this.isPointInPolygon(ring[0], candidate) && (parent < 0 || sizes[other] < sizes[parent])) parent = other;
      });
      return parent;
    });
    const depth = index => { let d = 0; for (let parent = parents[index]; parent >= 0; parent = parents[parent]) d++; return d; };
    const output = [];
    valid.forEach((ring, index) => {
      if (depth(index) % 2 === 0) output.push({ outer: ring, holes: valid.filter((_, child) => parents[child] === index) });
    });
    return output;
  },
  /**
   * تحويل أي مدخل (Buffer أو Uint8Array أو ArrayBuffer) إلى ArrayBuffer حقيقي ونقي بأمان
   */
  toArrayBuffer(input) {
    if (!input) return new ArrayBuffer(0);
    if (input instanceof ArrayBuffer) return input;
    if (ArrayBuffer.isView(input) || (input.buffer && input.buffer instanceof ArrayBuffer)) {
      return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    }
    return input;
  },

  /**
   * الدالة الموحدة الرئيسية لقراءة أي ملف جغرافي يرفعه المستخدم
   */
  async parseSpatialFile(file) {
    if (!file) throw new Error("لم يتم اختيار أي ملف!");
    const fileName = file.name || "منطقة دراسة";
    const dotIdx = fileName.lastIndexOf(".");
    const ext = dotIdx !== -1 ? fileName.slice(dotIdx).toLowerCase() : "";

    try {
      if(Number.isFinite(file.size) && file.size>64*1024*1024)throw new Error("Import file size exceeds 64 MiB.");
      if (ext === ".kml") {
        const text = await file.text();
        return this.parseKML(text, fileName);
      } else if (ext === ".geojson" || ext === ".json") {
        const text = await file.text();
        return this.parseGeoJSON(text, fileName);
      } else if (ext === ".kmz") {
        const buffer = await file.arrayBuffer();
        return await this.parseKMZ(buffer, fileName);
      } else if (ext === ".shp") {
        const buffer = await file.arrayBuffer();
        return this.parseShapefile(buffer, fileName);
      } else if (ext === ".zip") {
        const buffer = await file.arrayBuffer();
        return await this.parseZippedFile(buffer, fileName);
      } else {
        throw new Error(
          "تنسيق الملف غير مدعوم. يرجى رفع ملف بصيغة Shapefile (.zip أو .shp)، أو KML (.kml)، أو KMZ (.kmz)، أو GeoJSON (.geojson, .json)."
        );
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * قراءة واستخراج الإحداثيات من نصوص ملفات KML بمرونة كاملة
   */
  parseKML(kmlText, fileName = "KML") {
    try {
      if (typeof kmlText !== "string" || !kmlText.trim()) throw new Error("Empty KML document.");
      if (/<!DOCTYPE|<!ENTITY/i.test(kmlText)) throw new Error("XML entities and DTDs are not supported.");
      const polygons = [];
      const parseCoordinates = text => text.trim().split(/\s+/).filter(Boolean).map(tuple => {
        const xy=tuple.split(",").slice(0,2);
        if(xy.length!==2 || xy.some(n=>!n.trim() || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(n)))throw new Error("Invalid KML coordinates.");
        return xy.map(Number);
      });
      // Scope each ring to its Polygon; never flatten inner rings into exteriors.
      const polygonPattern = /<(?:[\w.-]+:)?Polygon\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?Polygon\s*>/gi;
      let match;
      while ((match = polygonPattern.exec(kmlText))) {
        const content = match[1];
        const outer = content.match(/<(?:[\w.-]+:)?outerBoundaryIs\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?outerBoundaryIs\s*>/i);
        const coordinatesOf = value => {
          const coords = value.match(/<(?:[\w.-]+:)?coordinates\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?coordinates\s*>/i);
          if (!coords) throw new Error("KML polygon ring is missing coordinates.");
          return parseCoordinates(coords[1]);
        };
        if (!outer) throw new Error("KML polygon is missing its exterior boundary.");
        const rings = [coordinatesOf(outer[1])];
        const innerPattern = /<(?:[\w.-]+:)?innerBoundaryIs\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?innerBoundaryIs\s*>/gi;
        let inner;
        while ((inner = innerPattern.exec(content))) rings.push(coordinatesOf(inner[1]));
        polygons.push(rings);
      }
      const geometries = polygons.length ? [{type:"MultiPolygon",coordinates:polygons}] : [];
      for(const type of ["Point","LineString"]){
        const pattern=new RegExp("<(?:[\\w.-]+:)?"+type+"\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?"+type+"\\s*>","gi");
        for(const item of kmlText.matchAll(pattern)){
          const coords=item[1].match(/<(?:[\w.-]+:)?coordinates\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?coordinates\s*>/i);
          if(!coords)throw new Error("KML geometry is missing coordinates.");
          const points=parseCoordinates(coords[1]);
          if(type==="Point" && points.length!==1)throw new Error("KML Point requires one position.");
          geometries.push({type,coordinates:type==="Point"?points[0]:points});
        }
      }
      if (!geometries.length) {
        const boxes = kmlText.matchAll(/<(?:[\w.-]+:)?LatLon(?:Alt)?Box\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?LatLon(?:Alt)?Box\s*>/gi);
        for (const box of boxes) {
          const value = key => Number((box[1].match(new RegExp("<" + key + ">([\\s\\S]*?)</" + key + ">", "i")) || [])[1]);
          const n = value("north"), e = value("east"), w = value("west"), south = value("south");
          if (![n,e,w,south].every(Number.isFinite)) throw new Error("Invalid KML bounds.");
          geometries.push({type:"Polygon",coordinates:[[[w,south],[e,south],[e,n],[w,n],[w,south]]]});
        }
      }
      return this.parsedAreaFromGeometry(this.combineStudyGeometries(geometries), fileName, "KML");
    } catch (error) { return { success: false, error: error.message }; }
  },

  /**
   * قراءة ملفات KMZ (أرشيف مضغوط يحتوي على doc.kml)
   */
  async parseKMZ(buffer, fileName = "ملف KMZ") {
    try {
      buffer = this.toArrayBuffer(buffer);
      const files = await this.unzipFiles(buffer);
      // البحث عن أي ملف .kml داخل الأرشيف
      let kmlName = Object.keys(files).find((k) => k.toLowerCase().endsWith(".kml"));
      if (!kmlName) {
        throw new Error("لم يتم العثور على أي ملف .kml داخل أرشيف KMZ المرفوع!");
      }

      const kmlBytes = files[kmlName];
      const kmlText = new TextDecoder("utf-8").decode(kmlBytes);
      return this.parseKML(kmlText, fileName);
    } catch (err) {
      return { success: false, error: "تعذر فك ضغط وقراءة ملف KMZ: " + err.message };
    }
  },

  /**
   * قراءة واستخراج الإحداثيات من ملفات GeoJSON
   */
  parseGeoJSON(geoJsonText, fileName = "GeoJSON") {
    try {
      const data = typeof geoJsonText === "string" ? JSON.parse(geoJsonText) : geoJsonText;
      const geometries = [];
      if (data.crs && !/4326|CRS84/i.test(JSON.stringify(data.crs))) throw new Error("Reproject the file to WGS84 (EPSG:4326) before importing.");
      const visit = value => {
        if (!value || typeof value !== "object") throw new Error("Invalid GeoJSON geometry.");
        if(value.crs && !/4326|CRS84/i.test(JSON.stringify(value.crs)))throw new Error("Reproject the file to WGS84 (EPSG:4326) before importing.");
        if (value.type === "FeatureCollection") return (value.features || []).forEach(visit);
        if (value.type === "Feature") return value.geometry===null?undefined:visit(value.geometry);
        if (value.type === "GeometryCollection") return (value.geometries || []).forEach(visit);
        geometries.push(this.normalizeStudyGeometry(value));
      };
      visit(data);
      return this.parsedAreaFromGeometry(this.combineStudyGeometries(geometries), fileName, "GeoJSON");
    } catch (error) { return { success: false, error: error.message }; }
  },

  /**
   * قراءة ملف ESRI Shapefile ثنائي (.shp)
   */
  parseShapefile(buffer, fileName = "ملف Shapefile") {
    try {
      buffer = this.toArrayBuffer(buffer);
      if (!buffer || buffer.byteLength < 100) {
        throw new Error("حجم الملف أصغر من أن يكون ملف Shapefile صالحاً!");
      }

      const view = new DataView(buffer);
      const fileCode = view.getInt32(0, false); // Big Endian 9994
      if (fileCode !== 9994) {
        throw new Error(`ملف Shapefile غير صالح (رمز البداية ليس 9994 بل ${fileCode})`);
      }

      const shapeType = view.getInt32(32, true);
      const types = [1,3,5,8,11,13,15,18,21,23,25,28];
      if (!types.includes(shapeType)) throw new Error("Unsupported Shapefile geometry type.");
      const declaredBytes=view.getInt32(24,false)*2;
      if(view.getInt32(28,true)!==1000 || declaredBytes!==buffer.byteLength)throw new Error("Invalid or truncated Shapefile header.");
      let offset=100;
      const geometries=[];
      while(offset<buffer.byteLength){
        if(offset+8>buffer.byteLength)throw new Error("Truncated Shapefile record header.");
        const size=view.getInt32(offset+4,false)*2,start=offset+8,end=start+size;
        if(size<4 || end>buffer.byteLength)throw new Error("Truncated Shapefile record.");
        const type=view.getInt32(start,true);
        offset=end;
        if(type===0)continue;
        if(type!==shapeType)throw new Error("Shapefile record type does not match its header.");
        const readPoint=at=>{
          if(at+16>end)throw new Error("Truncated Shapefile coordinates.");
          return [view.getFloat64(at,true),view.getFloat64(at+8,true)];
        };
        if([1,11,21].includes(type)){
          geometries.push({type:"Point",coordinates:readPoint(start+4)});
          continue;
        }
        if(size<40)throw new Error("Truncated Shapefile bounding box.");
        if([8,18,28].includes(type)){
          const count=view.getInt32(start+36,true);
          if(count<1 || start+40+count*16>end)throw new Error("Invalid Shapefile point count.");
          geometries.push({type:"MultiPoint",coordinates:Array.from({length:count},(_,i)=>readPoint(start+40+i*16))});
          continue;
        }
        if(size<44)throw new Error("Truncated Shapefile parts.");
        const parts=view.getInt32(start+36,true),count=view.getInt32(start+40,true),pointsAt=start+44+parts*4;
        if(parts<1 || count<parts || pointsAt+count*16>end)throw new Error("Invalid Shapefile part or point count.");
        const indices=Array.from({length:parts},(_,i)=>view.getInt32(start+44+i*4,true));
        if(indices[0]!==0 || indices.some((n,i)=>n<0||n>=count||(i>0&&n<=indices[i-1])))throw new Error("Invalid Shapefile part index.");
        indices.push(count);
        const paths=indices.slice(0,-1).map((n,i)=>Array.from({length:indices[i+1]-n},(_,j)=>readPoint(pointsAt+(n+j)*16)));
        if([5,15,25].includes(type)){
          const rings=paths.map(ring=>ring.map(([x,y])=>[y,x]));
          const grouped=this.groupPolygonRings(rings);
          if(grouped.length!==0 && paths.some(ring=>ring.length<4))throw new Error("Incomplete Shapefile polygon.");
          geometries.push({type:"MultiPolygon",coordinates:grouped.map(poly=>[poly.outer,...poly.holes].map(ring=>ring.map(([y,x])=>[x,y])))});
        }else geometries.push({type:"MultiLineString",coordinates:paths});
      }
      return this.parsedAreaFromGeometry(this.combineStudyGeometries(geometries),fileName,"Shapefile");
    } catch (err) {
      return { success: false, error: "تعذر قراءة ملف Shapefile: " + err.message };
    }
  },

  /**
   * قراءة ملف مضغوط (.zip) وفحص ما إذا كان يحتوي على Shapefile أو KML أو GeoJSON
   */
  async parseZippedFile(buffer, fileName = "أرشيف مضغوط") {
    try {
      buffer = this.toArrayBuffer(buffer);
      const files = await this.unzipFiles(buffer);
      const fileNames = Object.keys(files);

      // 1. البحث عن ملف .shp
      const shpName = fileNames.find((k) => k.toLowerCase().endsWith(".shp"));
      if (shpName) {
        const shpBuffer = files[shpName].buffer.slice(
          files[shpName].byteOffset,
          files[shpName].byteOffset + files[shpName].byteLength
        );
        const prjName=fileNames.find(k=>k.toLowerCase()===shpName.replace(/\.shp$/i,".prj").toLowerCase());
        if(prjName){
          const wkt=new TextDecoder("utf-8").decode(files[prjName]);
          if(!/^\s*(GEOGCS|GEOGCRS|GEODCRS)\s*\[/i.test(wkt) || !/WGS[_ ]?(?:19)?84|WGS_1984|WGS 84/i.test(wkt) || /PROJCS|PROJCRS|\bGRAD\b/i.test(wkt))throw new Error("Reproject the Shapefile to WGS84 (EPSG:4326).");
          const units=[...wkt.matchAll(/(?:ANGLEUNIT|UNIT)\s*\[\s*"[^"]+"\s*,\s*([+\d.eE-]+)/gi)];
          const meridian=wkt.match(/PRIMEM\s*\[\s*"[^"]+"\s*,\s*([+\d.eE-]+)/i);
          if(!units.length || Math.abs(Number(units[units.length-1][1])-Math.PI/180)>1e-12 || !meridian || Number(meridian[1])!==0)throw new Error("WGS84 (EPSG:4326) longitude/latitude in degrees is required.");
        }
        return this.parseShapefile(shpBuffer, `${fileName} (${shpName})`);
      }

      // 2. البحث عن ملف .kml
      const kmlName = fileNames.find((k) => k.toLowerCase().endsWith(".kml"));
      if (kmlName) {
        const kmlText = new TextDecoder("utf-8").decode(files[kmlName]);
        return this.parseKML(kmlText, `${fileName} (${kmlName})`);
      }

      // 3. البحث عن ملف .geojson أو .json
      const jsonName = fileNames.find((k) => k.toLowerCase().endsWith(".geojson") || k.toLowerCase().endsWith(".json"));
      if (jsonName) {
        const jsonText = new TextDecoder("utf-8").decode(files[jsonName]);
        return this.parseGeoJSON(jsonText, `${fileName} (${jsonName})`);
      }

      throw new Error("لم يتم العثور على ملف .shp أو .kml أو .geojson داخل الأرشيف المضغوط!");
    } catch (err) {
      return { success: false, error: "تعذر فك ضغط الملف: " + err.message };
    }
  },

  /**
   * فك ضغط ملفات ZIP / KMZ بمرونة كاملة عبر قراءة الـ Central Directory
   * لضمان التعامل الآمن مع ملفات Google Earth و ArcGIS و QGIS حتى لو كان compSize = 0 في الترويسة المحلية
   */
  async unzipFiles(buffer) {
    buffer = this.toArrayBuffer(buffer);
    const MAX_BYTES = 64 * 1024 * 1024, MAX_FILES = 512;
    if (buffer.byteLength < 22 || buffer.byteLength > MAX_BYTES) throw new Error("Archive size is invalid or exceeds 64 MiB.");
    const view = new DataView(buffer), files = Object.create(null), namesSeen = new Set();
    const crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index++) { let value = index; for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1; crcTable[index] = value; }
    const crc32 = bytes => { let value = 0xffffffff; for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; };
    let eocd = -1;
    for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
      if (view.getUint32(i,true) === 0x06054b50 && i + 22 + view.getUint16(i+20,true) === buffer.byteLength) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("ZIP central directory is missing.");
    if (view.getUint16(eocd+4,true) || view.getUint16(eocd+6,true)) throw new Error("Multipart ZIP archives are not supported.");
    const count = view.getUint16(eocd+10,true), cdSize = view.getUint32(eocd+12,true), cdOffset = view.getUint32(eocd+16,true);
    if (!count || count > MAX_FILES || cdOffset + cdSize > eocd) throw new Error("Invalid archive entry count or directory.");
    let offset = cdOffset, total = 0;
    for (let index=0; index<count; index++) {
      if (offset+46 > cdOffset+cdSize || view.getUint32(offset,true)!==0x02014b50) throw new Error("Invalid ZIP directory entry.");
      const flags = view.getUint16(offset+8,true), method = view.getUint16(offset+10,true), compressed = view.getUint32(offset+20,true), size = view.getUint32(offset+24,true);
      const nameLength = view.getUint16(offset+28,true), extra = view.getUint16(offset+30,true), comment = view.getUint16(offset+32,true), local = view.getUint32(offset+42,true);
      const next = offset + 46 + nameLength + extra + comment;
      if (next > cdOffset+cdSize) throw new Error("ZIP member name exceeds directory bounds.");
      const name = new TextDecoder("utf-8",{fatal:true}).decode(new Uint8Array(buffer,offset+46,nameLength));
      if (!name || name.includes("\\") || name.includes("\0") || name.startsWith("/") || /^[a-z]:/i.test(name) || name.split("/").some(part=>part==="..") || namesSeen.has(name.toLowerCase())) throw new Error("Unsafe or duplicate archive member name.");
      namesSeen.add(name.toLowerCase());
      if (flags & 1 || ![0,8].includes(method)) throw new Error("Encrypted or unsupported ZIP compression.");
      total += size;
      if (size > MAX_BYTES || total > MAX_BYTES || size > Math.max(1024*1024,compressed*200)) throw new Error("Archive decompression limit exceeded.");
      if (local + 30 > cdOffset || view.getUint32(local,true)!==0x04034b50) throw new Error("Invalid ZIP local header.");
      const localNameLength = view.getUint16(local+26,true);
      if (local + 30 + localNameLength > cdOffset || new TextDecoder("utf-8", {fatal:true}).decode(new Uint8Array(buffer,local+30,localNameLength)) !== name) throw new Error("ZIP local and central paths differ.");
      const dataOffset = local + 30 + view.getUint16(local+26,true) + view.getUint16(local+28,true);
      if (dataOffset + compressed > cdOffset) throw new Error("ZIP member exceeds archive bounds.");
      const raw = new Uint8Array(buffer,dataOffset,compressed);
      if (!name.endsWith("/")) {
        const data = method === 0 ? raw : await this.decompressDeflate(raw, Math.min(MAX_BYTES,size));
        if (!data || data.byteLength !== size) throw new Error("ZIP decompression size mismatch.");
        if (crc32(data) !== view.getUint32(offset+16,true)) throw new Error("ZIP member checksum mismatch.");
        files[name] = data;
      }
      offset = next;
    }
    return files;
  },

  /**
   * فك ضغط بيانات Deflate باستخدام DecompressionStream المدمجة في كروم (أو zlib في بيئة Node)
   */
  async decompressDeflate(rawBytes, maxBytes = 64 * 1024 * 1024) {
    // 1. بيئة المتصفح (Web API DecompressionStream)
    if (typeof DecompressionStream !== "undefined") {
      try {
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        writer.write(rawBytes);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (chunks.reduce((sum, chunk) => sum + chunk.length, 0) + value.length > maxBytes) { await reader.cancel(); throw new Error("Archive decompression limit exceeded."); }
          chunks.push(value);
        }
        const total = chunks.reduce((acc, c) => acc + c.length, 0);
        const out = new Uint8Array(total);
        let o = 0;
        for (const c of chunks) {
          out.set(c, o);
          o += c.length;
        }
        return out;
      } catch (err) {
        // تجربة صيغة deflate العادية في حال الفشل
        try {
          const ds = new DecompressionStream("deflate");
          const writer = ds.writable.getWriter();
          writer.write(rawBytes);
          writer.close();
          const reader = ds.readable.getReader();
          const chunks = [];
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (chunks.reduce((sum, chunk) => sum + chunk.length, 0) + value.length > maxBytes) { await reader.cancel(); throw new Error("Archive decompression limit exceeded."); }
          chunks.push(value);
          }
          const total = chunks.reduce((acc, c) => acc + c.length, 0);
          const out = new Uint8Array(total);
          let o = 0;
          for (const c of chunks) {
            out.set(c, o);
            o += c.length;
          }
          return out;
        } catch (e2) {
          console.warn("[Decompression error]:", e2);
          return null;
        }
      }
    }

    // 2. بيئة Node.js للاختبارات البرمجية
    if (typeof require !== "undefined") {
      try {
        const zlib = require("zlib");
        return zlib.inflateRawSync(rawBytes, { maxOutputLength: maxBytes });
      } catch (e) {
        try {
          const zlib = require("zlib");
          return zlib.inflateSync(rawBytes, { maxOutputLength: maxBytes });
        } catch (e2) {
          return null;
        }
      }
    }

    return null;
  },

  /**
   * حساب مستطيل الإحاطة Bounding Box لمجموعة نقاط
   */
  calculateBounds(points) {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    points.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    return {
      minLat: Number(minLat.toFixed(6)),
      maxLat: Number(maxLat.toFixed(6)),
      minLng: Number(minLng.toFixed(6)),
      maxLng: Number(maxLng.toFixed(6))
    };
  },

  /**
   * توليد شبكة متصلة متداخلة لأي Bounding Box في العالم
   */
  generateMeshForBounds(bounds, rows, cols, overlapPercent = 0.05, filterPolygon = null) {
    if (!bounds || bounds.minLat === undefined || bounds.maxLat === undefined ||
        bounds.minLng === undefined || bounds.maxLng === undefined) {
      throw new Error("حدود النطاق الجغرافي غير صالحة لتوليد الشبكة!");
    }

    if (![bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng].every(Number.isFinite) || bounds.minLat >= bounds.maxLat || bounds.minLng >= bounds.maxLng || bounds.minLat < -90 || bounds.maxLat > 90 || bounds.minLng < -180 || bounds.maxLng > 180) throw new Error("Invalid WGS84 study bounds.");
    if (filterPolygon && filterPolygon.crossesDateline) throw new Error("Split study areas at the international date line before generating a grid.");
    const validRows = Math.max(1, Math.min(400, parseInt(rows) || 5));
    const validCols = Math.max(1, Math.min(400, parseInt(cols) || 5));
    const overlap = Number.isFinite(overlapPercent) ? Math.max(0, Math.min(0.5, overlapPercent)) : 0.05;

    const baseLatStep = (bounds.maxLat - bounds.minLat) / validRows;
    const baseLngStep = (bounds.maxLng - bounds.minLng) / validCols;
    if(Math.min(baseLatStep,baseLngStep)<1e-6-1e-12)throw new Error("Grid resolution is below six-decimal coordinate precision; reduce rows or columns.");

    const cells = [];
    let counter = 0;
    const polyBounds = filterPolygon && Array.isArray(filterPolygon) && filterPolygon.length >= 3
      ? this.calculateBounds(filterPolygon)
      : null;

    for (let r = 0; r < validRows; r++) {
      // نمط المسح الزجزاجي/الثعباني (Boustrophedon / Serpentine Scanning Pattern):
      // الصف الزوجي يمسح من الغرب إلى الشرق، والصف الفردي يمسح من الشرق إلى الغرب
      // هذا يمنع القفزات الكبيرة لكاميرا خرائط جوجل ويسرع الاستخراج ويحافظ على ثبات الأداء
      const isReverseRow = (r % 2 === 1);
      for (let cStep = 0; cStep < validCols; cStep++) {
        const c = isReverseRow ? (validCols - 1 - cStep) : cStep;
        const minLatRaw = bounds.minLat + r * baseLatStep;
        const maxLatRaw = minLatRaw + baseLatStep;
        const minLngRaw = bounds.minLng + c * baseLngStep;
        const maxLngRaw = minLngRaw + baseLngStep;

        const latExtra = baseLatStep * overlap;
        const lngExtra = baseLngStep * overlap;

        const minLat = Number(Math.max(bounds.minLat, minLatRaw - latExtra).toFixed(6));
        const maxLat = Number(Math.min(bounds.maxLat, maxLatRaw + latExtra).toFixed(6));
        const minLng = Number(Math.max(bounds.minLng, minLngRaw - lngExtra).toFixed(6));
        const maxLng = Number(Math.min(bounds.maxLng, maxLngRaw + lngExtra).toFixed(6));

        const centerLat = Number(((minLat + maxLat) / 2).toFixed(6));
        const centerLng = Number(((minLng + maxLng) / 2).toFixed(6));

        const cell = {
          minLat, maxLat, minLng, maxLng,
          centerLat, centerLng,
          bounds: { minLat, maxLat, minLng, maxLng }
        };

        // إذا كان هناك مضلع لمنطقة دراسة، نستبعد الخلايا البعيدة تماماً
        if (filterPolygon) {
          const intersects = Array.isArray(filterPolygon) ? this.doesCellIntersectPolygon(cell, filterPolygon, polyBounds) : this.doesCellIntersectStudyArea(cell, filterPolygon);
          if (!intersects) {
            continue;
          }
        }

        cells.push({
          id: `cell_${counter + 1}`,
          row: r, col: c,
          ownerExtent: { minLat: Number(minLatRaw.toFixed(6)), maxLat: Number(maxLatRaw.toFixed(6)), minLng: Number(minLngRaw.toFixed(6)), maxLng: Number(maxLngRaw.toFixed(6)) },
          searchExtent: { minLat, maxLat, minLng, maxLng },
          geometry: { type: "Polygon", coordinates: [[[minLng,minLat],[maxLng,minLat],[maxLng,maxLat],[minLng,maxLat],[minLng,minLat]]] },
          clipGeometry: filterPolygon && filterPolygon.geometry || null,
          index: counter,
          name: `مربع (${r + 1}, ${c + 1})`,
          centerLat,
          centerLng,
          bounds: { minLat, maxLat, minLng, maxLng },
          status: "pending",
          itemsFound: 0
        });
        counter++;
      }
    }

    // إذا تم استبعاد كافة الخلايا بسبب مضلع غير منتظم، نضيف على الأقل خلية تغطي النطاق كاملاً
    if (cells.length === 0 && !filterPolygon) {
      cells.push({
        id: "cell_1",
        index: 0,
        name: "مربع منطقة الدراسة",
        centerLat: Number(((bounds.minLat + bounds.maxLat) / 2).toFixed(6)),
        centerLng: Number(((bounds.minLng + bounds.maxLng) / 2).toFixed(6)),
        bounds: { ...bounds },
        status: "pending",
        itemsFound: 0
      });
    }

    return cells;
  },

  /**
   * التحقق مما إذا كانت الخلية تتقاطع مع مضلع منطقة الدراسة
   * محسنة بالأداء مع فحص سريع لمستطيل الإحاطة (AABB Quick-Reject)
   */
  doesCellIntersectPolygon(cell, polygon, polyBounds = null) {
    if (!cell || !polygon || polygon.length < 3) return true;

    // استخراج الحدود بأمان تام سواء كانت مباشرة أو داخل خاصية bounds
    const b = cell.bounds || cell;
    if (b.minLat === undefined || b.maxLat === undefined || b.minLng === undefined || b.maxLng === undefined) {
      return true;
    }

    // 0. فحص الاستبعاد السريع (AABB Bounding Box Quick Reject)
    const pb = polyBounds || this.calculateBounds(polygon);
    if (
      b.maxLat < pb.minLat ||
      b.minLat > pb.maxLat ||
      b.maxLng < pb.minLng ||
      b.minLng > pb.maxLng
    ) {
      return false; // الخلية خارج النطاق المحيط بالمضلع تماماً، نرفضها فوراً دون أي عمليات حسابية معقدة
    }

    const centerLat = cell.centerLat !== undefined ? cell.centerLat : (b.minLat + b.maxLat) / 2;
    const centerLng = cell.centerLng !== undefined ? cell.centerLng : (b.minLng + b.maxLng) / 2;

    // 1. فحص إذا كان المركز داخل المضلع
    if (this.isPointInPolygon([centerLat, centerLng], polygon)) {
      return true;
    }

    // 2. فحص أركان الخلية الأربعة
    const corners = [
      [b.minLat, b.minLng],
      [b.minLat, b.maxLng],
      [b.maxLat, b.minLng],
      [b.maxLat, b.maxLng]
    ];

    for (const pt of corners) {
      if (this.isPointInPolygon(pt, polygon)) {
        return true;
      }
    }

    // 3. فحص إذا كانت أي نقطة من المضلع داخل حدود الخلية
    for (const pt of polygon) {
      const pLat = pt[0];
      const pLng = pt[1];
      if (
        pLat >= b.minLat &&
        pLat <= b.maxLat &&
        pLng >= b.minLng &&
        pLng <= b.maxLng
      ) {
        return true;
      }
    }

    // 4. فحص تقاطع حواف المضلع مع أضلاع الخلية
    if (this.doPolygonEdgesIntersectBox(polygon, b)) {
      return true;
    }

    return false;
  },

  doesCellIntersectStudyArea(cell, area) {
    const b = cell.bounds || cell;
    let parts;
    if (this.hasProximityGeometry(area.geometry)) return true; // Keep the complete rectangular search lattice.\n    if (area.geometry) parts = this.geometryToLeafletPolygons(area.geometry);
    else if (area.multiPolygon) parts = area.multiPolygon.map(poly => poly.outer ? [poly.outer, ...(poly.holes || [])] : (typeof poly[0][0] === "number" ? [poly] : poly));
    else if (area.polygon) parts = [[area.polygon, ...(area.holes || [])]];
    else return true;
    const samples = [[b.minLat,b.minLng],[b.minLat,b.maxLng],[b.maxLat,b.minLng],[b.maxLat,b.maxLng],[(b.minLat+b.maxLat)/2,(b.minLng+b.maxLng)/2]];
    return parts.some(poly => {
      if (samples.some(point => this.isPointInPolygon(point, poly[0], poly.slice(1)))) return true;
      // A small island wholly inside the cell, or a polygon boundary crossing it.
      if (poly[0].some(([lat,lng]) => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng)) return true;
      return poly.some(ring => this.doPolygonEdgesIntersectBox(ring, b));
    });
  },

  /**
   * خوارزمية Ray-Casting لفحص وقوع النقطة داخل مضلع (مع دعم الثقوب الداخلية Holes)
   */
  isPointInPolygon(point, vs, holes = null) {
    if (!point || !vs || vs.length < 3) return false;
    const x = Array.isArray(point) ? point[0] : (point.lat !== undefined ? point.lat : point.y); // lat
    const y = Array.isArray(point) ? point[1] : (point.lng !== undefined ? point.lng : point.x); // lng

    const rayCast = (sourceRing) => {
      // Unwrap longitudes continuously around the ring for date-line geometry.
      let previous = sourceRing[0][1];
      const ring = sourceRing.map(([lat, lng], index) => {
        let unwrapped = lng;
        if (index) {
          while (unwrapped - previous > 180) unwrapped -= 360;
          while (unwrapped - previous < -180) unwrapped += 360;
        }
        previous = unwrapped;
        return [lat, unwrapped];
      });
      const extent = ring.reduce((out, point) => [Math.min(out[0], point[1]), Math.max(out[1], point[1])], [Infinity, -Infinity]);
      const center = (extent[0] + extent[1]) / 2;
      const queryY = y + 360 * Math.round((center - y) / 360);
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        const cross = (x - xi) * (yj - yi) - (queryY - yi) * (xj - xi);
        const length = Math.hypot(xj-xi,yj-yi);
        if (length > 0 && Math.abs(cross) <= 1e-10 * length && x >= Math.min(xi,xj)-1e-10 && x <= Math.max(xi,xj)+1e-10 && queryY >= Math.min(yi,yj)-1e-10 && queryY <= Math.max(yi,yj)+1e-10) return true;
        const intersect = yi > queryY !== yj > queryY && x < ((xj - xi) * (queryY - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };

    // 1. فحص المضلع الخارجي (Outer Ring)
    const inOuter = rayCast(vs);
    if (!inOuter) return false;

    // 2. فحص الثقوب الداخلية (Polygon Holes): إذا وقعت النقطة داخل أي ثقب تُعتبر خارج المضلع
    if (holes && Array.isArray(holes) && holes.length > 0) {
      for (const hole of holes) {
        if (hole && hole.length >= 3 && rayCast(hole)) {
          return false;
        }
      }
    }

    return true;
  },

  /**
   * فحص وقوع النقطة داخل مضلعات متعددة منفصلة (MultiPolygon)
   */
  isPointInMultiPolygon(point, multiPolygons) {
    if (!point || !multiPolygons || !Array.isArray(multiPolygons)) return false;
    for (const poly of multiPolygons) {
      if (!poly) continue;
      if (Array.isArray(poly) && poly.length >= 3 && typeof poly[0][0] === "number") {
        if (this.isPointInPolygon(point, poly)) return true;
      } else if (poly.outer) {
        if (this.isPointInPolygon(point, poly.outer, poly.holes)) return true;
      } else if (Array.isArray(poly) && poly.length > 0) {
        const outer = poly[0];
        const holes = poly.slice(1);
        if (this.isPointInPolygon(point, outer, holes)) return true;
      }
    }
    return false;
  },

  /**
   * تحديد الخلية المالكة الحقيقية للمعلم جغرافياً (Spatial Cell Ownership)
   * يحل مشكلة P0-01 جذرياً: النقطة تسند إلى الخلية التي تحويها هندسياً وليس لخلية الاكتشاف
   */
  findOwnerCell(lngX, latY, cells) {
    if (lngX == null || latY == null || !Array.isArray(cells) || cells.length === 0) {
      return null;
    }
    const x = Number(lngX); // Longitude
    const y = Number(latY); // Latitude
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 180 || Math.abs(y) > 90) return null;

    const candidates = [];
    for (const cell of cells) {
      const b = cell.bounds || cell;
      if (y >= b.minLat && y <= b.maxLat && x >= b.minLng && x <= b.maxLng) {
        const cLat = cell.centerLat !== undefined ? cell.centerLat : (b.minLat + b.maxLat) / 2;
        const cLng = cell.centerLng !== undefined ? cell.centerLng : (b.minLng + b.maxLng) / 2;
        const distSq = (y - cLat) * (y - cLat) + (x - cLng) * (x - cLng);
        candidates.push({ cell, distSq });
      }
    }

    if (candidates.length === 1) {
      return candidates[0].cell;
    }

    if (candidates.length > 1) {
      // عند التداخل (Overlap): نختار الخلية ذات المركز الأقرب هندسياً
      candidates.sort((a, b) => a.distSq - b.distSq || String(a.cell.id || a.cell.cellId).localeCompare(String(b.cell.id || b.cell.cellId)));
      return candidates[0].cell;
    }

    return null;
  },

  /**
   * فحص وقوع النقطة داخل منطقة الدراسة المعتمدة (BBox أو Polygon أو MultiPolygon مع الثقوب)
   */
  isPointInStudyArea(lngX, latY, studyArea) {
    if (lngX == null || latY == null || !studyArea) return true;
    const x = Number(lngX);
    const y = Number(latY);
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 180 || Math.abs(y) > 90) return false;
    if (studyArea.geometry) {
      const b=studyArea.bounds;
      if(studyArea.searchMode==="proximity" && b && !studyArea.crossesDateline && (x<b.minLng||x>b.maxLng||y<b.minLat||y>b.maxLat))return false;
      return this.geometryContainsPoint(studyArea.geometry,[x,y],studyArea.bufferMeters || 500);
    }

    // 1. فحص المضلعات المتعددة أو المضلع ذو الثقوب إذا توفرت
    if (studyArea.multiPolygon && Array.isArray(studyArea.multiPolygon)) {
      return this.isPointInMultiPolygon([y, x], studyArea.multiPolygon);
    }
    if (studyArea.allPolygons && Array.isArray(studyArea.allPolygons) && studyArea.allPolygons.length > 1) {
      return this.isPointInMultiPolygon([y, x], studyArea.allPolygons);
    }
    if (studyArea.polygon && Array.isArray(studyArea.polygon) && studyArea.polygon.length >= 3) {
      return this.isPointInPolygon([y, x], studyArea.polygon, studyArea.holes || null);
    }
    if (studyArea.coordinates && Array.isArray(studyArea.coordinates) && studyArea.coordinates.length >= 3) {
      return this.isPointInPolygon([y, x], studyArea.coordinates, studyArea.holes || null);
    }

    // 2. فحص مستطيل الإحاطة (Bounding Box) بهامش كارتوجرافي دقيق (~50م)
    const b = studyArea.bounds || (studyArea.minLat !== undefined ? studyArea : null);
    if (b) {
      const margin = 0;
      return (
        y >= b.minLat - margin &&
        y <= b.maxLat + margin &&
        x >= b.minLng - margin &&
        x <= b.maxLng + margin
      );
    }

    return true;
  },

  /**
   * حساب الأبعاد المترية الحقيقية للشبكة والمساحة الإجمالية
   */
  calculateGridDimensions(bounds, rows, cols) {
    if (!bounds) return null;
    const meanLatRad = ((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180);
    const latMetersPerDeg = 111320;
    const lngMetersPerDeg = 111320 * Math.cos(meanLatRad);

    const totalHeightMeters = Math.abs(bounds.maxLat - bounds.minLat) * latMetersPerDeg;
    const totalWidthMeters = Math.abs(bounds.maxLng - bounds.minLng) * lngMetersPerDeg;

    const cellHeightMeters = totalHeightMeters / Math.max(1, rows);
    const cellWidthMeters = totalWidthMeters / Math.max(1, cols);
    const totalAreaSqKm = (totalHeightMeters * totalWidthMeters) / 1000000;

    return {
      cellWidthMeters: Math.round(cellWidthMeters),
      cellHeightMeters: Math.round(cellHeightMeters),
      totalAreaSqKm: Number(totalAreaSqKm.toFixed(2)),
      totalWidthKm: Number((totalWidthMeters / 1000).toFixed(2)),
      totalHeightKm: Number((totalHeightMeters / 1000).toFixed(2))
    };
  },

  /**
   * التحقق من تقاطع حواف المضلع مع أضلاع مستطيل الخلية
   */
  doPolygonEdgesIntersectBox(polygon, box) {
    const boxEdges = [
      [[box.minLat, box.minLng], [box.minLat, box.maxLng]],
      [[box.minLat, box.maxLng], [box.maxLat, box.maxLng]],
      [[box.maxLat, box.maxLng], [box.maxLat, box.minLng]],
      [[box.maxLat, box.minLng], [box.minLat, box.minLng]]
    ];

    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];
      for (const edge of boxEdges) {
        if (this.linesIntersect(p1, p2, edge[0], edge[1])) {
          return true;
        }
      }
    }
    return false;
  },

  /**
   * فحص تقاطع قطعتين مستقيمتين
   */
  linesIntersect(p1, p2, p3, p4) {
    const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
    return (
      ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
      ccw(p1, p2, p3) !== ccw(p1, p2, p4)
    );
  },

  /**
   * إزالة التكرار المكاني الذكي باستخدام الهاشينج الجغرافي O(N)
   */
  deduplicatePlaces(places, thresholdMeters = 35) {
    if (typeof ExportUtils !== "undefined" && ExportUtils.smartDeduplicateByCoords) {
      return ExportUtils.smartDeduplicateByCoords(places, thresholdMeters);
    }
    try {
      const exp = require("./export-utils.js");
      if (exp && exp.smartDeduplicateByCoords) {
        return exp.smartDeduplicateByCoords(places, thresholdMeters);
      }
    } catch (e) {}
    return places;
  }
};

if (typeof window !== "undefined") {
  window.SpatialUtils = SpatialUtils;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = SpatialUtils;
}
