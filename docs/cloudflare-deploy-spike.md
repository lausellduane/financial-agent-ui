# Cloudflare deploy spike: financial-agent-ui

**Recommendation: deploy the web UI as a Cloudflare Workers static-asset site.** One assets-only Worker, no Worker script, no server-side rendering. Cloudflare Pages can host the same `dist/` directory, and Expo's publishing guide lists Pages as a generic static host. Workers static assets is the fit for this repo: Metro writes a static directory, Cloudflare's current static hosting path is Workers assets, and the API is already being evaluated as its own Worker.

This spike did not deploy. There is no Cloudflare API token in this environment.

## What the framework actually emits

This is Expo SDK 57 (`expo ~57.0.12`) with React Native 0.86 and React Native Web. The entry is `registerRootComponent` in `index.ts`. There is no Expo Router, so `expo.web.output` (`single` / `static` / `server`) does not apply and must not be set to `server`.

`npx expo export --platform web` (production mode) writes a client-rendered shell to `dist/`:

| File | Size |
| --- | --- |
| `_expo/static/js/web/index-*.js` | 903,613 bytes (~883 KiB) |
| `_expo/static/css/global-*.css` | 24,205 bytes |
| `favicon.ico` | 14,510 bytes |
| `index.html` | 1,416 bytes |
| `metadata.json` | 49 bytes |
| `_headers` | 145 bytes |

Six files. `index.html` is an empty `<div id="root">` plus a deferred script. The page requires JavaScript. Nothing in the export is a server renderer, a Node process, or an API route.

Verified with `npm run export:web` and `npx wrangler dev` (Wrangler 4.157.0) on 2026-11-04:

- `GET /` returns `index.html` with `200`.
- `GET /index.html` returns `307` to `/` (Wrangler's default `auto-trailing-slash` HTML handling).
- `GET /unknown/path` returns `404`.
- Hashed JS and CSS return `200` with `Cache-Control: public, max-age=31536000, immutable` from `public/_headers`.
- Headless Chrome loaded the preview. The shell rendered "Secure Cash Management AI", the upload button, and the empty chat state, with no runtime exceptions.
- `npx wrangler deploy --dry-run` read `dist/`, reported no bindings, and exited without publishing. Wrangler still uploads a placeholder script (0.31 KiB here) so the assets have a Worker version to attach to. The config sets no `main`, and a request that matches a file is served without invoking that script.

## SSR and SPA fallback

**SSR: no.** The browser downloads one prebuilt JS bundle and renders the single screen. A Worker script would not be running any of this UI.

**SPA routing fallback: no.** The screen has no client router and no paths besides `/`. Unknown URLs should 404. `not_found_handling` is omitted on purpose. Setting `single-page-application` also serves `index.html` for a missing `/_expo/static/*` URL, and `public/_headers` marks that prefix immutable, so a missing bundle could be cached as HTML. Add `"not_found_handling": "single-page-application"` only if a client router is added later, and keep the long-cache rule off any URL that can fall back to HTML.

## Environment variables

The only client configuration is the API origin. `App.tsx` reads it as a static property, which is the form Metro inlines:

```ts
process.env.EXPO_PUBLIC_API_URL
```

`expo export` runs in production mode. It loads `.env.production.local`, `.env.local`, `.env.production`, then `.env`, and it also sees variables already set in the process environment. The value is compiled into the JS. A production export with `EXPO_PUBLIC_API_URL=https://api.example.test` contained that origin and did not contain `localhost:4000`. An export with the variable unset kept the local defaults: `http://localhost:4000` on web and iOS, `http://10.0.2.2:4000` on the Android emulator.

There is no runtime configuration. This Worker has no script, so Wrangler `[vars]`, secrets, and `env` bindings never reach the bundle. Changing the API origin means exporting again and redeploying. `.env*.local` is gitignored. Do not commit a `.env` with a real origin, and do not put secrets in `EXPO_PUBLIC_*`. Anything with that prefix is plain text in the bundle. The UI sends no credentials today: `POST /api/upload` (multipart file field `file`) and `POST /api/query` (`{ question }`).

See `.env.example`.

## Wrangler

`wrangler.jsonc` is the whole config: worker name `financial-agent-ui`, `assets.directory` `./dist`, compatibility date `2026-11-04`. No `main`, no assets binding, no `account_id` (pass that at deploy time). `npm run preview:cf` runs `wrangler dev`. Start it after `export:web` finishes. Wrangler reloads when `dist/` changes and can briefly 404 `/` mid-export.

`public/_headers` is copied into `dist/` by the Expo export. It is not served as a URL (`GET /_headers` is 404). Unmatched `/_expo/static/*` URLs 404 with the same immutable cache header, because the rule matches the request path. Those names are content hashes, so a 404 stays a 404.

## Deploy command

From the repo root, on Node 22.13 or newer (Expo SDK 57's minimum):

```bash
export EXPO_PUBLIC_API_URL="https://<public-api-origin>"   # no trailing slash
export CLOUDFLARE_API_TOKEN="<token>"
export CLOUDFLARE_ACCOUNT_ID="<account id>"
npm ci
npm run export:web
npx wrangler deploy
```

`npm ci` runs `postinstall`, which applies the `react-native-css` web patch below. Do not pass `--ignore-scripts`.

`npx wrangler deploy` publishes the assets. It does not read `EXPO_PUBLIC_API_URL`. The first successful deploy is served at `financial-agent-ui.<account-subdomain>.workers.dev`. A custom hostname is a later DevOps step (a route or a workers.dev override). This config does not set one.

### What the command needs

| Name | Kind | Where | Purpose |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Build-time variable, public | Shell or GitHub Actions variable, set before `export:web` | API origin inlined into the bundle. Use the public HTTPS origin of `financial-agent-server`. |
| `CLOUDFLARE_API_TOKEN` | Secret | Shell or GitHub Actions secret | Wrangler auth. Custom token with the account permission **Edit Cloudflare Workers**, scoped to this account only. |
| `CLOUDFLARE_ACCOUNT_ID` | Secret or variable | Shell or GitHub Actions secret | Account that owns the Worker. Wrangler reads it from the environment. |

No Worker secrets and no Wrangler `[vars]`. The token must not be committed.

## GitHub Actions outline

DevOps owns the pipeline. This is the shape, not a workflow in the repo:

```yaml
name: Deploy UI
on:
  push:
    branches: [master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run export:web
        env:
          EXPO_PUBLIC_API_URL: ${{ vars.EXPO_PUBLIC_API_URL }}
      - uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
```

A pull-request preview is the same job against a second worker name (`wrangler deploy --name financial-agent-ui-preview`) and a preview value of `EXPO_PUBLIC_API_URL`. Each environment needs its own export, because the origin is baked in.

## Blockers

### Asset and Worker limits are not the constraint

[Workers static asset limits](https://developers.cloudflare.com/workers/platform/limits/) are 25 MiB per file and 20,000 files on the free plan (100,000 on paid; Wrangler 4.34.0 or newer for that higher count). This export is 6 files and the largest is 883 KiB. The Worker size limit (64 MiB) and the free-plan CPU limit (10 ms) apply to a Worker script. This config has none. Static asset requests are not Worker invocations.

`metadata.json` is Expo's export manifest. It has no secrets. It is uploaded with the site.

### The web bundle crashes without a `react-native-css` patch

NativeWind 5 (`nativewind@5.0.0-preview.4`, direct dependency `react-native-css@3.0.7`) rewrites `react-native-web`'s own imports onto its CSS wrappers. The production bundle then throws `Cannot read properties of undefined (reading 'default')` on `FlatList` before React renders. Confirmed in headless Chrome against the unpatched export. The same crash happens on any static host. It is not a Cloudflare runtime gap. Upstream report: [nativewind/react-native-css#380](https://github.com/nativewind/react-native-css/issues/380). `react-native-css@3.1.0-rc.1` still has the bug.

`scripts/patch-react-native-css-web.js` runs from `postinstall` and teaches the Babel plugin and the Metro web resolver to leave files inside `react-native-web` alone. App imports of `react-native` still get the CSS wrappers. The patched export rendered. The script throws if `3.0.7`'s source no longer matches, so a silent upgrade cannot ship a blank page. Remove the patch when that issue is fixed. iOS and Android are outside the guard.

### The deployed UI cannot call the API that exists today

`lausellduane/financial-agent-server` is Express on port 4000 (`app.listen(4000)`), with `cors()` open, `multer` writing to local disk, and a local Ollama client. A page on `*.workers.dev` is HTTPS. The browser will block `http://localhost:4000` and any plain HTTP API (mixed content), and it will not reach the deployer's machine. Set `EXPO_PUBLIC_API_URL` to the public HTTPS origin of whatever the server spike deploys.

The browser calls that origin directly. It does not pass through this Worker, so upload size is a server limit, not a static-asset limit. `POST /api/query` uses `Content-Type: application/json`, which triggers a CORS preflight. The current `cors()` middleware answers that. A Workers port of the server has to keep an `Access-Control-Allow-Origin` for the UI origin (and answer `OPTIONS`) or the hosted page will load and every request will fail in the browser.

### Not blockers

`expo-document-picker` supports web. The picker already runs from the upload button, which is the user gesture the web API requires. No Node built-ins are required in the browser bundle. No D1, KV, or R2 binding belongs on this Worker. The server spike owns storage.
