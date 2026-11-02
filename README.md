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

The normal development command uses trusted **HTTPS** for the website and a local API bridge. Complete the one-time macOS certificate setup in this web repository:

```bash
yarn setup:https --trust-local-ca
```

Approve the macOS trust dialog. This generates a one-year localhost CA/leaf certificate and private keys in ignored `.certs/`, with restricted file permissions. The CA is SSL-only in your user keychain and constrained by X.509 name constraints to localhost/127.0.0.1. Files/trust remain available for subsequent development sessions. They are never committed. Remove this checkout’s trust later with `yarn setup:https --remove-trust`; that command preserves the local files. Existing or partial certificate sets are not silently overwritten.

Stop the old HTTP dev command with Ctrl+C. Start the existing Nest backend in its own terminal, using a free loopback port:

```bash
# In ../SmartBord-AI (backend keeps npm)
PORT=4001 AUTH_BROWSER_ORIGINS=https://localhost:3000 npm run start:dev
```

Then start the website in this web repository:

```bash
yarn dev
```

Open **https://localhost:3000/signup**. The website is on HTTPS 3000; the development bridge is HTTPS 4000 and streams requests to the backend at `http://127.0.0.1:4001`. Both HTTPS listeners bind loopback only. The launcher sets Node CA trust for its web child, so server-side account checks work as well as browser cookies. The bridge preserves Origin, CSRF, cookies and preflight/response headers; it has a fixed loopback upstream, bounded stream backpressure/timeouts and no body logging, caching or disk buffering. It starts/stops only its own web/bridge listeners and does not launch, stop or prepare the backend. The backend must already have its application schemas prepared. No real administrator or account is created by development setup.

Backend port 4001 is an explicit local invocation here, not a changed backend default. If ports are busy, the launcher reports the conflict; it never kills an existing process. For custom ports/certificates, copy [.env.example](.env.example) to ignored `.env.local`. Match backend `AUTH_BROWSER_ORIGINS` to the exact web origin. This increment supports the **same hostname on different HTTPS ports**; different API subdomains and a same-origin reverse proxy need a separate deployment adapter.

`yarn dev:https` aliases `yarn dev`. `yarn dev:http` is an explicit loopback HTTP layout preview: signup/login fields are disabled and a link leads to the configured HTTPS page. `yarn start` still needs a trusted TLS terminator in normal production hosting. Public origins are compiled into the browser bundle; rebuild after changing them. When supplying custom certificates, `NODE_EXTRA_CA_CERTS` must be set before starting Node, including for SSR. Keep cookie security enabled and use `localhost` consistently in browser URLs.

The source TypeScript check uses `tsconfig.check.json` to avoid collisions between Next's generated development/build validators. Next's own build still validates the Pages Router/production generated types; only the duplicate `.next/dev/types/validator.ts` is excluded when both caches coexist.

## Real browser verification (macOS)

Prerequisites: installed backend dependencies; the backend's ignored `.env` containing a dedicated **`MONGODB_TEST_URI`** with no application database path; OpenSSL; macOS `security`; Playwright Chromium (`yarn playwright install chromium` if absent). Never use `MONGO_DEV` or `MONGODB_URI` as test fallbacks.

```bash
yarn test:web --trust-local-ca
# After local certificate setup, reuse it without another trust dialog:
yarn test:web --dev --local-cert
yarn test:web --local-cert
```

Approve the macOS certificate-trust dialog when it appears. The command creates a one-day CA constrained by X.509 name constraints to localhost/127.0.0.1, temporarily trusts it for SSL in the user's login keychain, and launches Chromium with strict certificate validation. It builds the website for generated same-host HTTPS ports and runs against the real backend and an initially empty `sbt_<32 hex digits>` MongoDB database. Fixtures for access expiry/account blocking use a private process channel, never a production HTTP route. Only synthetic accounts are created.

The `--dev` mode runs the actual HTTPS development launcher and API bridge against a disposable HTTP backend. Production mode uses the production web build and direct disposable HTTPS backend. Both verify that HTTP signup is disabled before credential entry and that the React title/hydration warning is absent. `--local-cert` reuses/preserves the configured development certificate/trust; otherwise the harness owns a temporary test CA.

The harness closes its own browser/listeners, verifies exact DB identity before removal, removes its test-owned CA trust/certificate and deletes its temporary keys/files. Existing development certificates are preserved in `--local-cert` mode. It refuses production mode and does not create a real administrator. An explicit cleanup confirmation is required for success. Forced termination/power loss can interrupt cleanup; inspect the exact owned test resources rather than deleting databases by prefix. Optional `AUTH_QA_SCREENSHOTS=/private/tmp/smartbord-auth-qa` retains synthetic UI screenshots only. No raw token/report is saved. The generated `.next` build uses that run's ports; rebuild for your normal origins afterward.

The backend [authentication contract](../SmartBord-AI/contracts/authentication.md), [frontend plan](../SmartBord-AI/docs/Frontend_plan.md) and [backend plan](../SmartBord-AI/docs/Backend_plan.md) distinguish implemented behavior from V2 targets. The references' layout/form/session boundaries were inspected without copying business fields, credentials, global token caches or their approval policies.
