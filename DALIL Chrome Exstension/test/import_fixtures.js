/* Binary fixtures follow Esri's record layout; used by parser and native UI QA. */
const Export=require('../lib/export-utils');
function shapeBuffer(geometry){
  const point=geometry.type==='Point',multi=geometry.type==='MultiPoint';
  const parts=point?[]:multi?[geometry.coordinates]:geometry.type==='LineString'?[geometry.coordinates]:geometry.coordinates;
  const points=point?[geometry.coordinates]:parts.flat();
  const type=point?1:multi?8:3,size=point?20:multi?40+16*points.length:44+4*parts.length+16*points.length;
  const b=Buffer.alloc(108+size);b.writeInt32BE(9994,0);b.writeInt32BE(b.length/2,24);b.writeInt32LE(1000,28);b.writeInt32LE(type,32);
  const bounds=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
  bounds.forEach((n,i)=>b.writeDoubleLE(n,36+i*8));b.writeInt32BE(1,100);b.writeInt32BE(size/2,104);b.writeInt32LE(type,108);
  if(point){b.writeDoubleLE(points[0][0],112);b.writeDoubleLE(points[0][1],120);return b;}
  bounds.forEach((n,i)=>b.writeDoubleLE(n,112+i*8));
  let at;
  if(multi){b.writeInt32LE(points.length,144);at=148;}
  else{b.writeInt32LE(parts.length,144);b.writeInt32LE(points.length,148);let offset=0;parts.forEach((line,i)=>{b.writeInt32LE(offset,152+i*4);offset+=line.length;});at=152+4*parts.length;}
  points.forEach((p,i)=>{b.writeDoubleLE(p[0],at+i*16);b.writeDoubleLE(p[1],at+i*16+8);});return b;
}
function filesFor(geometry,prefix='study'){
  const content=g=>g.type==='Point'?`<Point><coordinates>${g.coordinates.join(',')}</coordinates></Point>`:g.type==='LineString'?`<LineString><coordinates>${g.coordinates.map(p=>p.join(',')).join(' ')}</coordinates></LineString>`:`<MultiGeometry>${g.coordinates.map(c=>content({type:g.type==='MultiPoint'?'Point':'LineString',coordinates:c})).join('')}</MultiGeometry>`;
  const kml=`<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark>${content(geometry)}</Placemark></Document></kml>`,shp=shapeBuffer(geometry);
  return [[prefix+'.geojson',Buffer.from(JSON.stringify({type:'Feature',properties:{name:'Study'},geometry}))],[prefix+'.kml',Buffer.from(kml)],[prefix+'.kmz',Buffer.from(Export.createZip([{name:'doc.kml',data:kml}]))],[prefix+'.shp',shp],[prefix+'.zip',Buffer.from(Export.createZip([{name:'area.shp',data:shp},{name:'area.prj',data:'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'}]))]];
}
module.exports={shapeBuffer,filesFor};
