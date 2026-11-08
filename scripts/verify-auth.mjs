// Real browser + actual Nest app + real disposable MongoDB. No TLS bypass.
import assert from "node:assert/strict";
import { fork, spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { X509Certificate, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { setDefaultCACertificates, getCACertificates } from "node:tls";
import { chromium, expect } from "@playwright/test";
import { localTls } from "./local-https.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = resolve(
  process.env.SMARTBORD_BACKEND_PATH || join(root, "../SmartBord-AI"),
);
if (process.platform !== "darwin")
  throw new Error(
    "This trust setup currently supports macOS only; use an already trusted local CA on other platforms.",
  );
const development = process.argv.includes("--dev");
const recoveryMode = process.argv.includes("--recovery");
const discussionFocus = process.argv.includes("--discussion-focus");
const discussionMode = process.argv.includes("--discussion") || discussionFocus;
const communityMode = process.argv.includes("--community") || discussionMode;
const helpMode = process.argv.includes("--help") || communityMode;
const adminMode = process.argv.includes("--admin") || helpMode;
const existingTls = process.argv.includes("--local-cert") ? localTls() : null;
if (!existingTls && !process.argv.includes("--trust-local-ca"))
  throw new Error(
    "Pass --trust-local-ca to allow temporary localhost-only user certificate trust, removed in finally.",
  );
const temp = mkdtempSync(join(tmpdir(), "smartbord-browser-auth-"));
const ca = existingTls?.ca || join(temp, "ca.pem"),
  cert = existingTls?.cert || join(temp, "localhost.pem"),
  key = existingTls?.key || join(temp, "localhost-key.pem");
const keychain = join(process.env.HOME, "Library/Keychains/login.keychain-db");
let backendHost,
  webHost,
  browser,
  trusted = false,
  imported = false;
let fingerprint;
let cleanupConfirmed = false;
let verificationError;
let certificateCleanupFailed = false;
let qaPage;
const children = new Set();
const checks = [];
let activeCheck = "TLS/fixture/build setup";
function run(file, args, options = {}) {
  execFileSync(file, args, { stdio: "pipe", ...options });
}
function message(child, kind, timeout = 60_000) {
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(
      () => finish(new Error(`Timed out waiting for ${kind}`)),
      timeout,
    );
    function received(data) {
      if (data.kind === kind) finish(null, data);
    }
    function exited() {
      finish(new Error(`Host exited before ${kind}`));
    }
    function finish(error, data) {
      clearTimeout(timer);
      child.off("message", received);
      child.off("exit", exited);
      if (error) reject(error);
      else resolvePromise(data);
    }
    child.on("message", received);
    child.once("exit", exited);
  });
}
function exited(child) {
  if (child.exitCode !== null || child.signalCode !== null)
    return Promise.resolve();
  return new Promise((resolvePromise) => child.once("exit", resolvePromise));
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const done = exited(child);
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 20_000);
  await done;
  clearTimeout(timer);
}
async function freePort() {
  const server = createServer();
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  return port;
}
async function fixture(kind, userId) {
  const id = randomUUID();
  const done = new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      backendHost.off("message", listener);
      reject(new Error("Fixture command timeout"));
    }, 10_000);
    function listener(data) {
      if (data.id !== id) return;
      clearTimeout(timer);
      backendHost.off("message", listener);
      if (data.kind === "done") resolvePromise(data);
      else reject(new Error("Fixture command rejected"));
    }
    backendHost.on("message", listener);
  });
  backendHost.send({ kind, userId, id });
  return await done;
}
async function check(name, action) {
  activeCheck = name;
  await action();
  checks.push(name);
  console.log(`PASS ${name}`);
}
const interrupted = () => {
  throw new Error("Verification interrupted");
};
// Signals cause the same awaited cleanup as a failed assertion.
const abort = new AbortController();
process.once("SIGINT", () => abort.abort());
process.once("SIGTERM", () => abort.abort());

try {
  if (!existingTls) {
    run("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-subj",
      "/CN=SmartBord temporary localhost test CA",
      "-addext",
      "basicConstraints=critical,CA:TRUE",
      "-addext",
      "keyUsage=critical,keyCertSign,cRLSign",
      "-addext",
      "nameConstraints=critical,permitted;DNS:localhost,permitted;IP:127.0.0.1/255.255.255.255",
      "-keyout",
      join(temp, "ca-key.pem"),
      "-out",
      ca,
    ]);
    run("openssl", [
      "req",
      "-new",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-subj",
      "/CN=localhost",
      "-keyout",
      key,
      "-out",
      join(temp, "localhost.csr"),
    ]);
    writeFileSync(
      join(temp, "extensions.cnf"),
      "subjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n",
    );
    run("openssl", [
      "x509",
      "-req",
      "-days",
      "1",
      "-in",
      join(temp, "localhost.csr"),
      "-CA",
      ca,
      "-CAkey",
      join(temp, "ca-key.pem"),
      "-CAcreateserial",
      "-extfile",
      join(temp, "extensions.cnf"),
      "-out",
      cert,
    ]);
    fingerprint = new X509Certificate(
      readFileSync(ca),
    ).fingerprint256.replaceAll(":", "");
    // Trust only localhost TLS; no system-wide/admin trust and no browser flags
    // that ignore certificate errors. The exact temporary cert is removed below.
    imported = true;
    run("security", [
      "add-trusted-cert",
      "-r",
      "trustRoot",
      "-p",
      "ssl",
      "-k",
      keychain,
      ca,
    ]);
    trusted = true;
  }
  setDefaultCACertificates([
    ...getCACertificates("default"),
    readFileSync(ca, "utf8"),
  ]);
  const webOrigin = `https://localhost:${await freePort()}`;
  const env = {
    ...process.env,
    AUTH_BROWSER_ORIGINS: webOrigin,
    BROWSER_TEST_CERT: cert,
    BROWSER_TEST_KEY: key,
    BROWSER_TEST_HTTP: development ? "1" : "0",
    BROWSER_TEST_ADMIN: adminMode ? "1" : "0",
    BROWSER_TEST_RECOVERY: recoveryMode ? "1" : "0",
    BROWSER_TEST_DISCUSSION: discussionMode ? "1" : "0",
  };
  backendHost = fork(join(backend, "scripts/browser-auth-host.ts"), [], {
    cwd: backend,
    env,
    execArgv: ["-r", "ts-node/register"],
    stdio: ["pipe", "pipe", "pipe", "ipc"],
  });
  // Static backend diagnostics only; never relay raw configuration/errors.
  backendHost.stdout.resume();
  backendHost.stderr.resume();
  const ready = await message(backendHost, "ready");
  assert.match(ready.database, /^sbt_[a-f0-9]{32}$/);
  const apiOrigin = development
    ? `https://localhost:${await freePort()}`
    : ready.origin;
  const webEnv = {
    ...process.env,
    NEXT_PUBLIC_WEB_ORIGIN: webOrigin,
    NEXT_PUBLIC_AUTH_API_ORIGIN: apiOrigin,
    SMARTBORD_API_HTTP_ORIGIN: ready.origin,
    ...(development
      ? {
          SMARTBORD_NEXT_DIST_DIR:
            process.env.SMARTBORD_NEXT_DIST_DIR ||
            ".next/auth-dev-verification",
        }
      : {}),
    NODE_EXTRA_CA_CERTS: ca,
    WEB_TLS_CERT: cert,
    WEB_TLS_KEY: key,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  if (!development) {
    console.log("Building web app for the isolated HTTPS origins…");
    await new Promise((done, reject) => {
      const child = spawn("yarn", ["build"], {
        cwd: root,
        env: webEnv,
        stdio: "inherit",
      });
      children.add(child);
      child.once("error", reject);
      child.once("exit", (code) => {
        children.delete(child);
        if (code === 0) done();
        else reject(new Error("Web build failed"));
      });
    });
  }
  webHost = fork(
    join(root, development ? "scripts/dev.mjs" : "scripts/https-server.mjs"),
    [],
    {
      cwd: root,
      env: webEnv,
      stdio: ["pipe", "pipe", "pipe", "ipc"],
    },
  );
  const devWarnings = [];
  const inspect = (chunk) => {
    if (
      /children.*prop.*title|Hydration failed|hydration mismatch/i.test(
        chunk.toString(),
      )
    )
      devWarnings.push("React title/hydration warning");
  };
  webHost.stdout.on("data", inspect);
  webHost.stderr.on("data", inspect);
  await message(webHost, "ready");
  browser = await chromium.launch({ channel: "chromium" }); // strict certificate verification, default flags
  const context = await browser.newContext({ ignoreHTTPSErrors: false });
  const page = await context.newPage();
  qaPage = page;
  const errors = [];
  page.on("pageerror", () => errors.push("Browser runtime error"));
  page.on("console", (message) => {
    if (
      /children.*prop.*title|Hydration failed|hydration mismatch/i.test(
        message.text(),
      )
    )
      errors.push("React title/hydration warning");
  });
  const api = apiOrigin;
  const email = `web-${randomUUID()}@example.test`,
    password = `Synthetic-${randomUUID()}`;
  let userId, oldCookies;
  const call = (path, body, extra = {}) =>
    page.evaluate(
      async ({ api, path, body, extra }) => {
        const response = await fetch(`${api}/auth/${path}`, {
          method: body === undefined ? "GET" : "POST",
          credentials: "include",
          headers: {
            "X-SmartBord-Client": "browser",
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
            ...extra,
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return { status: response.status, data: await response.json() };
      },
      { api, path, body, extra },
    );

  await check(
    "Trusted HTTPS, responsive layout and anonymous account protection",
    async () => {
      const response = await page.goto(`${webOrigin}/`);
      assert.equal(response.status(), 200);
      await expect(page).toHaveTitle("A clearer space to learn · SmartBord");
      assert.equal(await page.evaluate(() => window.isSecureContext), true);
      await expect(
        page.getByRole("heading", { name: /Good ideas/ }),
      ).toBeVisible();
      await page.screenshot({ path: join(temp, "home-desktop.png") });
      await page.goto(`${webOrigin}/account`);
      await expect(page).toHaveURL(`${webOrigin}/login`);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
      );
      await page.screenshot({ path: join(temp, "login-mobile.png") });
      await page.setViewportSize({ width: 1440, height: 1000 });
    },
  );
  await check(
    "Signup rejects missing CSRF; genuine signup creates USER and secure browser cookies",
    async () => {
      assert.equal(
        (
          await call("signup", {
            email,
            name: "Synthetic Browser Member",
            password,
          })
        ).status,
        403,
      );
      await page.goto(`${webOrigin}/signup`);
      await expect(page).toHaveTitle("Create an account · SmartBord");
      await page.getByLabel("Full name").fill("Synthetic Browser Member");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      // Read the real signup body before releasing it: success navigates away.
      let grant;
      await page.route(`${api}/auth/signup`, async (route) => {
        const response = await route.fetch();
        grant = await response.json();
        await route.fulfill({ response });
      });
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page).toHaveURL(`${webOrigin}/account`);
      await page.unroute(`${api}/auth/signup`);
      assert.equal(grant.user.role, "USER");
      userId = grant.user.id;
      assert.equal("accessToken" in grant || "refreshToken" in grant, false);
      await expect(page).toHaveURL(`${webOrigin}/account`);
      await expect(
        page.getByRole("heading", { name: "Synthetic Browser Member" }),
      ).toBeVisible();
      oldCookies = await context.cookies();
      for (const name of [
        "__Host-sb_access",
        "__Host-sb_refresh",
        "__Host-sb_csrf",
      ]) {
        const cookie = oldCookies.find((c) => c.name === name);
        assert.ok(
          cookie &&
            cookie.secure &&
            cookie.httpOnly &&
            cookie.sameSite === "Strict" &&
            cookie.path === "/" &&
            cookie.domain === "localhost",
        );
      }
      assert.equal(
        await page.evaluate(() => document.cookie.includes("__Host-sb_")),
        false,
      );
      assert.equal(
        await page.evaluate(() =>
          JSON.stringify({ ...localStorage, ...sessionStorage }).includes(
            "Synthetic-",
          ),
        ),
        false,
      );
      const ssr = await context.request.get(`${webOrigin}/account`);
      assert.match(ssr.headers()["cache-control"], /no-store/);
      assert.ok((await ssr.text()).includes(email));
      const other = await browser.newContext();
      const isolated = await other.request.get(`${webOrigin}/account`, {
        maxRedirects: 0,
      });
      assert.equal(isolated.status(), 307);
      assert.equal((await isolated.text()).includes(email), false);
      await other.close();
      await page.screenshot({ path: join(temp, "account-desktop.png") });
    },
  );
  await check("Wrong CSRF and disallowed origins are rejected", async () => {
    assert.equal(
      (await call("logout", {}, { "X-CSRF-Token": "wrong" })).status,
      403,
    );
    const csrf = (await call("csrf")).data.csrfToken;
    const response = await context.request.post(`${api}/auth/logout`, {
      headers: {
        Origin: "https://untrusted.example",
        "X-SmartBord-Client": "browser",
        "X-CSRF-Token": csrf,
      },
      data: {},
    });
    assert.equal(response.status(), 403);
  });
  await check(
    "Expired access refreshes once across two tabs; old access and refresh are rotated",
    async () => {
      await fixture("expire-access", userId);
      const tabs = [page, await context.newPage()];
      let rotations = 0;
      context.on("request", (request) => {
        if (
          request.url() === `${api}/auth/refresh` &&
          request.method() === "POST"
        )
          rotations++;
      });
      await Promise.all(tabs.map((tab) => tab.goto(`${webOrigin}/account`)));
      await Promise.all(
        tabs.map((tab) =>
          expect(
            tab.getByRole("heading", { name: "Synthetic Browser Member" }),
          ).toBeVisible(),
        ),
      );
      assert.equal(rotations, 1);
      const cookies = await context.cookies();
      for (const name of ["__Host-sb_access", "__Host-sb_refresh"])
        assert.notEqual(
          cookies.find((c) => c.name === name).value,
          oldCookies.find((c) => c.name === name).value,
        );
      const stale = await browser.newContext();
      await stale.addCookies(oldCookies);
      const response = await stale.request.get(`${api}/auth/me`, {
        headers: { Origin: webOrigin, "X-SmartBord-Client": "browser" },
      });
      assert.equal(response.status(), 401);
      await stale.close();
      await tabs[1].close();
    },
  );
  await check(
    "Backend outage hides account data and offers retry",
    async () => {
      await page.route(`${api}/auth/**`, (route) => route.abort());
      await page.reload();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "Unable to reach SmartBord",
      );
      await expect(
        page.getByRole("heading", { name: "Synthetic Browser Member" }),
      ).toHaveCount(0);
      await page.unroute(`${api}/auth/**`);
      await page.getByRole("button", { name: "Retry account check" }).click();
      await expect(
        page.getByRole("heading", { name: "Synthetic Browser Member" }),
      ).toBeVisible();
    },
  );
  await check(
    "Logout clears cookies, revokes the real session and updates another tab",
    async () => {
      const tab = await context.newPage();
      await tab.goto(`${webOrigin}/account`);
      await expect(
        tab.getByRole("heading", { name: "Synthetic Browser Member" }),
      ).toBeVisible();
      const before = await context.cookies();
      await page.route(`${api}/auth/logout`, (route) => route.abort());
      await page.getByRole("button", { name: "Log out" }).click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "Unable to reach SmartBord",
      );
      await expect(
        page.getByRole("heading", { name: "Synthetic Browser Member" }),
      ).toBeVisible();
      await expect(page).toHaveURL(`${webOrigin}/account`);
      await page.unroute(`${api}/auth/logout`);
      await page.getByRole("button", { name: "Log out" }).click();
      await expect(page).toHaveURL(/\/login\?session=logged-out$/);
      await expect(tab).toHaveURL(/\/login\?session=ended$/);
      assert.equal(
        (await context.cookies()).some(
          (c) =>
            c.name === "__Host-sb_access" || c.name === "__Host-sb_refresh",
        ),
        false,
      );
      const stale = await browser.newContext();
      await stale.addCookies(before);
      assert.equal(
        (
          await stale.request.get(`${api}/auth/me`, {
            headers: { Origin: webOrigin, "X-SmartBord-Client": "browser" },
          })
        ).status(),
        401,
      );
      await stale.close();
      await tab.close();
    },
  );
  await check(
    "Real login, wrong password, lost refresh response and current blocking",
    async () => {
      await page.getByLabel("Email address").fill(email);
      await page
        .getByLabel("Password", { exact: true })
        .fill("Incorrect-password");
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "Email or password is incorrect",
      );
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(page).toHaveURL(`${webOrigin}/account`);
      await expect(
        page.getByRole("heading", { name: "Synthetic Browser Member" }),
      ).toBeVisible();
      await fixture("expire-access", userId);
      let interruptedRotations = 0;
      let rotationStatus;
      let finishRotation;
      const rotationFinished = new Promise((done) => {
        finishRotation = done;
      });
      await page.route(`${api}/auth/refresh`, async (route) => {
        interruptedRotations++;
        // Commit the real rotation in an isolated transport, then discard the
        // response before this browser receives rotated cookies or JSON.
        const transport = await browser.newContext();
        try {
          rotationStatus = (
            await transport.request.fetch(route.request(), { timeout: 8_000 })
          ).status();
        } catch {
          rotationStatus = 0;
        } finally {
          await transport.close().catch(() => {});
          await route.abort().catch(() => {});
          finishRotation();
        }
      });
      await page.reload();
      await expect(page).toHaveURL(/\/login\?session=ended$/, {
        timeout: 30_000,
      });
      // Navigation may finish before the isolated transport does. Observe the
      // actual committed rotation before asserting or tearing down the context.
      let rotationTimer;
      try {
        await Promise.race([
          rotationFinished,
          new Promise((_, reject) => {
            rotationTimer = setTimeout(
              () => reject(new Error("Lost-refresh observer timed out")),
              15_000,
            );
          }),
        ]);
      } finally {
        clearTimeout(rotationTimer);
      }
      assert.equal(rotationStatus, 200);
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("smartbord:refresh-uncertain"),
        ),
        "1",
      );
      const recoveryTab = await context.newPage();
      await recoveryTab.goto(`${webOrigin}/account`);
      await expect(recoveryTab).toHaveURL(/\/login\?session=ended$/);
      assert.equal(interruptedRotations, 1);
      await recoveryTab.close();
      await page.unroute(`${api}/auth/refresh`);
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(page).toHaveURL(`${webOrigin}/account`);
      await expect(
        page.getByRole("heading", { name: "Synthetic Browser Member" }),
      ).toBeVisible();
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("smartbord:refresh-uncertain"),
        ),
        null,
      );
      await fixture("block", userId);
      await page.reload();
      await expect(page).toHaveURL(/\/login\?session=ended$/, {
        timeout: 30_000,
      });
      assert.equal((await page.content()).includes(email), false);
    },
  );
  await check(
    "Browsers without Web Locks fail before sending credentials",
    async () => {
      const unsupported = await browser.newContext();
      await unsupported.addInitScript(() =>
        Object.defineProperty(navigator, "locks", { value: undefined }),
      );
      const unsupportedPage = await unsupported.newPage();
      let authCalls = 0;
      unsupported.on("request", (request) => {
        if (request.url().startsWith(`${api}/auth/`)) authCalls++;
      });
      await unsupportedPage.goto(`${webOrigin}/login`);
      await unsupportedPage.getByLabel("Email address").fill(email);
      await unsupportedPage
        .getByLabel("Password", { exact: true })
        .fill(password);
      await unsupportedPage.getByRole("button", { name: "Log in" }).click();
      await expect(
        unsupportedPage.getByRole("main").getByRole("alert"),
      ).toContainText("Web Locks");
      assert.equal(authCalls, 0);
      await unsupported.close();
    },
  );
  await check(
    "HTTP signup is disabled before credentials and links to the HTTPS page",
    async () => {
      const plaintext = createHttpServer((incoming, outgoing) => {
        const forwarded = httpsRequest(
          `${webOrigin}${incoming.url}`,
          (response) => {
            outgoing.writeHead(response.statusCode || 502, response.headers);
            response.pipe(outgoing);
          },
        );
        forwarded.on("error", () => {
          outgoing.writeHead(502);
          outgoing.end();
        });
        incoming.pipe(forwarded);
      });
      const anonymous = await browser.newContext();
      try {
        await new Promise((done) => plaintext.listen(0, "127.0.0.1", done));
        const insecure = await anonymous.newPage();
        await insecure.goto(
          `http://127.0.0.1:${plaintext.address().port}/signup`,
        );
        await expect(
          insecure.getByRole("main").getByRole("alert"),
        ).toContainText("Open the secure signup page");
        await expect(
          insecure.getByRole("button", { name: "Create account" }),
        ).toBeDisabled();
        await expect(insecure.getByLabel("Email address")).toBeDisabled();
        await expect(
          insecure.getByRole("link", { name: "Continue to HTTPS" }),
        ).toHaveAttribute("href", `${webOrigin}/signup`);
        await expect(insecure).toHaveTitle("Create an account · SmartBord");
      } finally {
        await anonymous.close();
        plaintext.closeAllConnections();
        await new Promise((done) => plaintext.close(done));
      }
    },
  );
  if (communityMode && !discussionFocus) {
    const { verifyCommunity } = await import("./verify-community.mjs");
    await verifyCommunity({
      browser,
      webOrigin,
      api,
      ready,
      fixture,
      check,
      temp,
    });
  }
  if (discussionMode) {
    const { verifyDiscussion } = await import("./verify-discussion.mjs");
    await verifyDiscussion({
      browser,
      webOrigin,
      api,
      ready,
      fixture,
      check,
      temp,
    });
  }
  if (helpMode && !discussionFocus) {
    const { verifyHelp } = await import("./verify-help.mjs");
    await verifyHelp({ browser, webOrigin, api, ready, check, temp });
  }
  if (adminMode && !discussionFocus) {
    const { verifyAdmin } = await import("./verify-admin.mjs");
    await verifyAdmin({ browser, webOrigin, api, ready, fixture, check, temp });
  }
  if (recoveryMode) {
    const { verifyRecovery } = await import("./verify-recovery.mjs");
    await verifyRecovery({
      browser,
      webOrigin,
      api,
      ready,
      fixture,
      check,
      temp,
    });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(devWarnings, []);
  if (abort.signal.aborted) interrupted();
  console.log(
    `Verified ${checks.length} real browser scenarios (${development ? "development launcher + HTTPS API bridge" : "production build"}). Screenshots: ${temp}`,
  );
  // Optional screenshot export is synthetic UI only, never account credentials.
  if (process.env.AUTH_QA_SCREENSHOTS) {
    const { mkdirSync, copyFileSync } = await import("node:fs");
    mkdirSync(process.env.AUTH_QA_SCREENSHOTS, { recursive: true });
    for (const name of [
      "home-desktop",
      "login-mobile",
      "account-desktop",
      ...(recoveryMode ? ["recovery-desktop", "recovery-mobile"] : []),
      ...(adminMode && !discussionFocus
        ? ["admin-desktop", "admin-mobile"]
        : []),
      ...(helpMode && !discussionFocus
        ? ["help-desktop", "help-mobile", "help-editor"]
        : []),
      ...(discussionMode
        ? ["discussion-public", "discussion-editor", "discussion-reports"]
        : []),
      ...(communityMode && !discussionFocus
        ? ["community-desktop", "community-mobile", "community-editor"]
        : []),
    ])
      copyFileSync(
        join(temp, `${name}.png`),
        join(process.env.AUTH_QA_SCREENSHOTS, `${name}.png`),
      );
  }
} catch (error) {
  verificationError = error;
  if (qaPage && process.env.AUTH_QA_SCREENSHOTS) {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(process.env.AUTH_QA_SCREENSHOTS, { recursive: true });
    await qaPage
      .screenshot({
        path: join(process.env.AUTH_QA_SCREENSHOTS, "failure.png"),
      })
      .catch(() => {});
  }
} finally {
  await qaPage?.unrouteAll({ behavior: "wait" }).catch(() => {});
  await browser?.close();
  await stop(webHost);
  for (const child of children) await stop(child);
  if (backendHost?.connected) {
    const closed = message(backendHost, "closed", 30_000);
    const done = exited(backendHost);
    backendHost.send({ kind: "close" });
    try {
      cleanupConfirmed = (await closed).removed;
      await done;
    } catch {
      await stop(backendHost);
    }
  } else await stop(backendHost);
  try {
    if (trusted) run("security", ["remove-trusted-cert", ca]);
    if (imported) {
      try {
        run("security", ["delete-certificate", "-Z", fingerprint, keychain]);
      } catch (error) {
        if (error.status !== 44) certificateCleanupFailed = true;
      }
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  console.log(
    `Cleanup: temporary hosts stopped; test-owned CA cleanup confirmed: ${!certificateCleanupFailed}; temporary files removed; existing development certificate preserved: ${!!existingTls}; disposable database removal confirmed: ${cleanupConfirmed}.`,
  );
}
if (certificateCleanupFailed)
  throw new Error("Temporary certificate cleanup was not confirmed.");
if (backendHost && !cleanupConfirmed)
  throw new Error("Disposable database cleanup was not confirmed.");
if (verificationError) {
  console.error(
    `Verification failed during: ${activeCheck} (${verificationError.name || "Error"}). Request headers and credentials are redacted.`,
  );
  console.error(
    String(verificationError.message)
      .split("Call log:")[0]
      .replace(/sb_[ar]\.[A-Za-z0-9_.-]+/g, "[credential redacted]")
      .replace(/Synthetic-[A-Za-z0-9-]+/g, "[synthetic password redacted]")
      .slice(0, 1800),
  );
  process.exitCode = 1;
}
