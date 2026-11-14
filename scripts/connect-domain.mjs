import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { validateManifest } from './schema.mjs';

export async function connectDomain({repo, manifest, accountId, token, fetchImpl = fetch}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(repo ?? '') || repo.length > 60) throw new Error('Invalid repository name');
  validateManifest(manifest, repo);
  if (manifest.status === 'draft' || manifest.useCustomDomain !== true) return;
  if (!accountId || !token) throw new Error('Missing Cloudflare deployment credentials');
  const hostname = `${repo}.procrastinate.games`;
  const service = `pg-${repo}`;
  const path = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`;
  async function request(method, body) {
    const response = await fetchImpl(path, {
      method,
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      ...(body ? {body: JSON.stringify(body)} : {}),
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    // Do not print credentials, request headers, or response bodies.
    if (!response.ok || !data.success) throw new Error(`Custom-domain ${method} failed: HTTP ${response.status}; check Workers Scripts Write permissions and the active platform zone`);
    return data.result;
  }
  const domains = await request('GET');
  const existing = domains.find(d => d.hostname === hostname);
  if (existing && existing.service !== service) throw new Error(`${hostname} is attached to another Worker; refusing to replace it`);
  if (!existing || existing.enabled !== true) {
    await request('PUT', {hostname, service, zone_id: 'e1c104370a5c1d78a7e76190bc7b236b', enabled: true, previews_enabled: false});
  }
  console.log(`Custom domain configured: https://${hostname}/ (Worker ${service})`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await connectDomain({
    repo: process.env.GITHUB_REPOSITORY?.split('/')[1],
    manifest: JSON.parse(readFileSync('dist/game.json', 'utf8')),
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
  });
}
