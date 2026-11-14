import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectDomain } from '../scripts/connect-domain.mjs';
const manifest = {schemaVersion:1,slug:'sample',status:'published',title:'Sample',shortDescription:'Play',description:'Play',primaryCategory:'Casual',categories:['Casual'],dimension:'2D',controls:['Tap'],languages:'English',saveNote:'Local',coverAlt:'Game',accent:'lime',useCustomDomain:true};
const settings = {repo:'sample',manifest,accountId:'account',token:'test-only'};
const json = result => new Response(JSON.stringify({success:true,result}));
test('legacy games and drafts make no domain API calls', async () => {
 for (const game of [{...manifest,useCustomDomain:undefined},{...manifest,status:'draft'}]) await connectDomain({...settings,manifest:game,fetchImpl:()=>{throw new Error('Unexpected mutation');}});
});
test('attaches only the derived hostname and skips an existing enabled binding', async () => {
 const calls=[];
 await connectDomain({...settings,fetchImpl:async (url,options)=>{calls.push(options);return json(options.method==='GET'?[]:{});}});
 assert.equal(calls.length,2);
 assert.deepEqual(JSON.parse(calls[1].body),{hostname:'sample.procrastinate.games',service:'pg-sample',zone_id:'e1c104370a5c1d78a7e76190bc7b236b',enabled:true,previews_enabled:false});
 await connectDomain({...settings,fetchImpl:async (url,options)=>{assert.equal(options.method,'GET');return json([{hostname:'sample.procrastinate.games',service:'pg-sample',enabled:true}]);}});
});
test('refuses conflicting bindings and propagates Cloudflare denial without credentials', async () => {
 await assert.rejects(connectDomain({...settings,fetchImpl:async()=>json([{hostname:'sample.procrastinate.games',service:'other',enabled:true}])}),/refusing/);
 await assert.rejects(connectDomain({...settings,fetchImpl:async()=>new Response(JSON.stringify({success:false}),{status:403})}),/HTTP 403/);
 await assert.rejects(connectDomain({...settings,manifest:{...manifest,useCustomDomain:'true'}}),/useCustomDomain/);
});
