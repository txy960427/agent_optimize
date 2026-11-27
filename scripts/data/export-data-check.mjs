import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createExportStore } from '../../server/export-store.mjs';
import { manifestFields } from '../../shared/local-data-fields.mjs';
const store=createExportStore();const data=await store.load();
assert.deepEqual(Object.keys(data.manifest).sort(), [...manifestFields].sort());
assert.equal(data.manifest.traceCount,100);assert.equal(data.manifest.observationCount,2151);assert.equal(data.manifest.sessionCount,34);assert.equal(data.manifest.conflicts.length,0);assert.equal(data.cases.length,2);
let loops=0,primaryModels=0,unclassified=0;
for(const entry of data.records.values()){
 const trace=await store.detail(entry.raw.id);assert.deepEqual(trace.observations,entry.raw.observations);assert.deepEqual(trace.rawInput,entry.raw.input);assert.deepEqual(trace.rawOutput,entry.raw.output);
 const ids=new Set(trace.observations.map(o=>o.id));assert.equal(ids.size,trace.observations.length,'Duplicate observation IDs');
 const mapped=[...trace.mapping.requestIds,...trace.mapping.deliveryIds,...trace.mapping.containerIds,...trace.mapping.unclassifiedIds,...trace.loops.flatMap(l=>Object.values(l.phaseRecords).flat())];
 assert.equal(mapped.length,ids.size,'A record was duplicated or omitted from the reading map: '+trace.id);assert.equal(new Set(mapped).size,ids.size);for(const id of mapped)assert(ids.has(id));
 for(const loop of trace.loops){for(const id of loop.modelIds){const gen=trace.observations.find(o=>o.id===id);assert.equal(gen.type,'GENERATION');let parent=trace.observations.find(o=>o.id===gen.parentObservationId);const seen=new Set();while(parent&&parent.id!==loop.anchorId&&!seen.has(parent.id)){seen.add(parent.id);parent=trace.observations.find(o=>o.id===parent.parentObservationId);}assert(parent?.id===loop.anchorId,'Auxiliary model incorrectly counted in main loop');}assert.equal(loop.phaseRecords[5].length,0,'Unrecorded phase 5 was fabricated');}
 if(!trace.sessionId)assert.equal(trace.related.length,0,'Missing session must not group unrelated traces');
 loops+=trace.loops.length;primaryModels+=trace.loops.reduce((n,l)=>n+l.modelIds.length,0);unclassified+=trace.mapping.unclassifiedIds.length;
}
const first=await store.detail('57c4084a5554aa917049a6be681df62a');assert.equal(first.loops.length,2);assert.equal(first.observations.filter(o=>o.type==='GENERATION').length,3);assert(first.mapping.requestIds.includes('4d82c44b3c70d1c8'));assert.equal(first.source.origins.length,2);
const arg=await store.detail('96f74e585adcbe1e010e5d9b4627ffc9');assert.equal(arg.loops.length,3);assert.equal(arg.source.origins.length,3);
assert.equal(await store.detail('unknown-trace'),null);
const idSearch=await store.list(new URLSearchParams({q:first.id,mode:'session'}));assert.equal(idSearch.total,1);assert.equal(idSearch.items[0].id,first.id);
const sessionSearch=await store.list(new URLSearchParams({q:first.sessionId,mode:'session',pageSize:'30'}));assert(sessionSearch.items.every(t=>t.sessionId===first.sessionId));
const seen=new Set();for(let page=1;page<=7;page++){const result=await store.list(new URLSearchParams({page:String(page)}));result.items.forEach(t=>{assert(!seen.has(t.id));seen.add(t.id)});}assert.equal(seen.size,100);
const keyword=await store.list(new URLSearchParams({q:'open_app',mode:'keyword',scope:'all'}));assert(keyword.total>0);assert(keyword.items.every(t=>t.match?.field&&t.match.snippet.toLowerCase().includes('open_app')));
assert.equal((await store.list(new URLSearchParams({q:'no-such-record-unique-893251',mode:'keyword',scope:'all'}))).total,0);
assert.equal((await store.list(new URLSearchParams({case:data.cases[0].id}))).total,2);
assert.equal((await store.list(new URLSearchParams({from:'2099-01-01'}))).total,0);
const http=await fetch('http://127.0.0.1:4173/api/local-data/traces?pageSize=2');assert(http.ok);const page=await http.json();assert.equal(page.items.length,2);assert(!('observations'in page.items[0]));
assert.equal((await fetch('http://127.0.0.1:4173/api/local-data/traces/no-such-trace')).status,404);assert.equal((await fetch('http://127.0.0.1:4173/api/local-data/traces',{method:'POST'})).status,405);
const raw=await fetch('http://127.0.0.1:4173/api/local-data/traces/'+first.id+'/raw');assert.deepEqual(await raw.json(),data.records.get(first.id).raw);
console.log(JSON.stringify({passed:true,traces:100,nonEmptySessions:34,missingSessionTraces:data.manifest.tracesWithoutSession,observations:2151,mainLoops:loops,primaryModels,unclassified,allRecordsPreserved:true,noFabricatedPhase5:true,auxiliaryModelSeparated:true,caseDuplicatesMerged:true,pagination:true,exactIdLookup:true,keywordCoverage:true,readOnlyHttp:true},null,2));
