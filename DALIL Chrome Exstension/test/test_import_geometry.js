const assert=require('node:assert/strict');
const Spatial=require('../lib/spatial-utils'),Workspace=require('../core/workspace-state'),Export=require('../lib/export-utils');
const {shapeBuffer,filesFor}=require('./import_fixtures');
async function main(){
  let imports=0;
  for(const geometry of [{type:'Point',coordinates:[0,0]},{type:'LineString',coordinates:[[31,30],[31.02,30],[31.02,30.02]]},{type:'MultiPoint',coordinates:[[31,30],[32,31]]},{type:'MultiLineString',coordinates:[[[31,30],[31.02,30]],[[31.03,30.01],[31.04,30.03]]]}]){
    for(const [name,buffer] of filesFor(geometry)){
      const area=await Spatial.parseSpatialFile({name,text:async()=>buffer.toString('utf8'),arrayBuffer:async()=>buffer});
      assert.equal(area.success,true,name+': '+area.error);assert.equal(area.bufferMeters,500);assert.equal(area.searchMode,'proximity');
      assert.deepEqual(Spatial.geometryPositions(area.geometry),Spatial.geometryPositions(geometry),name+' preserves vertices and open lines');
      assert.ok(area.bounds.minLat<area.bounds.maxLat && area.bounds.minLng<area.bounds.maxLng,name+' nonzero search rectangle');
      const cells=Spatial.generateMeshForBounds(area.bounds,3,4,0.05,area);assert.equal(cells.length,12,name+' full rectangular lattice');
      const saved=Workspace.applyOperation(Workspace.empty(),'SAVE_WORKSPACE',{importedStudyArea:{...area,id:name},activeAreaId:name,cells});
      const restored=Workspace.getActiveArea(Workspace.fromStorage({workspaceState:JSON.parse(JSON.stringify(saved))}));
      assert.deepEqual(restored.geometry,area.geometry);assert.equal(restored.bufferMeters,500);imports++;
    }
  }
  const R=6371008.8,rad=180/Math.PI;
  const point=Spatial.parsedAreaFromGeometry({type:'Point',coordinates:[0,0]},'point','fixture',500);
  assert.equal(Spatial.isPointInStudyArea(499/R*rad,0,point),true);
  assert.equal(Spatial.isPointInStudyArea(501/R*rad,0,point),false);
  assert.equal(Spatial.isPointInStudyArea(point.bounds.maxLng,point.bounds.maxLat,point),false,'Rectangle corner is outside the circle');
  const tiny=Spatial.parsedAreaFromGeometry(point.geometry,'tiny','fixture',1);
  assert.throws(()=>Spatial.generateMeshForBounds(tiny.bounds,40,40,0,tiny),/precision/,'Do not create zero-width owner cells after rounding');
  assert.equal((await Spatial.parseSpatialFile({name:'big.geojson',size:65*1024*1024,text:()=>{throw Error('Must reject before reading');}})).error,'Import file size exceeds 64 MiB.');
  const equator={type:'LineString',coordinates:[[0,0],[1,0]]};
  const line=Spatial.parsedAreaFromGeometry(equator,'road','fixture',500);
  assert.equal(Spatial.isPointInStudyArea(0.5,499/R*rad,line),true);
  assert.equal(Spatial.isPointInStudyArea(0.5,501/R*rad,line),false);
  assert.equal(Spatial.isPointInStudyArea(1+499/R*rad,0,line),true,'Endpoint cap');
  assert.equal(Spatial.isPointInStudyArea(1+501/R*rad,0,line),false,'Finite segment does not extend infinitely');
  assert.equal(Spatial.isPointInStudyArea(0.5,0,Spatial.parsedAreaFromGeometry(equator,'road','fixture',1)),true);
  assert.ok(Math.abs(Spatial.pointSegmentDistanceMeters([0.5,1],[0,0],[1,0])-111195.0802335329)<1e-6);
  assert.ok(Math.abs(Spatial.pointSegmentDistanceMeters([2,0],[0,0],[0,0])-222390.1604670658)<1e-6,'Repeated vertices');
  const polar=Spatial.parsedAreaFromGeometry({type:'LineString',coordinates:[[-45,80],[45,80]]},'arctic','fixture',500);
  assert.ok(polar.bounds.maxLat>82.89,'Interior great-circle latitude extrema are included');
  assert.equal(Spatial.isPointInStudyArea(0,82.89328488238122,polar),true);
  const features={type:'GeometryCollection',geometries:[equator,{type:'Point',coordinates:[2,2]},{type:'Polygon',coordinates:[[[4,4],[5,4],[5,5],[4,5],[4,4]],[[4.2,4.2],[4.8,4.2],[4.8,4.8],[4.2,4.8],[4.2,4.2]]]}]};
  const mixed=Spatial.parseGeoJSON(features);
  assert.equal(mixed.success,true,mixed.error);assert.equal(mixed.geometry.type,'GeometryCollection');
  assert.equal(Spatial.isPointInStudyArea(0.5,0,mixed),true);assert.equal(Spatial.isPointInStudyArea(2,2,mixed),true);
  assert.equal(Spatial.isPointInStudyArea(4.1,4.1,mixed),true);assert.equal(Spatial.isPointInStudyArea(4.5,4.5,mixed),false,'Polygon holes survive mixed imports');assert.equal(Spatial.isPointInStudyArea(3,3,mixed),false);
  const changed=Spatial.parsedAreaFromGeometry(line.geometry,'road','fixture',1000);assert.deepEqual(changed.geometry,equator);assert.ok(changed.bounds.maxLat>line.bounds.maxLat);
  for(const radius of [0,-1,NaN,50001,'500'])assert.throws(()=>Spatial.parsedAreaFromGeometry(equator,'bad','fixture',radius),/distance/);
  for(const geometry of [{type:'LineString',coordinates:[[0,0]]},{type:'Point',coordinates:[181,0]},{type:'Point',coordinates:['0',0]},{type:'MultiPoint',coordinates:[]},{type:'LineString',coordinates:[[0,0],[180,0]]}])assert.equal(Spatial.parseGeoJSON(geometry).success,false);
  const crossing=Spatial.parseGeoJSON({type:'LineString',coordinates:[[179,0],[-179,0]]});assert.equal(crossing.crossesDateline,true);assert.throws(()=>Spatial.generateMeshForBounds(crossing.bounds,2,2,0,crossing),/date line/);
  const pole=Spatial.parsedAreaFromGeometry({type:'Point',coordinates:[0,89.999]},'pole','fixture');assert.equal(pole.crossesDateline,true);
  const bad=shapeBuffer(equator).subarray(0,150);assert.equal(Spatial.parseShapefile(bad).success,false);
  assert.equal(Spatial.parseKML('<kml><Point><coordinates>,</coordinates></Point></kml>').success,false,'Empty coordinates must not become 0/0');
  assert.equal(Spatial.parseGeoJSON({type:'FeatureCollection',features:[{type:'Feature',geometry:null},{type:'Feature',geometry:equator}]}).success,true,'Null features do not discard valid roads');
  const zip=Export.createZip([{name:'road.shp',data:shapeBuffer(equator)},{name:'road.prj',data:'PROJCS["WGS 84 / UTM zone 36N",GEOGCS["WGS 84"]]'}]);assert.equal((await Spatial.parseZippedFile(zip)).success,false,'Projected PRJ rejected, even with small numerical coordinates');
  const radians=Export.createZip([{name:'road.shp',data:shapeBuffer(equator)},{name:'road.prj',data:'GEOGCS["WGS 84",PRIMEM["Greenwich",0],UNIT["radian",1]]'}]);assert.equal((await Spatial.parseZippedFile(radians)).success,false,'Angular units are verified');
  console.log(`PASS ${imports} point/line/multipart file imports, metric corridor/caps/circle rejection, mixed holes, spherical extrema, full grid, persistence, malformed geometry and CRS checks`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
