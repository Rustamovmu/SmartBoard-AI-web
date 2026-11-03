import assert from "node:assert/strict";
import { join } from "node:path";
import { expect } from "@playwright/test";
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const managed = `query($input:AdminHelpEntriesInput!){adminHelpEntries(input:$input){items{id title revision state bodyMarkdown}total}}`;
const update = `mutation($input:UpdateHelpEntryInput!){adminUpdateHelpEntry(input:$input){id title revision state}}`;
export async function verifyHelp({
  browser,
  webOrigin,
  api,
  ready,
  check,
  temp,
}) {
  const [adminA, adminB, member] = ready.adminFixture;
  const password = `Synthetic-admin-${ready.database.slice(4)}`;
  async function nativeDecision(page, action, accept) {
    await page.bringToFront();
    const decision = page
      .waitForEvent("dialog", { timeout: 10000 })
      .then(async (dialog) => {
        assert.equal(dialog.type(), "confirm");
        return accept ? dialog.accept() : dialog.dismiss();
      });
    try {
      await Promise.all([decision, action()]);
    } catch {
      throw new Error(
        `Help ${accept ? "accept" : "cancel"} confirmation was not handled at ${new URL(page.url()).pathname}`,
      );
    }
  }
  const contexts = [];
  const routeWork = new Set();
  let a, b, reader, ca, cb, anonymous;
  let faq, announcement;
  let bucket = Math.floor(Date.now() / 60000),
    count = 0,
    writes = 0;
  const diagnostics = [];
  async function pace() {
    if (bucket !== Math.floor(Date.now() / 60000)) {
      bucket = Math.floor(Date.now() / 60000);
      count = 0;
      writes = 0;
    }
    if (count >= 26 || writes >= 10) {
      console.log(
        "Pacing Help verification within unchanged API/write limits…",
      );
      await wait(60100 - (Date.now() % 60000));
      bucket = Math.floor(Date.now() / 60000);
      count = 0;
      writes = 0;
    }
  }
  await wait(60100 - (Date.now() % 60000));
  async function scenario(name, run) {
    await pace();
    await check(name, run);
  }
  async function context(viewport) {
    const item = await browser.newContext({
      ignoreHTTPSErrors: false,
      ...(viewport ? { viewport } : {}),
    });
    contexts.push(item);
    item.on("request", (req) => {
      if (!req.url().startsWith(api)) return;
      if (bucket !== Math.floor(Date.now() / 60000)) {
        bucket = Math.floor(Date.now() / 60000);
        count = 0;
        writes = 0;
      }
      if (new URL(req.url()).pathname === "/graphql") {
        count++;
        if (
          /mutation/.test(req.postData() || "") &&
          /admin(Create|Update)HelpEntry/.test(req.postData() || "")
        )
          writes++;
      }
    });
    item.on("page", (page) => {
      page.on("pageerror", () =>
        diagnostics.push("Help browser runtime error"),
      );
      page.on("console", (message) => {
        if (/hydration|children.*prop.*title/i.test(message.text()))
          diagnostics.push("Help hydration/title warning");
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
    return page;
  }
  const entryRow = (page, title) =>
    page
      .locator(".help-admin-list article")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  async function directory(page, kind = "FAQ") {
    await page.goto(`${webOrigin}/admin/help?kind=${kind}`);
    await expect(
      page.getByRole("button", { name: "Refresh directory" }),
    ).toBeEnabled({ timeout: 20000 });
  }
  async function apiCall(page, query, variables, publicRead = false) {
    return page.evaluate(
      async ({ api, query, variables, publicRead }) => {
        let csrf;
        if (!publicRead)
          csrf = (
            await (
              await fetch(`${api}/auth/csrf`, {
                credentials: "include",
                headers: { "X-SmartBord-Client": "browser" },
              })
            ).json()
          ).csrfToken;
        const response = await fetch(`${api}/graphql`, {
          method: "POST",
          credentials: publicRead ? "omit" : "include",
          headers: {
            "Content-Type": "application/json",
            "X-SmartBord-Client": publicRead ? "public" : "browser",
            ...(csrf ? { "X-CSRF-Token": csrf } : {}),
          },
          body: JSON.stringify({ query, variables }),
        });
        return { status: response.status, body: await response.json() };
      },
      { api, query, variables, publicRead },
    );
  }
  async function draft(title, body, kind = "FAQ") {
    await directory(a, kind);
    await a
      .getByRole("button", {
        name: kind === "FAQ" ? "Create FAQ" : "Create announcement",
        exact: true,
      })
      .click();
    await a.getByLabel("Title", { exact: true }).fill(title);
    await a.getByLabel("Markdown body").fill(body);
    await a.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(entryRow(a, title)).toBeVisible();
    await expect(
      a.getByRole("button", { name: "Refresh directory" }),
    ).toBeEnabled();
    const response = await apiCall(a, managed, { input: { kind } });
    return response.body.data.adminHelpEntries.items.find(
      (entry) => entry.title === title,
    );
  }
  async function transition(page, title, button) {
    await entryRow(page, title)
      .getByRole("button", { name: button, exact: true })
      .click();
    if (button !== "Restore to draft") {
      await expect(page.getByRole("dialog")).toContainText(title);
      await expect(
        page.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeFocused();
      await page
        .getByRole("button", {
          name: "Confirm publication change",
          exact: true,
        })
        .press("Enter");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: "Refresh directory" }),
    ).toBeEnabled();
  }
  try {
    await scenario(
      "Help is public without cookies, while admin content and drafts stay protected",
      async () => {
        anonymous = await context();
        reader = await anonymous.newPage();
        const response = await reader.goto(`${webOrigin}/help`);
        assert.equal(response.status(), 200);
        assert.match(response.headers()["cache-control"], /no-store/);
        await expect(
          reader.getByText("No FAQs published yet for this selection."),
        ).toBeVisible();
        assert.deepEqual(await anonymous.cookies(), []);
        await reader.goto(`${webOrigin}/admin/help`);
        await expect(reader).toHaveURL(`${webOrigin}/login`);
        const memberContext = await context();
        const user = await login(memberContext, member);
        const denied = await user.goto(`${webOrigin}/admin/help`);
        assert.equal(denied.status(), 403);
        await expect(
          user.getByRole("heading", { name: "Access denied" }),
        ).toBeVisible();
        assert.equal(
          (await apiCall(user, managed, { input: { kind: "FAQ" } })).body
            .errors[0].extensions.code,
          "FORBIDDEN",
        );
        await memberContext.close();
        ca = await context();
        cb = await context();
        a = await login(ca, adminA);
        b = await login(cb, adminB);
        faq = await draft(
          "Synthetic storage guidance",
          "## Keeping originals\n\nUse **durable device storage**.\n\n- Restart the app\n- Open your saved image\n\n[Help](/help)",
        );
        await reader.goto(`${webOrigin}/help`);
        await expect(reader.getByText(faq.title, { exact: true })).toHaveCount(
          0,
        );
        assert.equal(
          (await reader.goto(`${webOrigin}/help/${faq.id}`)).status(),
          404,
        );
      },
    );
    await scenario(
      "Help publishes Markdown, updates live, unpublishes, archives and restores to draft",
      async () => {
        await transition(a, faq.title, "Publish");
        await reader.goto(`${webOrigin}/help`);
        const question = reader
          .locator("summary")
          .filter({ hasText: faq.title });
        await question.focus();
        await question.press("Enter");
        await expect(
          reader.getByRole("heading", { name: "Keeping originals" }),
        ).toBeVisible();
        await expect(reader.locator("strong")).toContainText(
          "durable device storage",
        );
        await entryRow(a, faq.title)
          .getByRole("button", { name: "Edit entry", exact: true })
          .click();
        await a
          .getByLabel("Markdown body")
          .fill(
            "## Updated guidance\n\nThis published answer was explicitly updated.",
          );
        await a
          .getByRole("button", { name: "Review published changes" })
          .click();
        await expect(a.getByRole("dialog")).toContainText(
          "Save published changes",
        );
        await a
          .getByRole("button", { name: "Confirm publication change" })
          .press("Enter");
        await expect(a.getByRole("dialog")).not.toBeVisible();
        await expect(
          a.getByRole("button", { name: "Refresh directory" }),
        ).toBeEnabled();
        await reader.goto(`${webOrigin}/help/${faq.id}`);
        await expect(
          reader.getByRole("heading", { name: "Updated guidance" }),
        ).toBeVisible();
        await transition(a, faq.title, "Unpublish");
        assert.equal((await reader.reload()).status(), 404);
        await transition(a, faq.title, "Publish");
        await transition(a, faq.title, "Archive");
        assert.equal(
          (await reader.goto(`${webOrigin}/help/${faq.id}`)).status(),
          404,
        );
        await entryRow(a, faq.title)
          .getByRole("button", { name: "View entry", exact: true })
          .click();
        await expect(a.locator(".help-editor textarea")).toHaveCount(0);
        await expect(a.locator(".help-editor .help-markdown")).toContainText(
          "Updated guidance",
        );
        await a
          .getByRole("button", { name: "Close editor", exact: true })
          .click();
        await transition(a, faq.title, "Restore to draft");
        await expect(entryRow(a, faq.title)).toContainText("DRAFT");
        await transition(a, faq.title, "Publish");
      },
    );
    await scenario(
      "Help announcements, topic selection and unsafe Markdown never load remote media or execute HTML",
      async () => {
        const body =
          "## Platform update\n\nA **reviewed** update.\n\n[unsafe](javascript:alert%281%29)\n\n![remote](https://example.invalid/tracking.png)\n\n<script>window.__helpScriptExecuted=true</script>\n\n<img src=x onerror=window.__helpScriptExecuted=true>";
        announcement = await draft(
          "Synthetic platform announcement",
          body,
          "ANNOUNCEMENT",
        );
        await entryRow(a, announcement.title)
          .getByRole("button", { name: "Edit entry" })
          .click();
        await expect(
          a.locator(".help-editor img,.help-editor script"),
        ).toHaveCount(0);
        await expect(
          a.locator(".help-editor a[href^='javascript:']"),
        ).toHaveCount(0);
        await a.getByRole("button", { name: "Close editor" }).click();
        await transition(a, announcement.title, "Publish");
        let remote = 0;
        reader.on("request", (req) => {
          if (req.url().includes("example.invalid")) remote++;
        });
        await reader.goto(`${webOrigin}/help?kind=ANNOUNCEMENT`);
        await reader
          .getByRole("link", { name: announcement.title, exact: true })
          .click();
        await expect(
          reader.getByRole("heading", { name: "Platform update", exact: true }),
        ).toBeVisible();
        assert.equal(
          await reader.evaluate(() => window.__helpScriptExecuted),
          undefined,
        );
        await expect(
          reader.locator(
            ".help-markdown img,.help-markdown script,.help-markdown a[href^='javascript:']",
          ),
        ).toHaveCount(0);
        assert.equal(remote, 0);
        await reader.goto(`${webOrigin}/help?kind=FAQ&topic=PRIVACY`);
        await expect(
          reader.getByText("No FAQs published yet for this selection."),
        ).toBeVisible();
        await reader.getByLabel("FAQ topic").selectOption("GENERAL");
        await expect(reader.locator("summary")).toContainText(faq.title);
        await expect(reader).toHaveURL(/page=1/);
      },
    );
    await scenario(
      "Help unsaved text survives identity revalidation and cancelled editor navigation",
      async () => {
        await directory(a);
        await entryRow(a, faq.title)
          .getByRole("button", { name: "Edit entry" })
          .click();
        const text = "Unsaved in-memory text survives verification.";
        await a.getByLabel("Markdown body").fill(text);
        await a.evaluate(() =>
          document.dispatchEvent(new Event("visibilitychange")),
        );
        await expect(a.getByLabel("Markdown body")).toHaveValue(text);
        await expect(a.getByLabel("Markdown body")).toBeVisible();
        await nativeDecision(
          a,
          () =>
            a
              .getByRole("navigation", { name: "Admin navigation" })
              .getByRole("link", { name: "Accounts", exact: true })
              .click(),
          false,
        );
        await expect(a).toHaveURL(/admin\/help/);
        await expect(a.getByLabel("Markdown body")).toHaveValue(text);
        await nativeDecision(
          a,
          () => a.getByRole("button", { name: "Close editor" }).click(),
          true,
        );
        await expect(
          a.getByRole("heading", { name: "Edit entry", exact: true }),
        ).toHaveCount(0);
      },
    );
    await scenario(
      "Help concurrent editors receive a content revision conflict and can reload safely",
      async () => {
        await directory(a);
        await entryRow(a, faq.title)
          .getByRole("button", { name: "Edit entry" })
          .click();
        await a
          .getByLabel("Title", { exact: true })
          .fill("Unsaved conflicting title");
        const current = (
          await apiCall(b, managed, { input: { kind: "FAQ" } })
        ).body.data.adminHelpEntries.items.find((item) => item.id === faq.id);
        const changed = await apiCall(b, update, {
          input: {
            id: faq.id,
            expectedRevision: current.revision,
            bodyMarkdown: "## Other editor\n\nA concurrent published update.",
          },
        });
        assert.ok(changed.body.data);
        await a
          .getByRole("button", { name: "Review published changes" })
          .click();
        await a
          .getByRole("button", { name: "Confirm publication change" })
          .click();
        await expect(a.getByRole("main").getByRole("alert")).toContainText(
          "This entry changed. Reload it before saving.",
        );
        await expect(a.getByRole("main").getByRole("alert")).not.toContainText(
          "last active administrator",
        );
        await nativeDecision(
          a,
          () => a.getByRole("button", { name: "Reload entry" }).click(),
          true,
        );
        await expect(a.getByLabel("Markdown body")).toHaveValue(/Other editor/);
        await a.getByRole("button", { name: "Close editor" }).click();
      },
    );
    await scenario(
      "Help uncertain writes require directory reconciliation and outage states remain retryable",
      async () => {
        await directory(a);
        let submitted = 0;
        await a.route(`${api}/graphql`, (route) => {
          if (route.request().postDataJSON().query.includes("mutation")) {
            submitted++;
            return route.abort();
          }
          return route.continue();
        });
        await transition(a, faq.title, "Unpublish");
        await expect(
          a.getByText("The outcome is uncertain.", { exact: false }),
        ).toBeVisible();
        assert.equal(submitted, 1);
        await expect(
          a.getByRole("button", { name: "Create FAQ", exact: true }),
        ).toBeDisabled();
        await a.unroute(`${api}/graphql`);
        await a.getByRole("button", { name: "Refresh directory" }).click();
        await expect(entryRow(a, faq.title)).toContainText("PUBLISHED");
        await a.route(`${api}/graphql`, (route) => {
          const work = (async () => {
            if (route.request().postDataJSON().query.includes("mutation")) {
              submitted++;
              const response = await route.fetch();
              assert.ok((await response.json()).data);
              await route.abort();
            } else await route.continue();
          })().catch(() => {});
          routeWork.add(work);
          void work.finally(() => routeWork.delete(work));
        });
        await transition(a, faq.title, "Unpublish");
        await expect(
          a.getByText("The outcome is uncertain.", { exact: false }),
        ).toBeVisible();
        assert.equal(submitted, 2);
        await a.unroute(`${api}/graphql`);
        await a.getByRole("button", { name: "Refresh directory" }).click();
        await expect(entryRow(a, faq.title)).toContainText("DRAFT");
        await transition(a, faq.title, "Publish");
        // Public detail expansion reports an actual request outage and retries it.
        await reader.goto(`${webOrigin}/help`);
        await reader.route(`${api}/graphql`, (route) => route.abort());
        await reader.locator("summary").filter({ hasText: faq.title }).click();
        await expect(reader.getByRole("main").getByRole("alert")).toContainText(
          "unavailable or no longer published",
        );
        await reader.unroute(`${api}/graphql`);
        await reader.getByRole("button", { name: "Retry answer" }).click();
        await expect(
          reader.getByRole("heading", { name: "Other editor", exact: true }),
        ).toBeVisible();
      },
    );
    await scenario(
      "Help editor clears immediately when current administrator access is revoked",
      async () => {
        await directory(b);
        await entryRow(b, faq.title)
          .getByRole("button", { name: "Edit entry" })
          .click();
        await b
          .getByLabel("Markdown body")
          .fill("Must be cleared on revocation");
        const access =
          "mutation($input:UpdateAccountAccessInput!){adminUpdateAccountAccess(input:$input){id status}}";
        assert.ok(
          (
            await apiCall(a, access, {
              input: { id: adminB.id, status: "BLOCKED" },
            })
          ).body.data,
        );
        await b.evaluate(() =>
          window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true }),
          ),
        );
        await expect(b).toHaveURL(/login\?session=ended/);
        await expect(b.locator("textarea")).toHaveCount(0);
        assert.ok(
          (
            await apiCall(a, access, {
              input: { id: adminB.id, status: "ACTIVE" },
            })
          ).body.data,
        );
      },
    );
    await scenario(
      "Help public/editor mobile layout and browser storage preserve the privacy boundary",
      async () => {
        await reader.goto(`${webOrigin}/help`);
        await reader.screenshot({ path: join(temp, "help-desktop.png") });
        const mobileContext = await context({ width: 390, height: 844 });
        const mobile = await mobileContext.newPage();
        await mobile.goto(`${webOrigin}/help`);
        await mobile.locator("summary").filter({ hasText: faq.title }).click();
        await expect(
          mobile.getByRole("heading", { name: "Other editor", exact: true }),
        ).toBeVisible();
        assert.equal(
          await mobile.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await mobile.screenshot({ path: join(temp, "help-mobile.png") });
        assert.deepEqual(await mobileContext.cookies(), []);
        await mobileContext.close();
        await directory(a);
        await entryRow(a, faq.title)
          .getByRole("button", { name: "Edit entry" })
          .click();
        await a.screenshot({ path: join(temp, "help-editor.png") });
        const storage = await a.evaluate(() =>
          JSON.stringify({ ...localStorage, ...sessionStorage }),
        );
        assert.equal(
          storage.includes(faq.title) || storage.includes("Other editor"),
          false,
        );
        await a.getByRole("button", { name: "Close editor" }).click();
        assert.deepEqual(diagnostics, []);
      },
    );
  } finally {
    for (const item of contexts)
      for (const page of item.pages())
        await page.unrouteAll({ behavior: "wait" }).catch(() => {});
    await Promise.allSettled(routeWork);
    for (const item of contexts) await item.close();
  }
}
