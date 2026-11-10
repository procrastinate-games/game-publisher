# game-publisher

Shared publishing for Games to Procrastinate To. Every game repository calls one reusable workflow instead of carrying its own copy of the pipeline and platform scripts.

On a push to `main` it validates `public/game.json`, installs, tests and builds the game, smoke-tests `dist/` in Chromium, deploys it to Cloudflare Workers as `pg-<repository-name>` and asks the portal (`pg-website`) to refresh. A `draft` game is checked but never published; a repository without `package.json` (a fresh template) only has its metadata checked.

## Use it in a game

`.github/workflows/publish.yml` in the game repository:

```yaml
name: Publish game
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
jobs:
  publish:
    uses: procrastinate-games/game-publisher/.github/workflows/publish.yml@v1
    secrets: inherit
```

`secrets: inherit` passes the organization secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `PORTAL_DISPATCH_TOKEN`.

### Inputs

| Input | Default | Use |
| --- | --- | --- |
| `test-command` | `npm run test --if-present` | Game checks before the build. |
| `post-build-command` | empty | Game checks after the build, e.g. browser regressions against `dist/`. |
| `runs-on` | `ubuntu-latest` | Runner label. |
| `node-version` | `24` | Node.js for the game build. |
| `platform-ref` | `v1` | Ref of this repository's scripts. Keep it equal to the ref in `uses:`; change both only to test a branch. |

Example with game-specific checks:

```yaml
jobs:
  publish:
    uses: procrastinate-games/game-publisher/.github/workflows/publish.yml@v1
    secrets: inherit
    with:
      test-command: npm run test:unit
      post-build-command: npm run test:browser
```

Commands run as written in the calling repository; keep them in that repository's own workflow file.

## The game's side of the contract

- npm project; `npm ci` and `npm run build` work; the build writes the whole game to `dist/`, including `dist/game.json` copied from `public/game.json`.
- `public/game.json` passes [`scripts/schema.mjs`](scripts/schema.mjs); `slug` equals the repository name; `status` is `draft`, `published` or `hidden`.
- Optional `wrangler.jsonc` in the game. Without one, [`wrangler.default.jsonc`](wrangler.default.jsonc) is used. The Worker name always comes from the repository name.

Local check before pushing, from the game repository:

```bash
npx --yes github:procrastinate-games/game-publisher#v1
```

## Releasing changes

Games follow the `v1` tag. After a change lands on `main` and its tests pass, move the tag:

```bash
git tag -f v1 && git push -f origin v1
```

A change that would break existing games (a stricter schema, a new required input) goes out as `v2`; games move to it one by one.
