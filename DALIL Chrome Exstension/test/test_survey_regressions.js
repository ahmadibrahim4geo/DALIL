/* Exercises the actual scroll algorithm with recycled, constant-size DOM batches. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture({batches=12,end=true,growingHeight=false}={}){
  let tick=0;
  const seen=new Set(),moves=[];
  const feed={scrollTop:0,clientHeight:400,lastElementChild:null,
    get scrollHeight(){return growingHeight?1000+Math.min(tick,batches)*100:1000;},
    dispatchEvent(){moves.push(this.scrollTop);},
    querySelectorAll(selector=''){
      if(selector.startsWith('span.HlvSq'))return end&&tick>=batches?[{textContent:'Misleading card text',closest:()=>({})},{textContent:"You've reached the end of the list",closest:()=>null}]:[];
      return Array.from({length:3},(_,i)=>({href:'https://www.google.com/maps/place/'+Math.min(tick,batches)+'-'+i}));
    },
    querySelector(){return end&&tick>=batches?{textContent:"You've reached the end of the list",closest:()=>null}:null;}};
  const context=vm.createContext({module:{exports:{}},console,URL,Event:class Event{},
    document:{body:{innerText:''},querySelector:()=>null,querySelectorAll:()=>[]},
    setTimeout:fn=>{tick++;queueMicrotask(fn);}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../content/content.js'),'utf8'),context);
  const harvest=()=>{feed.querySelectorAll().forEach(link=>seen.add(link.href));return seen.size;};
  return {api:context.module.exports,feed,harvest,seen,moves};
}
(async()=>{
  const recycled=fixture();
  assert.equal(await recycled.api.smartAutoScrollFeed(recycled.feed,120,500,null,recycled.harvest),'complete');
  assert.equal(recycled.seen.size,39,'All 13 batches are retained although only three cards exist at a time');
  assert.equal(recycled.moves[0],320,'Scroll increment stays within one visible viewport');
  const stalled=fixture({batches:0,end:false});
  assert.equal(await stalled.api.smartAutoScrollFeed(stalled.feed,120,500,null,stalled.harvest),'partial','A stalled list without source evidence is not complete');
  const capped=fixture();
  assert.equal(await capped.api.smartAutoScrollFeed(capped.feed,9,500,null,capped.harvest),'capped');
  const height=fixture({batches:7,growingHeight:true});
  assert.equal(await height.api.smartAutoScrollFeed(height.feed,120,500,null,()=>0),'complete','Growing feed height must prevent an early stall');
  // ميزانية القراءة تُقاس بما وقع داخل الخلية: بطاقات Google البعيدة لا تستهلكها.
  const mixed=fixture({batches:12,end:false});
  const inCellOnly=()=>{mixed.harvest();return Math.floor(mixed.seen.size/10);};
  assert.equal(await mixed.api.smartAutoScrollFeed(mixed.feed,3,500,null,inCellOnly),'capped');
  assert.ok(mixed.seen.size>=30,'the cap counts in-cell records, not far-away cards mixed into the same list');
  // الاقتطاع بعدد ثابت يقدّم معالم الخلية أولًا مهما كان ترتيب ظهورها.
  const ordered=fixture().api.inCellFirst(
    [{x:31.5,y:30.5},{x:31.005,y:30.005},{x:null,y:null},{x:31.007,y:30.007}],
    {bounds:{minLng:31,maxLng:31.01,minLat:30,maxLat:30.01}});
  assert.equal(Array.from(ordered,p=>String(p.x)).join('|'),'31.005|31.007|31.5|null');
  const Grid=require('../core/grid-presentation');
  // المفتاح المرئي خمس حالات فقط؛ الحالة الدقيقة تبقى في بطاقة الخلية.
  assert.equal(Grid.definitions.length,5,'The legend keeps exactly the five agreed states');
  assert.equal(Grid.bucket('partial'),'complete','A partial cell is drawn with the completed style');
  assert.equal(Grid.bucket('unknown'),'error','An unverified cell is drawn with the error style');
  assert.notEqual(Grid.style('processing').color,Grid.style('complete').color);
  assert.equal(Grid.style('processing').dashArray,null);
  assert.equal(Grid.state({status:'partial',itemsFound:3},{status:'completed'}),'partial','Partial coverage must never be presented as complete');
  assert.equal(Grid.state({status:'partial',itemsFound:0},{status:'completed'}),'partial','A partial scan with no items is not a verified empty cell');
  assert.equal(Grid.state({statusByQuery:{Q1:{status:'partial'},Q2:{status:'complete'}},itemsFound:5},{status:'completed'}),'partial','One partial query keeps the cell partial');
  assert.equal(Grid.state({status:'complete',itemsFound:0},{status:'completed'}),'confirmed_empty','A finished scan with no items is verified empty');
  console.log('PASS recycled fixed-count feed retains 39 places; viewport-sized scrolling; stalls remain partial; caps; height growth; in-cell budget; in-cell-first truncation; distinct state colors; partial coverage is never reported as complete');
})().catch(error=>{console.error(error);process.exitCode=1;});
