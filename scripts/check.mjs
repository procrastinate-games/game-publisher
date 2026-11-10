#!/usr/bin/env node
// Local pre-push check of game metadata, run from the game repository:
//   npx --yes github:procrastinate-games/game-publisher#v1 [repository-name]
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
import { validateManifest } from './schema.mjs';

function repositoryName() {
  if (process.argv[2]) return process.argv[2];
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return basename(url).replace(/\.git$/, '');
  } catch {
    return basename(process.cwd());
  }
}

const repo = repositoryName();
let failed = false;
const fail = message => { console.error(`✗ ${message}`); failed = true; };

if (!existsSync('public/game.json')) fail('public/game.json is missing');
for (const file of ['public/game.json', 'dist/game.json']) {
  if (!existsSync(file)) continue;
  try {
    const game = validateManifest(JSON.parse(readFileSync(file, 'utf8')), repo);
    console.log(`✓ ${file} is valid for ${repo} (status: ${game.status})`);
  } catch (error) {
    fail(`${file}: ${error.message}`);
  }
}
if (existsSync('package.json')) {
  const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {};
  if (!scripts.build) fail('package.json needs a "build" script that writes the game to dist/');
}
if (existsSync('package.json') && !existsSync('dist/game.json')) console.log('• Run npm run build to also check dist/game.json');
process.exitCode = failed ? 1 : 0;
