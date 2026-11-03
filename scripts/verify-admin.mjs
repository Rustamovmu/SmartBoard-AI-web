// Real browser cases, invoked by verify-auth.mjs --admin under its owned TLS/DB lifecycle.
import assert from "node:assert/strict";
import { join } from "node:path";
import { expect } from "@playwright/test";

const list = `query($input: AccountsInput!) { adminAccounts(input: $input) { items { id email name role status createdAt } page pageSize total } }`;
const update = `mutation($input: UpdateAccountAccessInput!) { adminUpdateAccountAccess(input: $input) { id role status } }`;
const delay = (ms) => new Promise((done) => setTimeout(done, ms));

export async function verifyAdmin({
  browser,
  webOrigin,
  api,
  ready,
  fixture,
  check,
  temp,
}) {
  assert.equal(ready.adminFixture.length, 26);
  const [adminA, adminB, ...members] = ready.adminFixture;
  const password = `Synthetic-admin-${ready.database.slice(4)}`;
  const contexts = [];
  const diagnostics = [];
  const routeWork = new Set();
  const counts = new Map();
  let bucket = Math.floor(Date.now() / 60000);
  // Account for unobserved server-side /me requests with a conservative margin.
  async function pace() {
    if (bucket !== Math.floor(Date.now() / 60000)) {
      counts.clear();
      bucket = Math.floor(Date.now() / 60000);
    }
    if (Math.max(0, ...counts.values()) >= 32) {
      console.log("Pacing admin verification within unchanged API limits…");
      await delay(60100 - (Date.now() % 60000));
      counts.clear();
      bucket = Math.floor(Date.now() / 60000);
    }
  }
  // Earlier auth groups share the same loopback IP; begin a fresh fixed window.
  await delay(60100 - (Date.now() % 60000));
  async function scenario(name, run) {
    await pace();
    await check(name, run);
  }
  async function context() {
    const item = await browser.newContext({ ignoreHTTPSErrors: false });
    contexts.push(item);
    item.on("request", (request) => {
      if (!request.url().startsWith(api)) return;
      if (bucket !== Math.floor(Date.now() / 60000)) {
        counts.clear();
        bucket = Math.floor(Date.now() / 60000);
      }
      const path = new URL(request.url()).pathname;
      counts.set(path, (counts.get(path) || 0) + 1);
    });
    item.on("page", (page) => {
      page.on("pageerror", () =>
        diagnostics.push("Admin browser runtime error"),
      );
      page.on("console", (message) => {
        if (/hydration|children.*prop.*title/i.test(message.text()))
          diagnostics.push("Admin hydration/title warning");
      });
    });
    return item;
  }
  async function login(ctx, user) {
    const page = await ctx.newPage();
    await page.goto(`${webOrigin}/login`);
    await page.getByLabel("Email address").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(`${webOrigin}/account`);
    await expect(page.getByRole("heading", { name: user.name })).toBeVisible();
    return page;
  }
  async function gql(page, query, input, csrf = true) {
    return page.evaluate(
      async ({ api, query, input, csrf }) => {
        let token = "incorrect";
        if (csrf === true)
          token = (
            await (
              await fetch(`${api}/auth/csrf`, {
                credentials: "include",
                headers: { "X-SmartBord-Client": "browser" },
              })
            ).json()
          ).csrfToken;
        const result = await fetch(`${api}/graphql`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-SmartBord-Client": "browser",
            ...(csrf === false ? {} : { "X-CSRF-Token": token }),
          },
          body: JSON.stringify({ query, variables: { input } }),
        });
        return { status: result.status, body: await result.json() };
      },
      { api, query, input, csrf },
    );
  }
  const row = (page, user) =>
    page.getByRole("row").filter({ hasText: user.email });
  const alert = (page) => page.getByRole("main").getByRole("alert");
  async function directory(page, query = "") {
    await page.goto(`${webOrigin}/admin/users${query}`);
    await expect(
      page.getByRole("button", { name: "Refresh list" }),
    ).toBeEnabled({ timeout: 20000 });
  }
  async function change(page, user, action, confirm = true) {
    await row(page, user)
      .getByRole("button", { name: action, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(user.email);
    await expect(page.getByRole("dialog")).toContainText("ends all sessions");
    const confirmation = page.getByRole("button", {
      name: confirm ? "Confirm change" : "Cancel",
      exact: true,
    });
    if (confirm) {
      await confirmation.focus();
      await confirmation.press("Enter");
    } else await confirmation.click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    if (confirm && ![adminA.id, adminB.id].includes(user.id))
      await expect(
        page.getByRole("button", { name: "Refresh list" }),
      ).toBeEnabled();
  }
  let a, b, memberPage, ca, cb, cm;
  try {
    await scenario(
      "Admin route/Next data protection, current roles, CSRF and isolated SSR",
      async () => {
        const anonymous = await context();
        const p = await anonymous.newPage();
        await p.goto(`${webOrigin}/admin`);
        await expect(p).toHaveURL(`${webOrigin}/login`);
        cm = await context();
        memberPage = await login(cm, members[0]);
        await expect(
          memberPage.getByRole("link", { name: /Manage platform/ }),
        ).toHaveCount(0);
        const denied = await memberPage.goto(`${webOrigin}/admin/users`);
        assert.equal(denied.status(), 403);
        await expect(
          memberPage.getByRole("heading", { name: "Access denied" }),
        ).toBeVisible();
        assert.equal(
          (await gql(memberPage, list, {})).body.errors[0].extensions.code,
          "FORBIDDEN",
        );
        assert.equal(
          (await gql(memberPage, update, { id: adminA.id, role: "USER" })).body
            .errors[0].extensions.code,
          "FORBIDDEN",
        );
        ca = await context();
        a = await login(ca, adminA);
        await expect(
          a.getByRole("link", { name: /Manage platform accounts/ }),
        ).toBeVisible();
        cb = await context();
        b = await login(cb, adminB);
        // Seed non-active statuses through the real administrator API, never fixtures in application records.
        assert.ok(
          (await gql(a, update, { id: members[10].id, status: "BLOCKED" })).body
            .data,
        );
        assert.ok(
          (await gql(a, update, { id: members[11].id, status: "DELETED" })).body
            .data,
        );
        assert.equal((await gql(a, list, {}, false)).status, 403);
        assert.equal((await gql(a, list, {}, "wrong")).status, 403);
        const ssr = await ca.request.get(`${webOrigin}/admin/users`);
        assert.match(ssr.headers()["cache-control"], /no-store/);
        const html = await ssr.text();
        assert.equal(html.includes(members[1].email), false);
        const buildId = (await a.evaluate(() => window.__NEXT_DATA__)).buildId;
        const nextData = await cm.request.get(
          `${webOrigin}/_next/data/${buildId}/admin/users.json`,
        );
        assert.equal(nextData.status(), 403);
        assert.match(nextData.headers()["cache-control"], /no-store/);
        assert.equal((await nextData.text()).includes(adminA.email), false);
        const isolated = await anonymous.request.get(
          `${webOrigin}/_next/data/${buildId}/admin/users.json`,
        );
        assert.equal((await isolated.text()).includes(adminA.email), false);
        await anonymous.close();
      },
    );
    await scenario(
      "Admin account pagination, URL validation, role/status filters and read-only deleted accounts",
      async () => {
        await directory(a);
        await expect(
          a.getByRole("navigation", { name: "Account pagination" }),
        ).toContainText("27 matching accounts");
        assert.equal(await a.locator("tbody tr").count(), 20);
        await a.getByRole("button", { name: "Next", exact: true }).click();
        await expect(
          a.getByRole("navigation", { name: "Account pagination" }),
        ).toContainText("Page 2");
        await a.getByLabel("Role filter").selectOption("ADMIN");
        await expect(a.locator("tbody tr")).toHaveCount(2);
        await expect(a).toHaveURL(/page=1/);
        await a.getByLabel("Status filter").selectOption("BLOCKED");
        await expect(
          a.getByText("No accounts match these filters."),
        ).toBeVisible();
        await a.getByLabel("Role filter").selectOption("USER");
        await expect(a.locator("tbody tr")).toHaveCount(2); // prior auth member + seeded blocked
        await a.getByLabel("Status filter").selectOption("DELETED");
        await expect(a.locator("tbody tr")).toHaveCount(1);
        await expect(a.locator("tbody")).toContainText("Read only");
        await expect(a.locator("tbody button")).toHaveCount(0);
        await directory(a, "?page=-1&pageSize=21&role=AGENT&status=unknown");
        await expect(a.getByLabel("Rows per page")).toHaveValue("20");
        await expect(a.getByLabel("Role filter")).toHaveValue("");
        await a.getByLabel("Rows per page").selectOption("50");
        await expect(a.locator("tbody tr")).toHaveCount(27);
        await a.reload();
        await expect(a.getByLabel("Rows per page")).toHaveValue("50");
      },
    );
    await scenario(
      "Admin stale responses are discarded during filter navigation",
      async () => {
        await a.goto(`${webOrigin}/admin`);
        await expect(a).toHaveURL(`${webOrigin}/admin/users`);
        await directory(a, "?pageSize=50");
        await a
          .getByRole("navigation", { name: "Admin navigation" })
          .getByRole("link", { name: "Accounts", exact: true })
          .click();
        await expect(
          a.getByRole("button", { name: "Refresh list" }),
        ).toBeEnabled();
        await directory(a, "?pageSize=50");
        let release;
        const gate = new Promise((done) => (release = done));
        let captured;
        const arrived = new Promise((done) => (captured = done));
        await a.route(`${api}/graphql`, (route) => {
          const work = (async () => {
            const response = await route.fetch();
            captured();
            await gate;
            await route.fulfill({ response });
          })().catch(() => {});
          routeWork.add(work);
          void work.finally(() => routeWork.delete(work));
        });
        await a.getByRole("button", { name: "Refresh list" }).click();
        await arrived;
        await a.getByLabel("Role filter").selectOption("ADMIN");
        release();
        await a.unroute(`${api}/graphql`);
        await expect(a.locator("tbody tr")).toHaveCount(2);
        await expect(a.locator("tbody")).not.toContainText(members[0].email);
      },
    );
    await scenario(
      "Admin confirmation cancel, block/unblock and real session revocation",
      async () => {
        await directory(a, "?pageSize=50");
        await change(a, members[0], "Block", false);
        await expect(row(a, members[0])).toContainText("ACTIVE");
        await row(a, members[0])
          .getByRole("button", { name: "Block", exact: true })
          .click();
        await expect(
          a.getByRole("button", { name: "Cancel", exact: true }),
        ).toBeFocused();
        await a.keyboard.press("Escape");
        await expect(a.getByRole("dialog")).not.toBeVisible();
        await change(a, members[0], "Block");
        await expect(row(a, members[0])).toContainText("BLOCKED");
        await memberPage.reload();
        await expect(memberPage).toHaveURL(/login\?session=ended/);
        await change(a, members[0], "Unblock");
        await expect(row(a, members[0])).toContainText("ACTIVE");
        // Reactivation cannot restore the revoked cookies.
        await memberPage.goto(`${webOrigin}/account`);
        await expect(memberPage).toHaveURL(/login/);
        await cm.close();
      },
    );
    await scenario(
      "Admin promotion/demotion requires fresh login and removes open-page permissions",
      async () => {
        await change(a, members[0], "Make ADMIN");
        await expect(row(a, members[0])).toContainText("ADMIN");
        cm = await context();
        memberPage = await login(cm, members[0]);
        await directory(memberPage);
        await change(a, members[0], "Make USER");
        // Trigger the same restoration revalidation used on visibility/history return.
        await memberPage.evaluate(() =>
          window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true }),
          ),
        );
        await expect(memberPage).toHaveURL(/login\?session=ended/);
        await expect(memberPage.locator("tbody")).toHaveCount(0);
        await cm.close();
      },
    );
    await scenario(
      "Admin mutation outage, committed lost response and explicit reconciliation",
      async () => {
        await directory(a, "?pageSize=50");
        let mutations = 0;
        await a.route(`${api}/graphql`, (route) => {
          if (route.request().postDataJSON().query.includes("mutation")) {
            mutations++;
            return route.abort();
          }
          return route.continue();
        });
        await change(a, members[1], "Block");
        await expect(alert(a)).toContainText("Unable to confirm");
        await expect(
          a.getByText("The outcome is uncertain.", { exact: false }),
        ).toBeVisible();
        assert.equal(mutations, 1);
        await expect(a.locator("tbody")).toHaveCount(0);
        await a.unroute(`${api}/graphql`);
        await a.getByRole("button", { name: "Refresh list" }).click();
        await expect(row(a, members[1])).toContainText("ACTIVE");
        let committed = false;
        await a.route(`${api}/graphql`, (route) => {
          const work = (async () => {
            if (route.request().postDataJSON().query.includes("mutation")) {
              mutations++;
              const response = await route.fetch();
              committed = !!(await response.json()).data;
              await route.abort();
            } else await route.continue();
          })().catch(() => {});
          routeWork.add(work);
          void work.finally(() => routeWork.delete(work));
        });
        await change(a, members[1], "Block");
        assert.equal(committed, true);
        assert.equal(mutations, 2);
        await expect(alert(a)).toContainText("Unable to confirm");
        await a.unroute(`${api}/graphql`);
        await a.getByRole("button", { name: "Refresh list" }).click();
        await expect(row(a, members[1])).toContainText("BLOCKED");
        // A known successful mutation followed by list outage has separate success/error feedback.
        let afterMutation = false;
        await a.route(`${api}/graphql`, async (route) => {
          if (route.request().postDataJSON().query.includes("mutation")) {
            afterMutation = true;
            await route.continue();
          } else if (afterMutation) await route.abort();
          else await route.continue();
        });
        await change(a, members[1], "Unblock");
        await expect(
          a.getByText("Account access changed. The account must log in again."),
        ).toBeVisible();
        await expect(alert(a)).toBeVisible();
        await a.unroute(`${api}/graphql`);
        await a.getByRole("button", { name: "Refresh list" }).click();
        await expect(row(a, members[1])).toContainText("ACTIVE");
      },
    );
    await scenario(
      "Admin empty-page correction, mobile layout and private data boundaries",
      async () => {
        await directory(a, "?page=2&pageSize=20&role=USER&status=ACTIVE");
        const result = await gql(b, list, {
          page: 2,
          pageSize: 20,
          role: "USER",
          status: "ACTIVE",
        });
        // Move every remaining last-page entry out of the selected filter using the real API.
        for (const user of result.body.data.adminAccounts.items)
          assert.ok(
            (await gql(b, update, { id: user.id, status: "BLOCKED" })).body
              .data,
          );
        await a.getByRole("button", { name: "Refresh list" }).click();
        await expect(a).toHaveURL(/page=1/);
        await directory(a, "?pageSize=50");
        await a.screenshot({ path: join(temp, "admin-desktop.png") });
        // A fresh page starts at the mobile viewport; resizing a long desktop
        // table can leave Chromium compositor tiles from the prior viewport.
        const mobile = await ca.newPage();
        try {
          await mobile.setViewportSize({ width: 390, height: 844 });
          await directory(mobile, "?pageSize=50");
          assert.equal(await mobile.locator("header.header").count(), 1);
          assert.equal(
            await mobile.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          await expect(
            mobile.getByText("Private recordings stay on users’ devices.", {
              exact: false,
            }),
          ).toBeVisible();
          await mobile.screenshot({ path: join(temp, "admin-mobile.png") });
        } finally {
          await mobile.close();
        }
        const storage = await a.evaluate(() =>
          JSON.stringify({ ...localStorage, ...sessionStorage }),
        );
        assert.equal(storage.includes(adminA.email), false);
        assert.equal(
          await a.evaluate(() => document.cookie.includes("__Host-sb_")),
          false,
        );
      },
    );
    await scenario(
      "Admin and account tabs serialize one refresh and cross-tab logout clears lists",
      async () => {
        await directory(a, "?pageSize=50");
        const tab = await ca.newPage();
        await tab.goto(`${webOrigin}/account`);
        let rotations = 0;
        ca.on("request", (request) => {
          if (request.url() === `${api}/auth/refresh`) rotations++;
        });
        await fixture("expire-access", adminA.id);
        const expiredShell = await ca.request.get(`${webOrigin}/admin/users`);
        assert.match(expiredShell.headers()["cache-control"], /no-store/);
        assert.equal((await expiredShell.text()).includes(adminA.email), false);
        await Promise.all([
          a.getByRole("button", { name: "Refresh list" }).click(),
          tab.evaluate(() =>
            document.dispatchEvent(new Event("visibilitychange")),
          ),
        ]);
        await expect(a.locator("tbody tr")).toHaveCount(27);
        assert.equal(rotations, 1);
        await tab.getByRole("button", { name: "Log out", exact: true }).click();
        await expect(a).toHaveURL(/login/);
        await expect(a.locator("tbody")).toHaveCount(0);
        await tab.close();
        await a.close();
        a = await login(ca, adminA);
      },
    );
    await scenario(
      "Admin self-blocking with another admin, fresh-login recovery and self-demotion",
      async () => {
        await directory(b, "?pageSize=50");
        await change(b, adminB, "Block");
        await expect(b).toHaveURL(/login\?session=ended/);
        await directory(a, "?pageSize=50");
        await change(a, adminB, "Unblock");
        await expect(row(a, adminB)).toContainText("ACTIVE");
        await b.close();
        b = await login(cb, adminB);
        await directory(b, "?pageSize=50");
        await change(b, adminB, "Make USER");
        await expect(b).toHaveURL(/login\?session=ended/);
        await directory(a, "?role=ADMIN&status=ACTIVE");
        await change(a, adminA, "Make USER");
        await expect(alert(a)).toContainText("last active administrator");
        await expect(row(a, adminA)).toContainText("ADMIN");
        await change(a, adminA, "Block");
        await expect(alert(a)).toContainText("last active administrator");
        await expect(row(a, adminA)).toContainText("ACTIVE");
        assert.ok(
          (await gql(a, update, { id: adminB.id, role: "ADMIN" })).body.data,
        );
        await b.close();
        b = await login(cb, adminB);
      },
    );
    await scenario(
      "Two real admin browser contexts racing self-demotion retain exactly one active admin",
      async () => {
        await directory(a, "?role=ADMIN&status=ACTIVE");
        await directory(b, "?role=ADMIN&status=ACTIVE");
        await row(a, adminA)
          .getByRole("button", { name: "Make USER", exact: true })
          .click();
        await row(b, adminB)
          .getByRole("button", { name: "Make USER", exact: true })
          .click();
        // Capture bodies in the route before self-demotion navigates the page.
        // Holding both requests at the browser boundary still exercises two real
        // concurrent backend transactions; no GraphQL result is synthesized.
        async function observe(page) {
          let done;
          const outcome = new Promise((resolve) => {
            done = resolve;
          });
          await page.route(`${api}/graphql`, (route) => {
            if (!route.request().postDataJSON().query.includes("mutation"))
              return route.continue();
            const work = (async () => {
              const response = await route.fetch();
              const body = await response.json();
              await route.fulfill({ response });
              done(body);
            })().catch(async () => {
              done({ transportFailure: true });
              await route.abort().catch(() => {});
            });
            routeWork.add(work);
            void work.finally(() => routeWork.delete(work));
          });
          return { outcome };
        }
        const ra = await observe(a),
          rb = await observe(b);
        await Promise.all([
          a
            .getByRole("button", { name: "Confirm change", exact: true })
            .click(),
          b
            .getByRole("button", { name: "Confirm change", exact: true })
            .click(),
        ]);
        const bodies = await Promise.all([ra.outcome, rb.outcome]);
        assert.equal(bodies.filter((x) => x.data).length, 1);
        assert.equal(
          bodies.filter((x) => x.errors?.[0].extensions.code === "CONFLICT")
            .length,
          1,
        );
        const winner = bodies[0].data ? b : a;
        await expect(alert(winner)).toContainText("last active administrator");
        const final = await gql(winner, list, {
          role: "ADMIN",
          status: "ACTIVE",
        });
        assert.equal(final.body.data.adminAccounts.total, 1);
      },
    );
    assert.deepEqual(diagnostics, []);
  } finally {
    for (const item of contexts)
      for (const page of item.pages())
        await page.unrouteAll({ behavior: "wait" }).catch(() => {});
    await Promise.allSettled(routeWork);
    for (const item of contexts) await item.close();
  }
}
