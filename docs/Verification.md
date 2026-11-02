# Web authentication verification

## 2026-11-02 — Authentication increment

Source: existing `smartbord-ai-frontend-web` Pages Router starter on `develop`; Next.js 16.4.4 and React 19.3.0 retained. Backend/mobile repositories stay separate. Yarn 1.22.22 replaces npm here only. Yarn's importer rejected the starter's package-lock v3, so a fresh Yarn resolution was generated with the pinned framework versions and committed as `yarn.lock`.

Implemented: product home/layout, signup/login forms, protected current-account SSR, request-scoped/no-store identity fetch, credentialed browser auth, CSRF, Web Locks across tabs, strict rotating refresh, ambiguous-refresh failure marker, logout, session notifications/revalidation and real pending/denied/outage states. Auth uses the existing backend endpoints without adding a production route or changing cookie/DB policies. SSR never rotates credentials. No authentication credential enters browser storage, HTML/page props, logs or checked-in reports. Only a credential-free refresh-uncertainty flag is persistent in browser storage.

Reference inspection: TripLink `pages/account/join.tsx`, `libs/components/layout/LayoutBasic.tsx` and session/refresh tests; Nestar layout inventory. Adapted route/component/auth boundaries, not roles, ports, business data or token globals. Official Next Pages/SSR, Yarn migration, Playwright browser and Chromium verifier documentation informed the implementation. Chromium ignores macOS hostname-policy trust settings; the harness instead uses SSL trust with critical X.509 name constraints on its ephemeral root. Sources: [Yarn migration](https://classic.yarnpkg.com/lang/en/docs/migrating-from-npm/), [Next SSR](https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props), [Playwright browser modes](https://playwright.dev/docs/browsers), [Chromium verifier](https://chromium.googlesource.com/chromium/src/+/main/net/cert/internal/trust_store_mac.cc).

Final validation: `yarn run check`, `yarn lint` and `yarn build` passed. `AUTH_QA_SCREENSHOTS=/private/tmp/smartbord-auth-qa yarn test:web --trust-local-ca` passed all eight grouped real-browser scenarios with Chromium 156, strict certificate verification and a real, initially empty disposable MongoDB database. Earlier runs stopped for canceled macOS trust authorization, unsupported hostname-scoped platform trust, a missing Node test-client CA and an account outage/retry assertion. Owned fixture databases/listeners/certificates were cleaned after each applicable run; the canceled run created no host/database. These failures are not passing evidence.

Remaining scope: admin screens, password recovery UI, account editing, phone authentication, WebSockets, capture/AI and community. Supported web/API topology is the same hostname on different trusted HTTPS ports. Production TLS/proxy/hosting, other browser engines, real phones/native secure storage and deployment-wide retention are not certified by these local browser tests. No production database or real administrator was used.

The successful production-build browser run covered:

1. Trusted HTTPS navigation, anonymous `/account` redirect, mobile layout and no horizontal overflow.
2. Missing-CSRF rejection, actual signup with USER role, browser grant without access/refresh JSON, Secure/HttpOnly/Strict/host-only cookies, JavaScript cookie isolation, no credentials in web storage, server-rendered no-store identity and isolation from an anonymous browser context.
3. Wrong CSRF and an unapproved Origin rejected by the real backend.
4. Fixture-expired access recovered in two tabs with exactly one refresh, both credentials rotated, old access rejected.
5. Aborted backend requests hide account data and present a working retry.
6. Failed logout stays retryable; successful logout clears credentials, denies old access and causes another tab to return to login.
7. Wrong password message, genuine login, an actual committed refresh whose response is discarded, no repeated refresh from another tab, fresh-login recovery and current account blocking.
8. Missing Web Locks rejects credential submission before any auth request.

The successful harness reported exact owned DB removal and stopped both test HTTPS hosts; it removed its temporary certificate/trust and key directory. A subsequent keychain query found no test CA. Synthetic desktop home/account and mobile login screenshots were visually inspected; no private lecture or real account appeared. The mobile viewport resize screenshot had a compositor artifact, so static layout QA was checked separately before final delivery. No host remains running. No application records, credentials, environment settings or real administrator were changed.

Backend regression validation also passed: lint, non-writing TypeScript inspection, Nest build, 14 unit suites/77 tests, 2 HTTP suites/18 tests, 4 real MongoDB integration suites/73 tests, and official Postman CLI (83 requests/322 assertions, zero failures). Integration and Postman fixtures verified exact disposable DB cleanup and closed their own connections/listeners. These results are separate from native-device or production acceptance.

Changed website files: `.gitignore`, `.env.example`, `AGENTS.md`, `README.md`, `docs/Verification.md`, `package.json`, `yarn.lock`, `next.config.ts`, `scripts/{https-server,verify-auth}.mjs`, `src/auth/{config,types,client,server}.ts`, `src/components/{Layout,AuthForm}.tsx`, `src/pages/{index,signup,login,account}.tsx`, `src/styles/globals.css`; removed `package-lock.json`, starter `src/pages/api/hello.ts`, `src/styles/Home.module.css` and the five unused Next starter SVGs. Existing `_app.tsx` and `_document.tsx` remain. Backend files are recorded in its development progress; mobile files are unchanged.
