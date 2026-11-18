// Apply the shared static SEO contract to the built artifact, never game source.
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateManifest } from './schema.mjs';
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function prepareSeo(root='dist', repo=process.env.GITHUB_REPOSITORY?.split('/')[1]) {
 const manifest=validateManifest(JSON.parse(await readFile(resolve(root,'game.json'),'utf8')),repo);
 const origin=manifest.useCustomDomain===true?`https://${manifest.slug}.procrastinate.games/`:`https://pg-${manifest.slug}.register-c02.workers.dev/`;
 const indexable=manifest.status==='published';
 let html=await readFile(resolve(root,'index.html'),'utf8');
 if(!/<head\b[^>]*>/i.test(html)||!/<\/head>/i.test(html))throw new Error('Game HTML needs a head element');
 html=html.replace(/<script\b[^>]*id=["']platform-game-schema["'][^>]*>[\s\S]*?<\/script>/gi,'');
 html=html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*>/gi,tag=>/\b(?:name|property)\s*=\s*["'](?:description|robots|googlebot|bingbot|og:[^"']*|twitter:[^"']*)["']/i.test(tag)?'':tag).replace(/<link\b[^>]*>/gi,tag=>/\brel\s*=\s*["']canonical["']/i.test(tag)?'':tag);
 const title=`${manifest.title} — Play Free Online | Games to Procrastinate To`;
 const meta=(key,value,attr='name')=>`<meta ${attr}="${key}" content="${escape(value)}">`;
 const data={'@context':'https://schema.org','@type':'VideoGame',name:manifest.title,description:manifest.description,url:origin,genre:manifest.categories,gamePlatform:'Web browser',isAccessibleForFree:true,isPartOf:{'@type':'WebSite',name:'Games to Procrastinate To',url:'https://procrastinate.games/'}};
 const tags=[`<title>${escape(title)}</title>`,meta('description',manifest.description),meta('robots',indexable?'index, follow':'noindex, nofollow'),`<link rel="canonical" href="${origin}">`,meta('og:type','website','property'),meta('og:title',title,'property'),meta('og:description',manifest.shortDescription,'property'),meta('og:url',origin,'property'),meta('og:site_name','Games to Procrastinate To','property'),meta('twitter:card','summary_large_image'),meta('twitter:title',title),meta('twitter:description',manifest.shortDescription)];
 // Use the portal's verified cover, including its screenshot fallback.
 const hasCover=await access(resolve(root,'cover.webp')).then(()=>true).catch(()=>false);
 const cover=hasCover?new URL('cover.webp',origin).href:`https://procrastinate.games/images/${manifest.slug}.webp`;
 tags.push(meta('og:image',cover,'property'),meta('og:image:alt',manifest.coverAlt,'property'),meta('twitter:image',cover));
 html=html.replace(/<\/head>/i,`${tags.join('\n')}\n<script id="platform-game-schema" type="application/ld+json">${JSON.stringify(data).replace(/</g,'\\u003c')}</script>\n</head>`);
 await writeFile(resolve(root,'index.html'),html);
 await writeFile(resolve(root,'robots.txt'),`User-agent: *\n${indexable?'Allow: /':'Disallow: /'}\nSitemap: ${origin}sitemap.xml\n`);
 await writeFile(resolve(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${indexable?`<url><loc>${origin}</loc></url>`:''}</urlset>\n`);
 let headers=await readFile(resolve(root,'_headers'),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
 headers=headers.replace(/^\s*X-Robots-Tag\s*:.*$/gim,'');
 headers+=`\n/*\n  X-Robots-Tag: ${indexable?'index, follow':'noindex, nofollow'}\n`;
 await writeFile(resolve(root,'_headers'),headers);
 console.log(`SEO prepared for ${manifest.slug}: ${indexable?'indexable':'hidden'}, ${origin}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await prepareSeo();
