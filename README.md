# SmartBord web

Next.js **16.4.4**, React **19.3.0**, TypeScript and the **Pages Router**. This is the separate website repository, alongside `../SmartBord-AI` (Nest backend) and `../SmartBord-AI-frontend` (Capacitor mobile). Use Node 24 and Yarn 1.22.22. The committed `yarn.lock` replaces the npm lockfile; do not generate a second lockfile.

## Implemented

SmartBord home/layout, `/signup`, `/login` and `/account`. Signup/login use the actual Nest HTTP authentication contract. The account page validates current identity server-side on each request, sends `private, no-store`, and renders only a checking/error shell when identity cannot be verified. Browser revalidation handles expired access under a shared Web Lock. Logout revokes the presented browser family and clears backend cookies. Other tabs recheck on session broadcasts, visibility changes and a visible-page one-minute interval.

Credentials stay in backend-issued Secure/HttpOnly/SameSite=Strict `__Host-` cookies; JavaScript receives no access/refresh token. Each POST obtains a CSRF nonce and supplies `X-CSRF-Token`. All cookie writes, including CSRF issuance, share a cross-tab lock. Browser storage contains only a credential-free session-uncertainty marker. A lost/ambiguous refresh response requires a fresh login instead of retrying a potentially spent credential.

Private lectures/photos/notes stay on the user's device. This website has no private-media library, upload, phone sync or remote-delete operation. Public Help/FAQ/announcements and protected Help administration are now implemented. Community posts now provide public reading, author publication and administrator moderation. Community comments and private reason-coded reports now add owner management and administrator review. Native authentication, capture and AI remain future work. B3/F1 physical-phone capture, restart and backend-unavailable reopen proof remains incomplete. See [verification](docs/Verification.md) for actual evidence and limitations.

## Administrator accounts

`/admin` redirects to `/admin/users`. An active ADMIN is required; anonymous visitors go to login and current USER accounts receive a 403 denial without directory data. Expired access renders a checking shell until the browser safely refreshes. Account pages link to administration only for verified administrators. No real administrator is created automatically: use the backend’s explicit local bootstrap process when authorized.

The directory shows name, email, role, status and UTC join date. Role/status filters and 20/50/100-row pagination are retained in validated URL parameters; changing filters resets page 1. Deleted accounts are visible but read-only. Confirmed actions change USER/ADMIN roles or block/unblock ACTIVE/BLOCKED accounts. The confirmation explains that every session for the target ends and fresh login is required. Self-blocking/demotion is allowed when another active admin remains; success returns the actor to login. Last-admin conflicts are enforced transactionally by the backend and explained in the UI.

GraphQL uses the same fixed API origin as authentication. Session validation/refresh, CSRF issuance and the complete response share the existing cross-tab Web Lock. Directory queries use no cache; no credentials or account directory is persisted in browser storage. Permission loss clears the protected view. A failed/ambiguous mutation is never retried automatically: refresh the list to establish current state before submitting another change. A successful change followed by a list outage displays separate success and refresh-error feedback.

Typed operations live in [accounts.graphql](src/graphql/accounts.graphql). The checked-in [schema snapshot](contracts/schema.graphql) comes from the backend’s versioned artifact, without server introspection or Nest/Mongoose imports:

```bash
yarn graphql:sync      # explicitly copy the backend artifact and generate types
yarn graphql:generate  # generate from the website-local snapshot
yarn graphql:check     # check backend/snapshot/generated consistency without editing tracked files
```

The backend path defaults to `../SmartBord-AI`; `SMARTBORD_BACKEND_PATH` overrides it for sync/check and browser verification. A standalone website build needs only its committed snapshot/generated types. Dependencies stay pinned in `yarn.lock`.

Both operations use `POST /graphql`, JSON, browser cookies and `X-SmartBord-Client: browser` plus a current `X-CSRF-Token`, including for queries. An active ADMIN can send `AdminAccounts` with Variables `{"input":{"page":1,"pageSize":20,"role":"USER","status":"BLOCKED"}}`; omit filters to include all. Expected success is `data.adminAccounts` with `{items,page,pageSize,total}`. `AdminUpdateAccountAccess` uses Variables `{"input":{"id":"<disposable UUID>","status":"BLOCKED"}}`, `status: "ACTIVE"` to unblock, or `role: "USER"/"ADMIN"` for role changes. It returns the updated public account. USER requests fail with `FORBIDDEN`; loss of valid identity yields `UNAUTHENTICATED`; changing the last active admin fails with `CONFLICT`. See the [full account contract](../SmartBord-AI/contracts/platform-accounts.md) for HTTP/GraphQL errors and setup. No production API/schema change, account deletion, private phone-library access or remote file command was added.

## Public Help and publishing

`/help` provides FAQs and Announcements without login; `/help/[id]` shows a published entry. Public SSR and browser queries omit all credentials, issue no cookies and bypass no protected operation. Draft, archived and missing valid IDs return 404 publicly. Topic filters/pagination are reflected in URLs; FAQ expansion loads its actual answer on demand. Outages show an error and retry, without fabricated entries.

Before using Help against the application database, an operator must explicitly run the backend's `npm run db:prepare` to create `helpEntries` and its required indexes. **This increment does not execute application setup or create initial content.** Existing readiness still covers only core auth/database checks; Help independently fails closed without its indexes. See [the Help contract](../SmartBord-AI/contracts/help-center.md) for exact operations, Variables, limits, identities and disposable prerequisites.

Active administrators reach `/admin/help` through the protected admin navigation. Create a FAQ or announcement, write a title and Markdown body, choose a FAQ topic and display order, then **Save draft**. New entries always remain unpublished until an explicit **Publish** confirmation. Published edits use **Review published changes** and require confirmation before going live. **Unpublish** moves back to draft. **Archive** retains the entry for administrators; **Restore to draft** makes it editable without publishing. There is no permanent deletion, attachment upload, scheduling or content revision history.

FAQ topics are General, Accounts, Devices, Local storage, Privacy and Other. Lower display order comes first; FAQ ties use creation time, announcements use newest publication time, and both have stable ID tie-breakers. Titles are limited to 160 characters and Markdown to 16384 UTF-8 bytes (the editor shows its byte count). Markdown supports headings, paragraphs, lists, emphasis, quotations, code and HTTP(S)/root-relative/fragment links. Raw HTML, images, embedded media and MDX are disabled in both preview and published rendering; the backend never fetches authored URLs.

Unsaved editor content stays only in memory. Successful same-account identity revalidation preserves it; logout, identity changes and failed verification clear protected state. Navigation warns before discarding edits. Concurrent changes produce a revision conflict with **Reload entry**, rather than silently overwriting another editor. Uncertain writes are never replayed automatically; successful directory reconciliation closes the uncertain editor so the administrator can inspect saved state before another attempt. Known mutation success and a failed refetch have separate feedback.

Run the full auth/admin/Help browser checks in both transports:

```bash
yarn test:web --dev --local-cert --help
yarn test:web --local-cert --help
```

`--help` includes the existing authentication and admin account cases; all records remain synthetic in a guarded disposable database. Authenticated GraphQL retains the existing cross-tab session/CSRF lock. Published queries instead use the explicit `X-SmartBord-Client: public` mode with `credentials: omit`, no auth lock or CSRF issuance. `/graphql` accepts up to 64 KiB JSON and 8 KiB operation documents; authentication requests remain 8 KiB. No community or physical-phone acceptance is implied by these browser tests.

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

Stop the existing frontend and backend dev commands with Ctrl+C. A backend still running on its default port 3000 prevents the HTTPS website from using 3000. Start the existing Nest backend in its own terminal, using a free loopback port:

```bash
# In ../SmartBord-AI (backend keeps npm)
PORT=4001 AUTH_BROWSER_ORIGINS=https://localhost:3000 npm run start:dev
```

Then start the website in this web repository:

```bash
yarn dev
```

Open **https://localhost:3000/signup**. The website is on HTTPS 3000; the development bridge is HTTPS 4000 and streams requests to the backend at `http://127.0.0.1:4001`. Both HTTPS listeners bind loopback only. The launcher sets Node CA trust for its web child, so server-side account checks work as well as browser cookies. The bridge preserves Origin, CSRF, cookies and preflight/response headers; it has a fixed loopback upstream, bounded stream backpressure/timeouts and no body logging, caching or disk buffering. It starts/stops only its own web/bridge listeners and does not launch, stop or prepare the backend. The backend must already have its application schemas prepared. No real administrator or account is created by development setup.

Backend port 4001 is an explicit local invocation here, not a changed backend default. The launcher checks both HTTPS ports before starting its bridge or loading Next. An occupied port produces a concise error and exit 1; it never kills an existing process. The web child also catches a later bind conflict and exits, and a failed/timed-out startup closes the launcher’s own bridge. Use `yarn test:startup` for the real socket/process regression checks. For custom ports/certificates, copy [.env.example](.env.example) to ignored `.env.local`. Match backend `AUTH_BROWSER_ORIGINS` to the exact web origin. This increment supports the **same hostname on different HTTPS ports**; different API subdomains and a same-origin reverse proxy need a separate deployment adapter.

`yarn dev:https` aliases `yarn dev`. `yarn dev:http` is an explicit loopback HTTP layout preview: signup/login fields are disabled and a link leads to the configured HTTPS page. `yarn start` still needs a trusted TLS terminator in normal production hosting. Public origins are compiled into the browser bundle; rebuild after changing them. When supplying custom certificates, `NODE_EXTRA_CA_CERTS` must be set before starting Node, including for SSR. Keep cookie security enabled and use `localhost` consistently in browser URLs.

The source TypeScript check uses `tsconfig.check.json` to avoid collisions between Next's generated development/build validators. Next's own build still validates the Pages Router/production generated types; only the duplicate `.next/dev/types/validator.ts` is excluded when both caches coexist.

## Real browser verification (macOS)

Prerequisites: installed backend dependencies; the backend's ignored `.env` containing a dedicated **`MONGODB_TEST_URI`** with no application database path; OpenSSL; macOS `security`; Playwright Chromium (`yarn playwright install chromium` if absent). Never use `MONGO_DEV` or `MONGODB_URI` as test fallbacks.

```bash
yarn test:web --trust-local-ca
# After local certificate setup, reuse it without another trust dialog:
yarn test:web --dev --local-cert
yarn test:web --local-cert
# Include the admin account scenarios in either transport mode:
yarn test:web --dev --local-cert --admin
yarn test:web --local-cert --admin
```

Approve the macOS certificate-trust dialog when it appears. The command creates a one-day CA constrained by X.509 name constraints to localhost/127.0.0.1, temporarily trusts it for SSL in the user's login keychain, and launches Chromium with strict certificate validation. It builds the website for generated same-host HTTPS ports and runs against the real backend and an initially empty `sbt_<32 hex digits>` MongoDB database. Fixtures for access expiry/account blocking use a private process channel, never a production HTTP route. Only synthetic accounts are created. The explicit `--admin` mode additionally seeds two administrators and 24 members through existing services after guarded empty-database preparation; non-active states are then established through the real GraphQL API. Test credentials are derived only in process memory from the disposable run marker, never saved as real credentials.

The `--dev` mode runs the actual HTTPS development launcher and API bridge against a disposable HTTP backend. Production mode uses the production web build and direct disposable HTTPS backend. Both verify that HTTP signup is disabled before credential entry and that the React title/hydration warning is absent. `--local-cert` reuses/preserves the configured development certificate/trust; otherwise the harness owns a temporary test CA.

The harness closes its own browser/listeners, verifies exact DB identity before removal, removes its test-owned CA trust/certificate and deletes its temporary keys/files. Existing development certificates are preserved in `--local-cert` mode. It refuses production mode and does not create a real administrator. An explicit cleanup confirmation is required for success. Forced termination/power loss can interrupt cleanup; inspect the exact owned test resources rather than deleting databases by prefix. Optional `AUTH_QA_SCREENSHOTS=/private/tmp/smartbord-auth-qa` retains synthetic UI screenshots only. No raw token/report is saved. The generated `.next` build uses that run's ports; rebuild for your normal origins afterward.

The backend [authentication contract](../SmartBord-AI/contracts/authentication.md), [frontend plan](../SmartBord-AI/docs/Frontend_plan.md) and [backend plan](../SmartBord-AI/docs/Backend_plan.md) distinguish implemented behavior from V2 targets. The references' layout/form/session boundaries were inspected without copying business fields, credentials, global token caches or their approval policies.

## Community posts V1

Public `/community` and `/community/[id]` read intentionally published general text without credentials. `/account/posts` lets any current active account explicitly save a server draft, edit it, publish with confirmation, save confirmed live edits, or withdraw to draft. A chosen per-post public display name defaults from the account name but is editable; account ID/email are excluded from public DTOs. Saved community drafts are administrator-readable, as disclosed before saving. Unsent buffers stay in memory. There is no recording picker, attachment, transcript import or phone-library access.

Current administrators inspect drafts/published/removed text at `/admin/community`. They can remove with SPAM, ABUSE, PRIVACY, OFF_TOPIC or OTHER, and restore only to draft. They cannot rewrite another author's text or publish it. Removal locks owner edits/publication until restoration. Owners can inspect the removed post/reason. Withdrawal/removal retain server text; V1 has no permanent deletion or content history. Blocking revokes account access but leaves published posts visible until separately moderated. Comments and reports extend this surface below; reactions and search remain deferred.

Both views use expected revisions, safe Markdown, the shared cookie/CSRF lock and current-account revalidation. Lost/ambiguous writes are never automatically retried; refresh for read-only reconciliation first. Conflicts require reload. Protected post data never enters SSR page props, persistent browser storage or a shared Apollo cache. No publication action reads private device files. See the [community contract](../SmartBord-AI/contracts/community.md) for exact operations/Variables, validation and disposable prerequisites.

Run `yarn test:web --dev --local-cert --community` and `yarn test:web --local-cert --community`. `--community` includes authentication, administrator accounts and Help regression groups, uses strict TLS and guarded disposable MongoDB, and stops its own hosts/connections. It is desktop browser evidence, not native-phone acceptance.

**Rollout is separate.** Explicitly prepare and verify Help indexes before updating the running backend and website; prepare/verify community indexes from the release setup tooling before enabling community. No application/production setup, content seed or deployment is performed by this increment. Core readiness does not certify Help/community indexes. B3/F1 physical-phone capture, restart and backend-unavailable reopen proof remains incomplete.

## Community discussion and reports

`/community/[id]` now includes credential-free paginated comments and links to protected writing/reporting. `/account/comments?postId=<UUID>&compose=1` opens an in-memory composer. **Publish comment** confirms immediate public publication, with an editable public name (80 characters) and Markdown (4096 UTF-8 bytes). Owners edit, withdraw or republish at `/account/comments`. Withdrawal retains server text. Removed comments remain readable with their reason but are locked until administrator restoration to draft. Parent visibility is always enforced: hidden parents hide public discussion and prevent new comments, edits, republication and new reports, while owners may still withdraw comments. No threading/replies, attachments or private lecture importer exists.

`/account/reports?targetType=COMMENT&targetId=<UUID>` (or POST) submits one reason-coded report per account/target for its lifetime. Reports are private to their reporter and administrators; they accept no free text or attachment. `/account/reports` shows retained history/outcomes. `/admin/comments` provides reasoned removal/restore-to-draft. `/admin/reports` provides private review, exact current target inspection, separate content moderation and OPEN → RESOLVED/DISMISSED outcomes. Reports and review outcomes do not automatically hide text. Revision conflicts and uncertain responses require read-only reconciliation rather than write replay. Known save success and directory-read failure are reported separately.

All protected pages reuse current-account revalidation, the cross-tab auth/CSRF lock, no-cache generated operations, unsaved-text navigation guards and logout/revocation clearing. Protected comment/report data is absent from SSR props and persistent browser storage. Public discussion reuses the restricted Markdown renderer. See [exact operations, Variables and disposable prerequisites](../SmartBord-AI/contracts/community-discussion.md). Backend shared content-write limits are unchanged (20/account/minute); report submission also has 10/account/minute.

Run the complete regression in both transports:

```bash
yarn test:web --dev --local-cert --discussion
yarn test:web --local-cert --discussion
```

`--discussion` includes auth/admin/Help/community regressions. `--discussion-focus` runs auth plus discussion for iteration only. The expanded mode bounds its disposable backend to 30 minutes to accommodate conservative pacing; ordinary modes retain 15 minutes. Fixtures can remove/restore only fixed comment/report indexes through private guarded IPC, never a production endpoint. Prepare/verify new `communityComments` and `reports` indexes explicitly with release setup tooling before updating running services. No application schema setup, real administrator, content seed, phone change or deployment is included.

## Password reset

The login page links to `/reset-password`. Ask the operator who administers your account to verify ownership and privately provide a recovery code, then paste it into the masked form and enter a new password twice. Codes expire after 15 minutes and are single use. There is no automated email-request form or web proof issuer. New passwords use 12–128 characters and preserve spaces.

The form uses POST, rejects URL prefill and sends only the code/new password to the existing backend reset endpoint over trusted HTTPS with CSRF and the shared cross-tab auth lock. Inputs stay out of React state, SSR props, browser storage and logs; they clear after attempts, history events and session notifications. Invalid/expired/used codes have one generic error. Pending requests cannot be duplicated. A lost/unknown response never retries the code automatically: try signing in with the new password, or ask the operator for a newly issued code before explicitly starting over. The existing credential-free uncertainty marker also prevents unsafe session refresh after an ambiguous reset.

Success ends all sessions for the recovered account, clears this browser's auth cookies even if it belonged to another account, and requires normal login. Other accounts' server sessions and private device files remain intact. No real-account issuance/reset is performed by verification. See the [recovery contract](../SmartBord-AI/contracts/password-recovery.md).

```bash
yarn test:web --dev --local-cert --recovery
yarn test:web --local-cert --recovery
```

`--recovery` includes the existing auth regression groups and uses three fixed synthetic recovery identities in an exact, initially empty disposable database. Proofs are issued/expired only by private guarded parent IPC and are never saved in command arguments, URLs, reports or artifacts. Use an isolated `SMARTBORD_NEXT_DIST_DIR` when running independent verifications concurrently; keep user-started development hosts/caches untouched. These checks do not certify human ownership verification, email/clipboard delivery, real-account recovery, native files or production hosting.
