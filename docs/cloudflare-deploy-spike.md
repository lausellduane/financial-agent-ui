# Cloudflare deploy spike: financial-agent-ui

**Recommendation: one hostname.** The UI is a Cloudflare Workers static-asset site. A short Worker script runs only for `/api/*` and forwards those requests to the `financial-agent-server` Worker through a service binding named `API`. Every other request is served as a static asset and does not invoke the script. There is no server-side rendering and no app token. Cloudflare Access sits in front of the UI hostname.

Pages can host the same `dist/` directory. Workers static assets is the fit: Metro writes a static directory, and the `/api` proxy is a service binding on the same Worker. This spike did not deploy. There is no Cloudflare API token here.

## What the web export emits

Expo SDK 57 (`expo ~57.0.12`), React Native 0.86, React Native Web. Entry is `registerRootComponent` in `index.ts`. There is no Expo Router, so `expo.web.output` does not apply and must stay unset.

`npm run export:web` runs `expo export --platform web --clear` (production mode) and writes `dist/`:

| File | Size |
| --- | --- |
| `_expo/static/js/web/index-*.js` | 903,643 bytes (~882 KiB) |
| `_expo/static/css/global-*.css` | 24,254 bytes |
| `favicon.ico` | 14,510 bytes |
| `index.html` | 1,416 bytes |
| `metadata.json` | 49 bytes |
| `_headers` | 145 bytes |

Six files. `index.html` is an empty `<div id="root">` plus a deferred script. The page requires JavaScript. The Worker script that proxies `/api` is separate from this directory. `npx wrangler deploy --dry-run --env=""` uploaded that script at 0.61 KiB gzip 0.36 KiB, with bindings `env.API` (`financial-agent-server`) and `env.ASSETS`.

## SSR and SPA fallback

**SSR: no.** The browser renders one prebuilt bundle.

**SPA fallback: no.** The only screen is `/`. Unknown URLs 404. `not_found_handling` is omitted. SPA mode would also serve `index.html` for a missing `/_expo/static/*` URL, and `public/_headers` marks that prefix immutable.

## Same-origin API

On web, the API base is the page's own origin. `POST /api/upload` and `POST /api/query` hit this Worker, which forwards them. Both fetches set `credentials: "include"`. On a same-origin request that is harmless: the browser sends the UI host's cookies, including the Access `CF_Authorization` cookie. Access then adds `Cf-Access-Jwt-Assertion` to the request the Worker sees. The Worker passes that `Request` to `env.API.fetch` unchanged, so the assertion header, method, body, and query string reach `financial-agent-server`. There is no app bearer token.

`EXPO_PUBLIC_API_URL` changes only the browser's base:

| Value | Web bundle |
| --- | --- |
| unset, blank, or `/` | Same-origin. Requests are `/api/...`. This is the production default. |
| `https://api.example.com/` | `https://api.example.com` (trailing slash removed). The browser calls that host directly and does not use the service binding. |

`npm run export:web` rejects anything that is not empty, `/`, or an absolute `http`/`https` origin with no userinfo, path, query, or hash. It normalizes a valid origin with `URL.origin` before Metro inlines it. Native builds have no same-origin Worker: if the normalized value is empty, the app throws at startup and tells you to set `EXPO_PUBLIC_API_URL`.

Local web against the Express server on port 4000 still sets `EXPO_PUBLIC_API_URL=http://localhost:4000`. Local Android emulator: `http://10.0.2.2:4000`. Those are explicit. An empty production export does not call localhost.

### Origin pair

Use one public hostname for the UI. Origins have no path and no trailing slash.

| Piece | Example |
| --- | --- |
| UI origin, and the origin Access protects | `https://finance.example.com` |
| Browser API base | same origin, so `https://finance.example.com/api/upload` |
| Service binding | name `API`, service `financial-agent-server` |
| Poc override | `wrangler deploy --env poc` binds `API` to `financial-agent-server-poc` |

`services` is not inherited by named environments, so `env.poc` in `wrangler.jsonc` sets that service name itself. `main` and `assets` are inherited. Dry-run of `--env poc` showed `env.API (financial-agent-server-poc)`.

When `EXPO_PUBLIC_API_URL` is a different origin, the browser calls it directly. That host's CORS must allow credentials for the exact UI origin: `Access-Control-Allow-Origin: https://finance.example.com` and `Access-Control-Allow-Credentials: true`. `*` is invalid with credentials. A trailing slash on either origin is a mismatch and the browser hides the response. The default same-origin proxy does not make a browser CORS request. The server Worker should trust `Cf-Access-Jwt-Assertion` on the forwarded request.

## Wrangler

`wrangler.jsonc` sets `main` to `worker/index.ts`, `assets.directory` to `./dist`, `assets.binding` to `ASSETS`, and `assets.run_worker_first` to `["/api/*"]`. Static files, including the hashed bundles, never enter the script. `run_worker_first` is not `true`.

`dev/mock-api/` is a local stand-in named `financial-agent-server`. It is not what `wrangler deploy` publishes. Start it, then the UI, so the dev registry connects the binding:

```bash
npm run preview:api    # port 8788
npm run preview:cf     # port 8787, wrangler dev --env=""
```

Verified on 2026-11-04 with Wrangler 4.157.0:

- `GET /` returned `index.html` with `200` and did not log `forward`.
- `GET /unknown/path` returned `404` and did not log `forward`.
- The hashed JS returned `200` with `Cache-Control: public, max-age=31536000, immutable` and did not log `forward`.
- `POST /api/upload` and `POST /api/query?x=1` logged `forward`, and the mock received the method, path, query string, body, and `Cf-Access-Jwt-Assertion`.
- The dev session reported `env.API (financial-agent-server)` as `local [connected]`.
- Headless Chrome rendered "Secure Cash Management AI" with no runtime exceptions.
- `npx wrangler deploy --dry-run --env=""` and `--env poc` exited without publishing.

`public/_headers` is copied into `dist/` and is not served (`GET /_headers` is 404). Pass `--env=""` on the production deploy. Wrangler warns if you omit it, because `env.poc` also exists.

## Deploy command

From the repo root, on Node 22.13 or newer:

```bash
export CLOUDFLARE_API_TOKEN="<token>"
export CLOUDFLARE_ACCOUNT_ID="<account id>"
# optional; omit for same-origin /api
# export EXPO_PUBLIC_API_URL="https://api.example.com"
npm ci
npm run export:web
npx wrangler deploy --env=""
```

Poc: `npx wrangler deploy --env poc` after the same export. The first production deploy is `financial-agent-ui.<account-subdomain>.workers.dev` unless a route is added. Put Access on the hostname users open. The API Worker does not need its own public hostname for the default path.

`npm ci` runs `postinstall`, which tries the `react-native-css` patch and does not fail the install. `export:web` runs the same patch with `--strict` and fails the export if it cannot apply. Do not pass `--ignore-scripts`.

### What the command needs

| Name | Kind | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | Custom token with account permission **Edit Cloudflare Workers**, scoped to this account. |
| `CLOUDFLARE_ACCOUNT_ID` | Secret or variable | Account that owns the Worker. |
| `EXPO_PUBLIC_API_URL` | Optional build-time public variable | Omit for same-origin `/api`. Set an absolute origin only to bypass the proxy. Never a secret. |

No Worker secrets and no Wrangler `[vars]`. The token must not be committed. The upstream Worker named in the binding has to exist before `/api` calls succeed. This repo does not deploy it.

## GitHub Actions outline

DevOps owns the pipeline. This PR does not add a workflow.

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
          # Omit, or leave empty, for same-origin /api.
          EXPO_PUBLIC_API_URL: ${{ vars.EXPO_PUBLIC_API_URL }}
      - uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env=""
```

A preview deploy is `command: deploy --env poc` (or another env whose `services[0].service` is the preview API Worker). The browser origin is baked only when `EXPO_PUBLIC_API_URL` is an absolute origin. The same-origin bundle is the same for every hostname.

## Blockers

### Asset and Worker limits are not the constraint

[Workers static asset limits](https://developers.cloudflare.com/workers/platform/limits/) are 25 MiB per file and 20,000 files on the free plan (100,000 on paid; Wrangler 4.34.0 or newer). This export is 6 files and the largest is 882 KiB. The proxy script is 0.61 KiB. The free-plan CPU limit applies only when the script runs, which is `/api/*`, not page views. `metadata.json` is Expo's export manifest. It has no secrets.

### The web bundle crashes without a `react-native-css` patch

NativeWind 5 pulls `react-native-css@3.0.7` (pinned exactly). That version rewrites `react-native-web`'s own imports and throws `Cannot read properties of undefined (reading 'default')` on `FlatList` before React renders. Same crash on any static host. Upstream: [nativewind/react-native-css#380](https://github.com/nativewind/react-native-css/issues/380). `3.1.0-rc.1` still has the bug.

`scripts/patch-react-native-css-web.js` locates the package with `require.resolve`. It checks all five edits, then writes. A missing package, a version other than 3.0.7, or source that does not match is a warning and exit 0, so `npm install` still finishes. `export:web` passes `--strict` and fails instead of shipping the blank page. Remove the patch when the upstream issue is fixed.

### The API Worker is a separate deploy

`lausellduane/financial-agent-server` today is Express on port 4000 with `cors()` open, `multer` on local disk, and a local Ollama client. The hosted UI does not call that process. `/api/*` reaches whatever Worker is named `financial-agent-server`. Until that Worker is deployed, the shell loads and API calls fail at the binding. A cross-origin `EXPO_PUBLIC_API_URL` additionally needs the CORS credential rule above.

### Not blockers

`expo-document-picker` supports web and already runs from the upload button. No Node built-ins are required in the browser bundle. No D1, KV, or R2 binding belongs on this Worker.
