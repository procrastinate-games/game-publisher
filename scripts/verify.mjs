import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? process.argv[2];
if (!repo || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(repo)) throw new Error('Invalid repository name');
const expected = JSON.parse(readFileSync('dist/game.json', 'utf8'));
const origin = expected.useCustomDomain === true
  ? `https://${repo}.procrastinate.games/`
  : `https://pg-${repo}.register-c02.workers.dev/`;
for (let attempt = 0; attempt < 12; attempt++) {
  try {
    const [home, manifest] = await Promise.all([fetch(origin, { signal: AbortSignal.timeout(20000), cache: 'no-store' }), fetch(new URL(`game.json?release=${process.env.GITHUB_SHA ?? Date.now()}`, origin), { signal: AbortSignal.timeout(20000), cache: 'no-store' })]);
    if (home.status !== 200 || manifest.status !== 200) throw new Error(`HTTP ${home.status}/${manifest.status}`);
    const html = await home.text();
    if (!html.includes(`<link rel="canonical" href="${origin}">`)) throw new Error('Missing game canonical');
    if (expected.status === 'published' && (/noindex/i.test(home.headers.get('x-robots-tag') ?? '') || !html.includes('content="index, follow"'))) throw new Error('Published game is not indexable');
    const map = await fetch(new URL('sitemap.xml', origin));
    if (!map.ok || (expected.status === 'published' && !(await map.text()).includes(`<loc>${origin}</loc>`))) throw new Error('Invalid live game sitemap');
    if (!isDeepStrictEqual(await manifest.json(), expected)) throw new Error('Live game.json differs from the tested artifact');
    console.log(`Verified ${origin} and game.json`);
    process.exit(0);
  } catch (error) {
    if (attempt === 11) throw error;
    console.log(`Waiting for deployment: ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
