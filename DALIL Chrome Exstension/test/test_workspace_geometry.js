/* Regression fixtures exercise real imports/reducer/mesh, not copied algorithms. */
const assert = require('node:assert/strict');
const Spatial = require('../lib/spatial-utils');
const Workspace = require('../core/workspace-state');
const Export = require('../lib/export-utils');

async function main() {
  const outer = [[0,0],[10,0],[10,10],[0,10],[0,0]];
  const hole = [[2,2],[8,2],[8,8],[2,8],[2,2]];
  const island = [[20,20],[22,20],[22,22],[20,22],[20,20]];
  const geometry = {type:'MultiPolygon', coordinates:[[outer,hole],[island]]};
  const parsed = Spatial.parseGeoJSON(JSON.stringify({type:'Feature',properties:{name:'منطقة اختبار'},geometry}),'islands.geojson');
  assert.equal(parsed.success,true);
  assert.deepEqual(parsed.geometry,geometry);
  assert.equal(Spatial.isPointInStudyArea(1,1,parsed),true);
  assert.equal(Spatial.isPointInStudyArea(5,5,parsed),false,'A lake is not a study land area');
  assert.equal(Spatial.isPointInStudyArea(21,21,parsed),true);
  assert.equal(Spatial.isPointInStudyArea(15,15,parsed),false,'Disjoint parts must not be bridged');
  assert.equal(Spatial.isPointInStudyArea(0,0,parsed),true,'Zero is a valid verified coordinate at the boundary');
  assert.equal(Spatial.isPointInStudyArea(181,0,parsed),false);

  const kml = '<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><MultiGeometry>' + [
    '<Polygon><outerBoundaryIs><LinearRing><coordinates>'+outer.map(p=>p.join(',')).join(' ')+'</coordinates></LinearRing></outerBoundaryIs><innerBoundaryIs><LinearRing><coordinates>'+hole.map(p=>p.join(',')).join(' ')+'</coordinates></LinearRing></innerBoundaryIs></Polygon>',
    '<Polygon><outerBoundaryIs><LinearRing><coordinates>'+island.map(p=>p.join(',')).join(' ')+'</coordinates></LinearRing></outerBoundaryIs></Polygon>'
  ].join('')+'</MultiGeometry></Placemark></Document></kml>';
  const kmlArea=Spatial.parseKML(kml,'islands.kml');
  assert.equal(kmlArea.success,true);
  assert.deepEqual(kmlArea.geometry,geometry,'KML innerBoundaryIs belongs to its original Polygon');
  const namespaced=Spatial.parseKML(kml.replace(/<(\/?)(Polygon|outerBoundaryIs|innerBoundaryIs|LinearRing|coordinates)/g,'<$1k:$2'));
  assert.deepEqual(namespaced.geometry,geometry);
  assert.equal(Spatial.parseKML('<!DOCTYPE kml [<!ENTITY x SYSTEM "file:///etc/passwd">]>'+kml).success,false);
  assert.equal(Spatial.parseGeoJSON({type:'Polygon',coordinates:[[[500000,3000000],[500001,3000000],[500001,3000001]]]}).success,false);
  assert.equal(Spatial.parseGeoJSON({type:'FeatureCollection',crs:{type:'name',properties:{name:'EPSG:3857'}},features:[]}).success,false);
  assert.equal(Spatial.parseGeoJSON({type:'Polygon',coordinates:[[[1,1],[1,1],[1,1]]]}).success,false);

  const donut=Spatial.parseGeoJSON({type:'Polygon',coordinates:[outer,hole]});
  const cells=Spatial.generateMeshForBounds(donut.bounds,10,10,0,donut);
  assert.ok(cells.length>0 && cells.length<100);
  assert.equal(cells.some(c=>c.bounds.minLat===4&&c.bounds.minLng===4),false,'A cell wholly inside the hole is excluded');
  assert.deepEqual(Spatial.generateMeshForBounds({minLat:40,maxLat:41,minLng:40,maxLng:41},2,2,0,donut),[],'Zero intersections must not create an artificial fallback cell');
  const squareCells=Spatial.generateMeshForBounds({minLat:0,maxLat:2,minLng:0,maxLng:2},2,2,0);
  assert.equal(Spatial.findOwnerCell(5,5,squareCells),null,'Outside points have no containing owner');
  assert.equal(Spatial.findOwnerCell(1,1,squareCells).id,Spatial.findOwnerCell(1,1,[...squareCells].reverse()).id,'Shared-edge ownership is deterministic');
  const dateline=Spatial.parseGeoJSON({type:'Polygon',coordinates:[[[179,-1],[-179,-1],[-179,1],[179,1],[179,-1]]]});
  assert.equal(Spatial.isPointInStudyArea(179.5,0,dateline),true);
  assert.equal(Spatial.isPointInStudyArea(-179.5,0,dateline),true);
  assert.equal(Spatial.isPointInStudyArea(0,0,dateline),false);
  assert.throws(()=>Spatial.generateMeshForBounds(dateline.bounds,2,2,0,dateline),/date line/,'Unsupported crossing grids fail explicitly');

  const imported={...parsed,id:'import-a',version:1},drawn={...donut,id:'draw-a',version:1,source:{kind:'drawing'}};
  let state=Workspace.applyOperation(Workspace.empty(),'SAVE_WORKSPACE',{importedStudyArea:imported,drawnStudyArea:drawn,activeAreaId:drawn.id,cells:squareCells});
  const saved=JSON.parse(JSON.stringify(state));
  state=Workspace.applyOperation(state,'REMOVE_DRAWING');
  assert.equal(Workspace.getActiveArea(state).id,imported.id);
  assert.equal(state.cells.length,0);
  state=Workspace.applyOperation(state,'REMOVE_IMPORTED');
  assert.equal(Workspace.getActiveArea(state),null);
  assert.equal(state.cells.length,0);
  const reopened=Workspace.fromStorage({workspaceState:state,savedStudyArea:imported,savedCells:squareCells});
  assert.equal(Workspace.getActiveArea(reopened),null,'Explicit empty canonical state overrides old saved keys');
  const restored=Workspace.applyOperation(state,'SAVE_WORKSPACE',saved);
  assert.deepEqual(Workspace.getActiveArea(restored).geometry,donut.geometry);
  const cleared=Workspace.applyOperation(restored,'CLEAR_GRID');
  assert.equal(cleared.cells.length,0);assert.ok(Workspace.getActiveArea(cleared));
  assert.equal(Workspace.getActiveArea(Workspace.applyOperation(cleared,'RESET_WORKSPACE')),null);

  const zip=Export.createZip([{name:'ok/bad.kml',data:kml}]);
  const original=new TextEncoder().encode('ok/bad.kml'),malicious=new TextEncoder().encode('../bad.kml');
  for(let offset=0;offset<zip.length-original.length;offset++) {
    if(original.every((value,index)=>zip[offset+index]===value))zip.set(malicious,offset);
  }
  await assert.rejects(()=>Spatial.unzipFiles(zip.buffer.slice(zip.byteOffset,zip.byteOffset+zip.byteLength)),/Unsafe/);
  const valid=Export.createZip([{name:'doc.kml',data:kml}]);
  const files=await Spatial.unzipFiles(valid.buffer.slice(valid.byteOffset,valid.byteOffset+valid.byteLength));
  assert.equal(new TextDecoder().decode(files['doc.kml']),kml);
  console.log('PASS imported Polygon/MultiPolygon/holes, KML scope, strict geometry/ownership, boundary zero, explicit dateline limit, workspace delete/restore/undo, archive path limits');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
