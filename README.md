# SmartBord web

Next.js **16.4.4**, React **19.3.0**, TypeScript and the **Pages Router**. This is the separate website repository, alongside `../SmartBord-AI` (Nest backend) and `../SmartBord-AI-frontend` (Capacitor mobile). Use Node 24 and Yarn 1.22.22. The committed `yarn.lock` replaces the npm lockfile; do not generate a second lockfile.

## Implemented

SmartBord home/layout, `/signup`, `/login` and `/account`. Signup/login use the actual Nest HTTP authentication contract. The account page validates current identity server-side on each request, sends `private, no-store`, and renders only a checking/error shell when identity cannot be verified. Browser revalidation handles expired access under a shared Web Lock. Logout revokes the presented browser family and clears backend cookies. Other tabs recheck on session broadcasts, visibility changes and a visible-page one-minute interval.

Credentials stay in backend-issued Secure/HttpOnly/SameSite=Strict `__Host-` cookies; JavaScript receives no access/refresh token. Each POST obtains a CSRF nonce and supplies `X-CSRF-Token`. All cookie writes, including CSRF issuance, share a cross-tab lock. Browser storage contains only a credential-free interrupted-refresh marker. A lost/ambiguous refresh response requires a fresh login instead of retrying a potentially spent credential.

Private lectures/photos/notes stay on the user's device. This website has no private-media library, upload, phone sync or remote-delete operation. Native authentication, admin screens, community, capture and AI are future work. See [verification](docs/Verification.md) for actual evidence and limitations.

## Local setup

```bash
yarn install --frozen-lockfile
yarn run check
yarn lint
yarn build
```

Use **`yarn run check`**, because `yarn check` invokes Yarn's built-in dependency checker.

Copy [.env.example](.env.example) to ignored `.env.local` and configure exact HTTPS origins and trusted local certificate/key paths. This increment supports the **same hostname on different HTTPS ports**, such as web `https://localhost:3000` and API `https://localhost:4000`. This both gives browser fetches an Origin header and lets request-scoped SSR validate the API's host-only cookies. Different API subdomains or a same-origin reverse proxy need a separate reviewed deployment adapter; they are not supported by the current client. Do not weaken cookie security or mix `localhost` and `127.0.0.1` in browser URLs.

Set backend `AUTH_BROWSER_ORIGINS` to the exact web origin. The backend must already have its platform schemas prepared. It normally serves loopback HTTP; supply a trusted TLS terminator for ordinary local operation. The disposable verification harness below creates its own actual HTTPS Nest host and prepares only its generated test DB. It never changes the normal backend host, credentials, ports or application records.

```bash
yarn dev:https
```

`yarn dev` retains the starter HTTP development command for layout work; it cannot authenticate. `yarn start` likewise needs a trusted TLS terminator for login. Public origins are compiled into the browser bundle; rebuild after changing them. `NODE_EXTRA_CA_CERTS` must be set **before** starting Node when using a private local CA. It is needed by SSR as well as the browser's own trusted root.

## Real browser verification (macOS)

Prerequisites: installed backend dependencies; the backend's ignored `.env` containing a dedicated **`MONGODB_TEST_URI`** with no application database path; OpenSSL; macOS `security`; Playwright Chromium (`yarn playwright install chromium` if absent). Never use `MONGO_DEV` or `MONGODB_URI` as test fallbacks.

```bash
yarn test:web --trust-local-ca
```

Approve the macOS certificate-trust dialog when it appears. The command creates a one-day CA constrained by X.509 name constraints to localhost/127.0.0.1, temporarily trusts it for SSL in the user's login keychain, and launches Chromium with strict certificate validation. It builds the website for generated same-host HTTPS ports and runs against the real backend and an initially empty `sbt_<32 hex digits>` MongoDB database. Fixtures for access expiry/account blocking use a private process channel, never a production HTTP route. Only synthetic accounts are created.

The harness closes its own browser/listeners, verifies exact DB identity before removal, removes its CA trust/certificate and deletes its temporary keys/files. It refuses production mode and does not create a real administrator. An explicit cleanup confirmation is required for success. Forced termination/power loss can interrupt cleanup; inspect the exact owned test resources rather than deleting databases by prefix. Optional `AUTH_QA_SCREENSHOTS=/private/tmp/smartbord-auth-qa` retains synthetic UI screenshots only. No raw token/report is saved. The generated `.next` build uses that run's ports; rebuild for your normal origins afterward.

The backend [authentication contract](../SmartBord-AI/contracts/authentication.md), [frontend plan](../SmartBord-AI/docs/Frontend_plan.md) and [backend plan](../SmartBord-AI/docs/Backend_plan.md) distinguish implemented behavior from V2 targets. The references' layout/form/session boundaries were inspected without copying business fields, credentials, global token caches or their approval policies.
