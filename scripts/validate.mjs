import { readFileSync, appendFileSync } from 'node:fs';
import { validateManifest } from './schema.mjs';
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? process.argv[2];
if (!repo) throw new Error('Pass a repository name or set GITHUB_REPOSITORY');
// public/game.json before the build, dist/game.json after it.
const file = process.env.MANIFEST ?? 'dist/game.json';
const game = validateManifest(JSON.parse(readFileSync(file, 'utf8')), repo);
const publish = game.status !== 'draft';
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `publish=${publish}\ncustom_domain=${game.useCustomDomain === true}\n`);
console.log(publish ? `Validated ${file} for ${repo}: ${game.status}` : `Draft: ${file} is valid; nothing will be published.`);
