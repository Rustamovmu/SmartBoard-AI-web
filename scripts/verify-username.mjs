import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { join } from "node:path";
export async function verifyUsername({
  browser,
  webOrigin,
  api,
  ready,
  check,
  temp,
}) {
  const accounts = ready.adminFixture.slice(-4);
  const password = `Synthetic-admin-${ready.database.slice(4)}`;
  const contexts = [];
  const diagnostics = [];
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const fresh = async () => {
    const delay = 60100 - (Date.now() % 60000);
    await wait(Math.min(delay, 59000));
    if (delay > 59000) await wait(delay - 59000);
  };
  await fresh();
  const chosen = "chosen_" + ready.database.slice(4, 20);
  const lost = "lost_" + ready.database.slice(4, 20);
  async function login(user, identifier = user.email) {
    const context = await browser.newContext({ ignoreHTTPSErrors: false });
    contexts.push(context);
    const page = await context.newPage();
    page.on("pageerror", () => diagnostics.push("Username runtime error"));
    await page.goto(`${webOrigin}/login`);
    await page.getByLabel("Username or email").fill(identifier);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(`${webOrigin}/account`);
    await expect(page.getByRole("heading", { name: user.name })).toBeVisible();
    return page;
  }
  async function choose(page, value, accept = true) {
    await page.getByLabel("New username", { exact: true }).fill(value);
    page.once("dialog", (dialog) =>
      accept ? dialog.accept() : dialog.dismiss(),
    );
    await page
      .getByRole("button", { name: "Choose username", exact: true })
      .click();
  }
  let page, other;
  try {
    await check(
      "Legacy email login displays no username; cancelled choice writes nothing",
      async () => {
        page = await login(accounts[0]);
        await expect(page.locator("[data-account-username]")).toHaveText(
          "Not chosen",
        );
        let mutations = 0;
        page.on("request", (r) => {
          if (
            r.url() === `${api}/graphql` &&
            r.postData()?.includes("SetMyUsername")
          )
            mutations++;
        });
        await choose(page, chosen, false);
        assert.equal(mutations, 0);
        await expect(
          page.getByLabel("New username", { exact: true }),
        ).toBeEnabled();
      },
    );
    await check(
      "Confirmed username choice persists, is normalized, and removes rename controls",
      async () => {
        await choose(page, chosen.toUpperCase());
        await expect(page.locator("[data-account-username]")).toHaveText(
          chosen,
        );
        await expect(
          page.getByRole("button", { name: "Choose username", exact: true }),
        ).toHaveCount(0);
        await page.reload();
        await expect(page.locator("[data-account-username]")).toHaveText(
          chosen,
        );
      },
    );
    await check(
      "Same existing account signs in by uppercase username and by email",
      async () => {
        const byName = await login(accounts[0], chosen.toUpperCase());
        const byEmail = await login(accounts[0]);
        for (const p of [byName, byEmail])
          await expect(p.locator("[data-account-username]")).toHaveText(chosen);
      },
    );
    await fresh();
    await check(
      "Unavailable username locks writes until a read confirms no username; another choice succeeds",
      async () => {
        other = await login(accounts[1]);
        await choose(other, chosen);
        await expect(other.getByRole("main").getByRole("alert")).toContainText(
          "unavailable",
        );
        await expect(
          other.getByRole("button", { name: "Choose username", exact: true }),
        ).toBeDisabled();
        await other
          .getByRole("button", { name: "Refresh username", exact: true })
          .click();
        await expect(
          other.getByRole("button", { name: "Choose username", exact: true }),
        ).toBeEnabled();
        await choose(other, "other_" + ready.database.slice(4, 20));
        await expect(other.locator("[data-account-username]")).not.toHaveText(
          "Not chosen",
        );
      },
    );
    await check(
      "Lost committed username response is never replayed; read-only refresh reveals the saved choice",
      async () => {
        const target = await login(accounts[2]);
        let writes = 0;
        await target.route(`${api}/graphql`, async (route) => {
          if (route.request().postData()?.includes("SetMyUsername")) {
            writes++;
            const response = await route.fetch();
            assert.ok((await response.json()).data?.setMyUsername);
            await route.abort();
          } else await route.continue();
        });
        await choose(target, lost);
        await expect(
          target.getByRole("button", { name: "Choose username", exact: true }),
        ).toBeDisabled();
        assert.equal(writes, 1);
        await target
          .getByRole("button", { name: "Refresh username", exact: true })
          .click();
        await expect(target.locator("[data-account-username]")).toHaveText(
          lost,
        );
        assert.equal(writes, 1);
      },
    );
    await fresh();
    await check(
      "Username chooser is usable on mobile and keeps credentials out of browser storage",
      async () => {
        const mobile = await login(accounts[3]);
        await mobile.setViewportSize({ width: 390, height: 844 });
        await expect(
          mobile.getByLabel("New username", { exact: true }),
        ).toBeVisible();
        assert.ok(
          await mobile.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        const storage = await mobile.evaluate(() =>
          JSON.stringify({
            local: { ...localStorage },
            session: { ...sessionStorage },
          }),
        );
        assert.ok(!storage.includes(password));
        assert.ok(!storage.includes("sb_a."));
        assert.ok(!storage.includes("sb_r."));
        await mobile.screenshot({ path: join(temp, "username-mobile.png") });
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.screenshot({ path: join(temp, "username-desktop.png") });
      },
    );
    assert.deepEqual(diagnostics, []);
  } finally {
    await Promise.all(contexts.map((ctx) => ctx.close()));
  }
}
