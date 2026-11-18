import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareSeo} from '../scripts/seo.mjs';
const game={schemaVersion:1,slug:'sample',status:'published',title:'Sample & Game',shortDescription:'A game',description:'An original browser game.',primaryCategory:'Casual',categories:['Casual'],dimension:'2D',controls:['Tap'],languages:'English',saveNote:'Local',coverAlt:'Game cover',accent:'lime'};
test('SEO replaces restrictions without changing gameplay scripts, is idempotent, and follows publication status',async()=>{
 const root=await mkdtemp(join(tmpdir(),'game-seo-'));
 try{
  await writeFile(join(root,'game.json'),JSON.stringify(game));
  await writeFile(join(root,'index.html'),'<html><head><title>Old</title><meta name="robots" content="noindex"><meta name="description" content="Old"></head><body><script src="./game.js"></script><canvas></canvas></body></html>');
  await writeFile(join(root,'_headers'),'/*\n  X-Frame-Options: SAMEORIGIN\n  X-Robots-Tag: noindex\n');
  await prepareSeo(root,'sample');await prepareSeo(root,'sample');
  const html=await readFile(join(root,'index.html'),'utf8');assert.equal((html.match(/<title>/g)||[]).length,1);assert.equal((html.match(/id="platform-game-schema"/g)||[]).length,1);
  assert.match(html,/index, follow/);assert.doesNotMatch(html,/noindex/);assert.match(html,/<canvas>/);assert.match(html,/src="\.\/game.js"/);assert.match(html,/Sample &amp; Game/);
  assert.match(await readFile(join(root,'sitemap.xml'),'utf8'),/https:\/\/pg-sample.register-c02.workers.dev\//);
  assert.match(await readFile(join(root,'_headers'),'utf8'),/X-Frame-Options: SAMEORIGIN/);
  await writeFile(join(root,'game.json'),JSON.stringify({...game,useCustomDomain:true,status:'hidden'}));await prepareSeo(root,'sample');
  assert.match(await readFile(join(root,'index.html'),'utf8'),/noindex, nofollow/);assert.doesNotMatch(await readFile(join(root,'sitemap.xml'),'utf8'),/<loc>/);assert.match(await readFile(join(root,'robots.txt'),'utf8'),/Disallow: \//);
 }finally{await rm(root,{recursive:true,force:true});}
});
