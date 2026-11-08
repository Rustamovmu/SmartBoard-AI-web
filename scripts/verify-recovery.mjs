import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { expect } from "@playwright/test";
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
export async function verifyRecovery({
  browser,
  webOrigin,
  api,
  ready,
  fixture,
  check,
  temp,
}) {
  const [target, bystander, administrator] = ready.recoveryFixture;
  assert.equal(ready.recoveryFixture.length, 3);
  const initialPassword = `Synthetic-recovery-${ready.database.slice(4)}`;
  let passwordA = initialPassword;
  const contexts = [],
    diagnostics = [],
    work = new Set();
  let attempts = 0,
    bucket = Math.floor(Date.now() / 60000),
    authCalls = 0;
  async function fresh() {
    const delay = 60100 - (Date.now() % 60000);
    await wait(Math.min(delay, 59000));
    if (delay > 59000) await wait(delay - 59000);
    attempts = 0;
    authCalls = 0;
    bucket = Math.floor(Date.now() / 60000);
  }
  await fresh();
  async function scenario(name, run) {
    if (attempts >= 4 || authCalls >= 28) {
      console.log("Pacing recovery verification within unchanged limits…");
      await fresh();
    }
    await check(name, run);
  }
  async function context(options = {}) {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: false,
      ...options,
    });
    contexts.push(ctx);
    ctx.on("request", (req) => {
      if (bucket !== Math.floor(Date.now() / 60000)) {
        attempts = 0;
        authCalls = 0;
        bucket = Math.floor(Date.now() / 60000);
      }
      if (req.url().startsWith(`${api}/auth/`)) authCalls++;
      if (req.url() === `${api}/auth/password/reset` && req.method() === "POST")
        attempts++;
    });
    ctx.on("page", (page) =>
      page.on("pageerror", () => diagnostics.push("Recovery runtime error")),
    );
    return ctx;
  }
  async function resetPage(ctx) {
    const page = await ctx.newPage();
    await page.goto(`${webOrigin}/reset-password`);
    await expect(
      page.getByRole("button", { name: "Set new password", exact: true }),
    ).toBeEnabled();
    return page;
  }
  async function fill(page, proof, password, confirmation = password) {
    await page.getByLabel("Recovery code", { exact: true }).fill(proof);
    await page.getByLabel("New password", { exact: true }).fill(password);
    await page
      .getByLabel("Confirm new password", { exact: true })
      .fill(confirmation);
  }
  async function submit(page, proof, password) {
    await fill(page, proof, password);
    await page
      .getByRole("button", { name: "Set new password", exact: true })
      .click();
  }
  async function issue(user) {
    const result = await fixture("recovery-issue", user.id);
    assert.ok(
      typeof result.recoveryToken === "string",
      "Private fixture proof missing",
    );
    return result.recoveryToken;
  }
  async function login(ctx, user, password) {
    const page = await ctx.newPage();
    await page.goto(`${webOrigin}/login`);
    await page.getByLabel("Email address").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(`${webOrigin}/account`);
    return page;
  }
  async function me(page) {
    return page.evaluate(
      async (api) =>
        (
          await fetch(`${api}/auth/me`, {
            credentials: "include",
            headers: { "X-SmartBord-Client": "browser" },
          })
        ).status,
      api,
    );
  }
  let page, owner, otherSession, sibling, proofUsed;
  const anonymous = await context();
  try {
    await scenario(
      "Recovery entry point, no-store SSR and no URL credential prefill",
      async () => {
        page = await anonymous.newPage();
        await page.goto(`${webOrigin}/login`);
        await page
          .getByRole("link", { name: "Reset your password", exact: true })
          .click();
        await expect(page).toHaveURL(`${webOrigin}/reset-password`);
        await expect(page.locator("form")).toHaveAttribute("method", "post");
        const response = await page.goto(
          `${webOrigin}/reset-password?ignored=not-a-code#not-a-code`,
        );
        assert.ok(response.headers()["cache-control"].includes("no-store"));
        await expect(page).toHaveURL(`${webOrigin}/reset-password`);
        await expect(
          page.getByLabel("Recovery code", { exact: true }),
        ).toHaveValue("");
        const data = await page.locator("#__NEXT_DATA__").textContent();
        assert.ok(!data.includes("not-a-code"));
        assert.ok(!data.includes("recoveryToken"));
        await expect(
          page.getByText("There is no automated email request here.", {
            exact: false,
          }),
        ).toBeVisible();
      },
    );
    await scenario(
      "Recovery local validation sends nothing and lifecycle events clear sensitive fields",
      async () => {
        let resetCalls = 0;
        const count = (req) => {
          if (req.url() === `${api}/auth/password/reset`) resetCalls++;
        };
        page.on("request", count);
        try {
          const fake = `sb_p.${randomBytes(32).toString("base64url")}`;
          await fill(
            page,
            fake,
            "Synthetic-new-password",
            "Different-new-password",
          );
          await page
            .getByRole("button", { name: "Set new password", exact: true })
            .click();
          await expect(page.getByRole("main").getByRole("alert")).toContainText(
            "do not match",
          );
          assert.equal(resetCalls, 0);
          await fill(page, "x".repeat(48), "Synthetic-new-password");
          await page
            .getByRole("button", { name: "Set new password", exact: true })
            .click();
          await expect(page.getByRole("main").getByRole("alert")).toContainText(
            "complete recovery code",
          );
          assert.equal(resetCalls, 0);
          await fill(page, fake, "Synthetic-new-password");
          await page.evaluate(() =>
            window.dispatchEvent(
              new PageTransitionEvent("pagehide", { persisted: true }),
            ),
          );
          await expect(
            page.getByLabel("Recovery code", { exact: true }),
          ).toHaveValue("");
          await expect(
            page.getByLabel("New password", { exact: true }),
          ).toHaveValue("");
          await fill(page, fake, "Synthetic-new-password");
          await page.evaluate(() => {
            const channel = new BroadcastChannel("smartbord:session");
            channel.postMessage("signed-out");
            channel.close();
          });
          await expect(
            page.getByLabel("Recovery code", { exact: true }),
          ).toHaveValue("");
          assert.equal(resetCalls, 0);
        } finally {
          page.off("request", count);
        }
      },
    );
    await scenario(
      "Invalid, expired and superseded recovery codes have one generic rejection",
      async () => {
        const password = "Synthetic-new-password";
        for (const kind of ["invalid", "expired", "superseded"]) {
          let proof = `sb_p.${randomBytes(32).toString("base64url")}`;
          if (kind !== "invalid") {
            proof = await issue(target);
            if (kind === "expired") await fixture("recovery-expire", target.id);
            else await issue(target);
          }
          await submit(page, proof, password);
          await expect(page.getByRole("main").getByRole("alert")).toContainText(
            "invalid, expired, already used, or no longer available",
          );
          await expect(
            page.getByLabel("Recovery code", { exact: true }),
          ).toHaveValue("");
          await expect(
            page.getByLabel("New password", { exact: true }),
          ).toHaveValue("");
          await expect(
            page.getByRole("button", { name: "Set new password", exact: true }),
          ).toBeEnabled();
        }
      },
    );
    await scenario(
      "Successful reset clears cookies, ends all target sessions and requires normal login",
      async () => {
        owner = await login(await context(), target, passwordA);
        otherSession = await login(await context(), target, passwordA);
        sibling = await owner.context().newPage();
        await sibling.goto(`${webOrigin}/account`);
        await expect(
          sibling.getByRole("heading", { name: target.name, exact: true }),
        ).toBeVisible();
        const resetting = await resetPage(owner.context());
        proofUsed = await issue(target);
        const next = "  Synthetic recovered password  ";
        let posts = 0;
        resetting.on("request", (req) => {
          if (req.url() === `${api}/auth/password/reset`) {
            posts++;
            const keys = Object.keys(req.postDataJSON()).sort();
            assert.deepEqual(keys, ["password", "recoveryToken"]);
            const headers = req.headers();
            assert.equal(headers["x-smartbord-client"], "browser");
            assert.ok(headers["x-csrf-token"]);
            assert.ok(!req.url().includes("sb_p."));
          }
        });
        await submit(resetting, proofUsed, next);
        await expect(
          resetting.getByRole("heading", {
            name: "Password reset complete.",
            exact: true,
          }),
        ).toBeVisible();
        assert.equal(posts, 1);
        assert.ok(
          (await owner.context().cookies()).every(
            (cookie) => !cookie.name.startsWith("__Host-sb_"),
          ),
        );
        await expect(sibling).toHaveURL(/login\?session=ended/);
        await otherSession.evaluate(() =>
          window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true }),
          ),
        );
        await expect(otherSession).toHaveURL(/login\?session=ended/);
        assert.ok(resetting.url().endsWith("/reset-password"));
        await expect(resetting.locator("input")).toHaveCount(0);
        const checking = await anonymous.newPage();
        await checking.goto(`${webOrigin}/login`);
        await checking.getByLabel("Email address").fill(target.email);
        await checking.getByLabel("Password", { exact: true }).fill(passwordA);
        await checking
          .getByRole("button", { name: "Log in", exact: true })
          .click();
        await expect(
          checking.getByRole("main").getByRole("alert"),
        ).toContainText("Email or password is incorrect");
        passwordA = next;
        owner = await login(await context(), target, passwordA);
        await page.goto(`${webOrigin}/reset-password`);
        await submit(page, proofUsed, passwordA);
        await expect(page.getByRole("main").getByRole("alert")).toContainText(
          "invalid, expired, already used, or no longer available",
        );
      },
    );
    await scenario(
      "Recovery while signed into another account clears only the caller browser cookies",
      async () => {
        const caller = await login(await context(), bystander, initialPassword);
        const untouched = await login(
          await context(),
          bystander,
          initialPassword,
        );
        const resetting = await resetPage(caller.context());
        const proof = await issue(target);
        const next = "Synthetic-next-recovery-password";
        await submit(resetting, proof, next);
        await expect(
          resetting.getByRole("heading", {
            name: "Password reset complete.",
            exact: true,
          }),
        ).toBeVisible();
        assert.ok(
          (await caller.context().cookies()).every(
            (cookie) => !cookie.name.startsWith("__Host-sb_"),
          ),
        );
        assert.equal(await me(untouched), 200);
        await owner.evaluate(() =>
          window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true }),
          ),
        );
        await expect(owner).toHaveURL(/login\?session=ended/);
        passwordA = next;
      },
    );
    await scenario(
      "Reset CSRF rejection preserves an existing uncertainty marker and leaves the proof usable",
      async () => {
        await page.goto(`${webOrigin}/reset-password`);
        const proof = await issue(administrator);
        const next = "Synthetic-admin-recovered-password";
        await page.evaluate(() =>
          localStorage.setItem("smartbord:refresh-uncertain", "1"),
        );
        const csrf = async (route) => {
          const response = await route.fetch();
          await route.fulfill({
            response,
            json: { csrfToken: "invalid-nonce" },
          });
        };
        await page.route(`${api}/auth/csrf`, csrf);
        try {
          await submit(page, proof, next);
          await expect(page.getByRole("main").getByRole("alert")).toContainText(
            "reset was refused",
          );
          assert.equal(
            await page.evaluate(() =>
              localStorage.getItem("smartbord:refresh-uncertain"),
            ),
            "1",
          );
        } finally {
          await page.unroute(`${api}/auth/csrf`, csrf);
        }
        await submit(page, proof, next);
        await expect(
          page.getByRole("heading", {
            name: "Password reset complete.",
            exact: true,
          }),
        ).toBeVisible();
        const admin = await login(await context(), administrator, next);
        await expect(
          admin.getByText("Administrator", { exact: true }),
        ).toBeVisible();
      },
    );
    await scenario(
      "Real proof-attempt limits show a retryable rate message without consuming a new proof",
      async () => {
        await fresh();
        await page.goto(`${webOrigin}/reset-password`);
        const proof = await issue(target);
        await fixture("recovery-expire", target.id);
        for (let index = 0; index < 6; index++) {
          await submit(page, proof, "Synthetic-budget-password");
          await expect(page.getByRole("main").getByRole("alert")).toContainText(
            index === 5
              ? "Too many reset attempts"
              : "invalid, expired, already used, or no longer available",
          );
        }
        await expect(
          page.getByRole("button", { name: "Set new password", exact: true }),
        ).toBeEnabled();
      },
    );
    await scenario(
      "Reset outages distinguish CSRF setup failure from an uncertain submitted write",
      async () => {
        await page.goto(`${webOrigin}/reset-password`);
        const proof = await issue(target);
        let posts = 0;
        const observer = (req) => {
          if (req.url() === `${api}/auth/password/reset`) posts++;
        };
        page.on("request", observer);
        const csrf = (route) => route.abort("failed");
        await page.route(`${api}/auth/csrf`, csrf);
        try {
          await submit(page, proof, "Synthetic-outage-password");
          await expect(page.getByRole("main").getByRole("alert")).toContainText(
            "Unable to reach SmartBord",
          );
          await expect(
            page.getByRole("button", { name: "Set new password", exact: true }),
          ).toBeEnabled();
          assert.equal(posts, 0);
        } finally {
          await page.unroute(`${api}/auth/csrf`, csrf);
        }
        const unavailable = (route) =>
          route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ code: "SERVICE_UNAVAILABLE" }),
          });
        await page.route(`${api}/auth/password/reset`, unavailable);
        try {
          await submit(page, proof, "Synthetic-outage-password");
          await expect(page.getByRole("main").getByRole("alert")).toContainText(
            "Unable to confirm whether your password changed",
          );
          await expect(page.locator("form")).toHaveCount(0);
          assert.equal(posts, 1);
        } finally {
          await page.unroute(`${api}/auth/password/reset`, unavailable);
          page.off("request", observer);
        }
        await page
          .getByRole("link", {
            name: "I have a newly issued code",
            exact: true,
          })
          .click();
        await expect(
          page.getByLabel("Recovery code", { exact: true }),
        ).toHaveValue("");
      },
    );
    await scenario(
      "Aborted and committed-but-lost reset responses never replay the proof",
      async () => {
        for (const mode of ["abort", "lost"]) {
          await page.goto(`${webOrigin}/reset-password`);
          const proof = await issue(target);
          const next = `Synthetic-${mode}-recovered-password`;
          let posts = 0,
            committed = false;
          const handler = (route) => {
            posts++;
            const task = (async () => {
              if (mode === "lost") {
                const response = await route.fetch();
                const body = await response.json();
                assert.ok(
                  body.success === true,
                  "Synthetic reset did not commit",
                );
                committed = true;
              }
              await route.abort("failed");
            })();
            work.add(task);
            void task.then(
              () => work.delete(task),
              () => work.delete(task),
            );
            return task;
          };
          await page.route(`${api}/auth/password/reset`, handler);
          try {
            await submit(page, proof, next);
            await expect(
              page.getByRole("main").getByRole("alert"),
            ).toContainText("Unable to confirm whether your password changed");
            await expect(page.locator("form")).toHaveCount(0);
            assert.equal(posts, 1);
            assert.equal(committed, mode === "lost");
            assert.equal(
              await page.evaluate(() =>
                localStorage.getItem("smartbord:refresh-uncertain"),
              ),
              "1",
            );
            await page.reload();
            await expect(
              page.getByLabel("Recovery code", { exact: true }),
            ).toHaveValue("");
            assert.equal(posts, 1);
          } finally {
            await page.unroute(`${api}/auth/password/reset`, handler);
          }
          const signedIn = await login(
            await context(),
            target,
            mode === "lost" ? next : passwordA,
          );
          assert.equal(await me(signedIn), 200);
          if (mode === "lost") passwordA = next;
        }
      },
    );
    await scenario(
      "Inactive-account reset errors stay generic and unsupported Web Locks send no credentials",
      async () => {
        await page.goto(`${webOrigin}/reset-password`);
        const proof = await issue(target);
        await fixture("block", target.id);
        await submit(page, proof, "Synthetic-blocked-password");
        await expect(page.getByRole("main").getByRole("alert")).toContainText(
          "invalid, expired, already used, or no longer available",
        );
        const unsupported = await context();
        await unsupported.addInitScript(() =>
          Object.defineProperty(navigator, "locks", {
            value: undefined,
            configurable: true,
          }),
        );
        const p = await resetPage(unsupported);
        let calls = 0;
        unsupported.on("request", (req) => {
          if (req.url().startsWith(`${api}/auth/`)) calls++;
        });
        await submit(
          p,
          `sb_p.${randomBytes(32).toString("base64url")}`,
          "Synthetic-browser-password",
        );
        await expect(p.getByRole("main").getByRole("alert")).toContainText(
          "Web Locks support",
        );
        assert.equal(calls, 0);
      },
    );
    await scenario(
      "Recovery HTTP safety, responsive controls and credential-free storage/URLs",
      async () => {
        await page.goto(`${webOrigin}/reset-password`);
        await page.screenshot({
          path: join(temp, "recovery-desktop.png"),
          fullPage: true,
          mask: [page.locator("input")],
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page
          .getByRole("button", { name: "Set new password", exact: true })
          .scrollIntoViewIfNeeded();
        await expect(
          page.getByRole("button", { name: "Set new password", exact: true }),
        ).toBeEnabled();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await page.screenshot({
          path: join(temp, "recovery-mobile.png"),
          fullPage: true,
          mask: [page.locator("input")],
        });
        const state = await page.evaluate(() => ({
          local: { ...localStorage },
          session: { ...sessionStorage },
          data: document.querySelector("#__NEXT_DATA__").textContent,
          url: location.href,
        }));
        assert.ok(!JSON.stringify(state).includes("sb_p."));
        assert.ok(!JSON.stringify(state).includes(passwordA));
        assert.ok(!state.data.includes("recoveryToken"));
        assert.ok(
          Object.keys(state.local).every(
            (key) => key === "smartbord:refresh-uncertain",
          ),
        );
        assert.deepEqual(Object.keys(state.session), []);
        const plain = createServer((request, response) => {
          const upstream = httpsRequest(
            `${webOrigin}${request.url}`,
            { method: "GET" },
            (remote) => {
              response.writeHead(remote.statusCode, remote.headers);
              remote.pipe(response);
            },
          );
          upstream.on("error", () => {
            response.writeHead(503);
            response.end();
          });
          upstream.end();
        });
        try {
          await new Promise((done) => plain.listen(0, "127.0.0.1", done));
          const insecure = await (await context()).newPage();
          await insecure.goto(
            `http://127.0.0.1:${plain.address().port}/reset-password`,
          );
          await expect(
            insecure.getByLabel("Recovery code", { exact: true }),
          ).toBeDisabled();
          await expect(
            insecure.getByRole("button", {
              name: "Set new password",
              exact: true,
            }),
          ).toBeDisabled();
          await expect(
            insecure.getByRole("link", {
              name: "Continue to HTTPS",
              exact: true,
            }),
          ).toHaveAttribute("href", `${webOrigin}/reset-password`);
        } finally {
          plain.closeAllConnections();
          await new Promise((done) => plain.close(done));
        }
        assert.deepEqual(diagnostics, []);
      },
    );
  } finally {
    for (const ctx of contexts)
      for (const page of ctx.pages())
        await page.unrouteAll({ behavior: "wait" }).catch(() => {});
    await Promise.allSettled(work);
    for (const ctx of contexts) await ctx.close();
  }
}
