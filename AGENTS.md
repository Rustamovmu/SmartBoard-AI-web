# SmartBord website

Use this established separate Next.js 16.4.4 Pages Router checkout. Do not convert to App Router or move it into the backend/mobile repository. Read README, docs/Verification.md and the backend's current authentication contract/plans before edits. Use Node 24, Yarn 1.22.22 and yarn.lock; `yarn run check` runs TypeScript, while `yarn check` is Yarn's built-in command.

Preserve real backend current-account/status authorization, Secure/HttpOnly/Strict cookies, exact HTTPS origins, per-POST CSRF and cross-tab credential serialization. Never put tokens in URLs, localStorage, sessionStorage, page props or logs. Keep SSR data/cache request-scoped and account responses no-store. Strict single-use refresh cannot be retried after an ambiguous/lost response. The only browser storage is a credential-free uncertainty marker. Unsupported session coordination must fail safely.

Private lectures/media/notes/OCR/catalog remain on devices. No web account page may fetch a phone library, upload/sync private content or erase files on logout/blocking. Do not fabricate saved captures, AI output, admin services or links to unimplemented functionality.

Inspect the worktree before edits and explicit staging; preserve user changes. Use focused local commits for completed changes, report hashes, and do not push/amend/rebase. References in ../tripLInk-next and ../nestar-next are read-only; their policies do not create additional approval gates here. Keep temporary hosts loopback-only and stop your own services after checks.

Run `yarn run check`, `yarn lint`, `yarn build` and appropriate real browser verification. Use the dedicated test URI only and exact guarded disposable DBs; never application fixtures or a real admin. The macOS browser harness installs temporary constrained CA trust after an explicit `--trust-local-ca` opt-in, verifies TLS without bypass flags, and removes only its own certificate/trust/files and DB. Record actual results and failures; browser checks do not establish native-phone or deployment-wide acceptance.
