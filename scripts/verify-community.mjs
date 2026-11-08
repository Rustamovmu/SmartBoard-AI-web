import assert from "node:assert/strict";
import { join } from "node:path";
import { expect } from "@playwright/test";
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const fields =
  "id title bodyMarkdown publicDisplayName state revision removalReason";
const mine = `query($input:ManagedCommunityPostsInput!){myCommunityPosts(input:$input){items{${fields}}total}}`;
const update = `mutation($input:UpdateCommunityPostInput!){updateCommunityPost(input:$input){${fields}}}`;
const access =
  "mutation($input:UpdateAccountAccessInput!){adminUpdateAccountAccess(input:$input){id role status}}";
export async function verifyCommunity({
  browser,
  webOrigin,
  api,
  ready,
  fixture,
  check,
  temp,
}) {
  const [adminA, adminB, , , author, outsider] = ready.adminFixture;
  const password = `Synthetic-admin-${ready.database.slice(4)}`;
  const contexts = [],
    routeWork = new Set(),
    diagnostics = [],
    requests = [];
  let bucket = Math.floor(Date.now() / 60000),
    count = 0,
    writes = 0;
  async function freshWindow() {
    const delay = 60100 - (Date.now() % 60000);
    await wait(Math.min(delay, 59000));
    if (delay > 59000) await wait(delay - 59000);
    bucket = Math.floor(Date.now() / 60000);
    count = 0;
    writes = 0;
  }
  await freshWindow();
  async function pace() {
    if (bucket !== Math.floor(Date.now() / 60000)) {
      bucket = Math.floor(Date.now() / 60000);
      count = 0;
      writes = 0;
    }
    if (count >= 24 || writes >= 9) {
      console.log("Pacing community verification within unchanged limits…");
      await freshWindow();
    }
  }
  async function scenario(name, run) {
    await pace();
    await check(name, run);
  }
  async function context(viewport) {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: false,
      ...(viewport ? { viewport } : {}),
    });
    contexts.push(ctx);
    ctx.on("request", (req) => {
      if (bucket !== Math.floor(Date.now() / 60000)) {
        bucket = Math.floor(Date.now() / 60000);
        count = 0;
        writes = 0;
      }
      if (
        req.url().startsWith(api) &&
        new URL(req.url()).pathname === "/graphql"
      ) {
        count++;
        if (/mutation/.test(req.postData() || "")) writes++;
      }
      requests.push({
        url: req.url(),
        body: req.postData() || "",
        headers: req.headers(),
      });
    });
    ctx.on("page", (page) => {
      page.on("pageerror", () => diagnostics.push("Community runtime error"));
      page.on("console", (message) => {
        if (/hydration|children.*prop.*title/i.test(message.text()))
          diagnostics.push("Community hydration/title warning");
      });
    });
    return ctx;
  }
  async function login(ctx, user) {
    const page = await ctx.newPage();
    await page.goto(`${webOrigin}/login`);
    await page.getByLabel("Username or email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(`${webOrigin}/account`);
    return page;
  }
  async function gql(page, query, variables, publicRead = false) {
    return page.evaluate(
      async ({ api, query, variables, publicRead }) => {
        const csrf = publicRead
          ? null
          : (
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
  async function nativeDecision(page, run, accept) {
    await page.bringToFront();
    const decision = page
      .waitForEvent("dialog", { timeout: 10000 })
      .then((dialog) => (accept ? dialog.accept() : dialog.dismiss()));
    await Promise.all([decision, run()]);
  }
  const row = (page, title) =>
    page
      .locator(".community-admin-list article")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  async function directory(page, moderation = false) {
    await page.goto(
      `${webOrigin}/${moderation ? "admin/community" : "account/posts"}`,
    );
    await expect(
      page.getByRole("button", { name: "Refresh directory" }),
    ).toBeEnabled({ timeout: 20000 });
  }
  async function transition(page, title, label, reason) {
    await row(page, title)
      .getByRole("button", { name: label, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(title);
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeFocused();
    if (reason)
      await page.getByRole("dialog").getByRole("combobox").selectOption(reason);
    await page
      .getByRole("button", { name: "Confirm community change" })
      .click();
    await expect(
      page.getByRole("button", { name: "Refresh directory" }),
    ).toBeEnabled();
  }
  let a, b, owner, other, reader, anonymous, post;
  const title = "Synthetic community idea",
    alias = "Chosen community name";
  const body =
    "## A shared idea\n\nGeneral **community** text.\n\n![blocked](https://unrequested.example/image.png)\n\n<script>window.communityInjected=true</script>\n\n[unsafe](javascript:alert(1))";
  try {
    a = await login(await context(), adminA);
    b = await login(await context(), adminB);
    owner = await login(await context(), author);
    other = await login(await context(), outsider);
    anonymous = await context();
    reader = await anonymous.newPage();
    await scenario(
      "Community anonymous/USER/ADMIN routes and protected SSR data isolation",
      async () => {
        await reader.goto(`${webOrigin}/account/posts`);
        await expect(reader).toHaveURL(`${webOrigin}/login`);
        await other.goto(`${webOrigin}/admin/community`);
        await expect(
          other.getByRole("heading", { name: "Access denied" }),
        ).toBeVisible();
        assert.equal(
          (await gql(other, "query{adminCommunityPosts(input:{}){total}}", {}))
            .body.errors[0].extensions.code,
          "FORBIDDEN",
        );
        await directory(owner);
        await directory(a, true);
        const response = await owner.request.get(`${webOrigin}/account/posts`);
        assert.match(response.headers()["cache-control"], /no-store/);
        const html = await response.text();
        const props = JSON.parse(
          html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)[1],
        ).props.pageProps;
        assert.deepEqual(Object.keys(props).sort(), [
          "initialAccount",
          "initialError",
        ]);
        const csrfDenied = await owner.evaluate(
          async (api) =>
            (
              await fetch(`${api}/graphql`, {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  "X-SmartBord-Client": "browser",
                },
                body: JSON.stringify({
                  query: "{myCommunityPosts(input:{}){total}}",
                }),
              })
            ).status,
          api,
        );
        assert.equal(csrfDenied, 403);
      },
    );
    await scenario(
      "Community explicit server drafts, editable attribution and safe shared Markdown preview",
      async () => {
        await owner
          .getByRole("button", { name: "New post", exact: true })
          .click();
        await expect(owner.getByLabel("Public display name")).toHaveValue(
          author.name,
        );
        await expect(
          owner.getByText("Save draft on server stores this text", {
            exact: false,
          }),
        ).toBeVisible();
        await owner.getByLabel("Title", { exact: true }).fill(title);
        await owner.getByLabel("Public display name").fill(alias);
        await owner.getByLabel("Markdown body").fill("한".repeat(6000));
        await expect(
          owner.getByRole("button", {
            name: "Save draft on server",
            exact: true,
          }),
        ).toBeDisabled();
        await owner.getByLabel("Markdown body").fill(body);
        await expect(
          owner.getByRole("heading", { name: "A shared idea" }),
        ).toBeVisible();
        assert.equal(
          await owner.evaluate(() => window.communityInjected === true),
          false,
        );
        await owner
          .getByRole("button", { name: "Save draft on server", exact: true })
          .click();
        await expect(row(owner, title)).toContainText("DRAFT");
        const response = await gql(owner, mine, { input: {} });
        post = response.body.data.myCommunityPosts.items.find(
          (x) => x.title === title,
        );
        assert.ok(post);
        assert.equal(
          (await reader.goto(`${webOrigin}/community/${post.id}`)).status(),
          404,
        );
        await reader.goto(`${webOrigin}/community`);
        await expect(
          reader.getByText("No community posts published yet."),
        ).toBeVisible();
        assert.equal(
          (await anonymous.cookies()).length,
          0,
          "Public reader issued cookies",
        );
        assert.equal(
          (
            await gql(other, "query($id:ID!){myCommunityPost(id:$id){id}}", {
              id: post.id,
            })
          ).body.errors[0].extensions.code,
          "NOT_FOUND",
        );
      },
    );
    await scenario(
      "Community publication confirmation, public projection and credential-free reads",
      async () => {
        await row(owner, title)
          .getByRole("button", { name: "Publish publicly", exact: true })
          .click();
        await expect(owner.getByRole("dialog")).toContainText(alias);
        await owner.keyboard.press("Escape");
        await expect(row(owner, title)).toContainText("DRAFT");
        await transition(owner, title, "Publish publicly");
        await expect(row(owner, title)).toContainText("PUBLISHED");
        await reader.goto(`${webOrigin}/community/${post.id}`);
        await expect(
          reader.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
        await expect(
          reader.getByText(`By ${alias}`, { exact: false }),
        ).toBeVisible();
        assert.equal(
          await reader.evaluate(() => window.communityInjected === true),
          false,
        );
        const publicData = await gql(
          reader,
          "query($id:ID!){communityPost(id:$id){id title publicDisplayName bodyMarkdown}}",
          { id: post.id },
          true,
        );
        assert.ok(publicData.body.data);
        assert.equal(
          JSON.stringify(publicData).includes(author.id) ||
            JSON.stringify(publicData).includes(author.email),
          false,
        );
        const publicRequests = requests.filter(
          (x) => x.headers["x-smartbord-client"] === "public",
        );
        assert.ok(publicRequests.length);
        for (const req of publicRequests)
          for (const key of ["cookie", "authorization", "x-csrf-token"])
            assert.equal(
              key in req.headers,
              false,
              "Public reader sent a credential header",
            );
        assert.equal(
          (await anonymous.cookies()).length,
          0,
          "Public reader issued cookies",
        );
      },
    );
    await scenario(
      "Community live edits, withdrawal and author-controlled republication",
      async () => {
        await row(owner, title)
          .getByRole("button", { name: "Edit post", exact: true })
          .click();
        await owner
          .getByLabel("Markdown body")
          .fill("## Live idea\n\nUpdated general text.");
        await owner
          .getByRole("button", { name: "Review published changes" })
          .click();
        await owner
          .getByRole("button", { name: "Cancel", exact: true })
          .click();
        await expect(owner.getByLabel("Markdown body")).toHaveValue(
          /Updated general/,
        );
        await owner
          .getByRole("button", { name: "Review published changes" })
          .click();
        await owner
          .getByRole("button", { name: "Confirm community change" })
          .click();
        await expect(owner.locator("[data-community-editor]")).toHaveCount(0);
        await expect(
          owner.getByRole("button", { name: "Refresh directory" }),
        ).toBeEnabled();
        await reader.reload();
        await expect(
          reader.getByRole("heading", { name: "Live idea" }),
        ).toBeVisible();
        await transition(owner, title, "Withdraw to draft");
        await expect(row(owner, title)).toContainText("DRAFT");
        assert.equal((await reader.reload()).status(), 404);
        await transition(owner, title, "Publish publicly");
      },
    );
    await scenario(
      "Community administrator removal locks authors and restoration never republishes",
      async () => {
        await directory(a, true);
        await row(a, title)
          .getByRole("button", { name: "View post", exact: true })
          .click();
        await expect(a.locator("textarea")).toHaveCount(0);
        await a.getByRole("button", { name: "Close editor" }).click();
        await transition(a, title, "Remove post", "PRIVACY");
        await expect(row(a, title)).toContainText("REMOVED");
        await owner.getByRole("button", { name: "Refresh directory" }).click();
        await expect(row(owner, title)).toContainText("PRIVACY");
        await expect(
          row(owner, title).getByRole("button", {
            name: "Publish publicly",
            exact: true,
          }),
        ).toHaveCount(0);
        await row(owner, title)
          .getByRole("button", { name: "View post", exact: true })
          .click();
        await expect(owner.locator("textarea")).toHaveCount(0);
        await expect(owner.locator("[data-community-editor]")).toContainText(
          "PRIVACY",
        );
        await owner.getByRole("button", { name: "Close editor" }).click();
        assert.equal(
          (await reader.goto(`${webOrigin}/community/${post.id}`)).status(),
          404,
        );
        await transition(a, title, "Restore to draft");
        await expect(row(a, title)).toContainText("DRAFT");
        assert.equal((await reader.reload()).status(), 404);
        await owner.getByRole("button", { name: "Refresh directory" }).click();
        await expect(row(owner, title)).toContainText("DRAFT");
        await transition(owner, title, "Publish publicly");
      },
    );
    await scenario(
      "Community unsaved edits survive identity checks and canceled navigation",
      async () => {
        await row(owner, title)
          .getByRole("button", { name: "Edit post", exact: true })
          .click();
        await owner
          .getByLabel("Markdown body")
          .fill("Unsaved community buffer");
        await owner.evaluate(() =>
          window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true }),
          ),
        );
        await expect(owner.getByLabel("Markdown body")).toHaveValue(
          "Unsaved community buffer",
        );
        await nativeDecision(
          owner,
          () =>
            owner
              .getByRole("link", { name: "Read community", exact: true })
              .click(),
          false,
        );
        await expect(owner).toHaveURL(`${webOrigin}/account/posts`);
        await expect(owner.getByLabel("Markdown body")).toHaveValue(
          "Unsaved community buffer",
        );
        await nativeDecision(
          owner,
          () => owner.getByRole("button", { name: "Close editor" }).click(),
          true,
        );
      },
    );
    await scenario(
      "Community concurrent edits conflict and reload the actual revision",
      async () => {
        await row(owner, title)
          .getByRole("button", { name: "Edit post", exact: true })
          .click();
        await owner.getByLabel("Markdown body").fill("Conflicting buffer");
        const current = (
          await gql(owner, mine, { input: {} })
        ).body.data.myCommunityPosts.items.find((x) => x.id === post.id);
        assert.ok(
          (
            await gql(owner, update, {
              input: {
                id: post.id,
                expectedRevision: current.revision,
                bodyMarkdown: "## Concurrent idea\n\nChanged in another tab.",
              },
            })
          ).body.data,
        );
        await owner
          .getByRole("button", { name: "Review published changes" })
          .click();
        await owner
          .getByRole("button", { name: "Confirm community change" })
          .click();
        await expect(owner.getByRole("main").getByRole("alert")).toContainText(
          "This post changed. Reload it before saving.",
        );
        await nativeDecision(
          owner,
          () => owner.getByRole("button", { name: "Reload post" }).click(),
          true,
        );
        await expect(owner.getByLabel("Markdown body")).toHaveValue(
          /Concurrent idea/,
        );
        await owner.getByRole("button", { name: "Close editor" }).click();
      },
    );
    await scenario(
      "Community aborted and committed-but-lost writes reconcile without replay",
      async () => {
        let submitted = 0;
        await owner.route(`${api}/graphql`, (route) => {
          if (/mutation/.test(route.request().postData() || "")) {
            submitted++;
            return route.abort();
          }
          return route.continue();
        });
        await transition(owner, title, "Withdraw to draft");
        await expect(
          owner.getByText("The outcome is uncertain.", { exact: false }),
        ).toBeVisible();
        assert.equal(submitted, 1);
        await expect(
          owner.getByRole("button", { name: "New post", exact: true }),
        ).toBeDisabled();
        await owner.unroute(`${api}/graphql`);
        await owner.getByRole("button", { name: "Refresh directory" }).click();
        await expect(row(owner, title)).toContainText("PUBLISHED");
        await owner.route(`${api}/graphql`, (route) => {
          const work = (async () => {
            if (/mutation/.test(route.request().postData() || "")) {
              submitted++;
              assert.ok((await (await route.fetch()).json()).data);
              await route.abort();
            } else await route.continue();
          })().catch(() => {});
          routeWork.add(work);
          void work.finally(() => routeWork.delete(work));
        });
        await transition(owner, title, "Withdraw to draft");
        await expect(
          owner.getByText("The outcome is uncertain.", { exact: false }),
        ).toBeVisible();
        assert.equal(submitted, 2);
        await owner.unroute(`${api}/graphql`);
        await owner.getByRole("button", { name: "Refresh directory" }).click();
        await expect(row(owner, title)).toContainText("DRAFT");
        await transition(owner, title, "Publish publicly");
        await owner.route(`${api}/graphql`, (route) => {
          const query = route.request().postDataJSON().query;
          return query.includes("MyCommunityPosts")
            ? route.abort()
            : route.continue();
        });
        await transition(owner, title, "Withdraw to draft");
        await expect(
          owner.getByRole("status").filter({ hasText: "Post saved." }),
        ).toBeVisible();
        await expect(owner.getByRole("main").getByRole("alert")).toBeVisible();
        await owner.unroute(`${api}/graphql`);
        await owner.getByRole("button", { name: "Refresh directory" }).click();
        await expect(row(owner, title)).toContainText("DRAFT");
        await transition(owner, title, "Publish publicly");
      },
    );
    await scenario(
      "Community public outage, mobile layouts and storage/network privacy",
      async () => {
        await reader.goto(`${webOrigin}/community`);
        await reader.screenshot({ path: join(temp, "community-desktop.png") });
        const mobileCtx = await context({ width: 390, height: 844 }),
          mobile = await mobileCtx.newPage();
        await mobile.goto(`${webOrigin}/community/${post.id}`);
        await expect(
          mobile.getByRole("heading", { name: "Concurrent idea" }),
        ).toBeVisible();
        assert.equal(
          await mobile.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await mobile.screenshot({ path: join(temp, "community-mobile.png") });
        await mobileCtx.close();
        await row(owner, title)
          .getByRole("button", { name: "Edit post", exact: true })
          .click();
        await owner.screenshot({ path: join(temp, "community-editor.png") });
        const storage = await owner.evaluate(() =>
          JSON.stringify({ ...localStorage, ...sessionStorage }),
        );
        assert.equal(
          storage.includes(title) || storage.includes("Concurrent idea"),
          false,
        );
        assert.equal(
          requests.some((req) =>
            /unrequested\.example|\/(uploads|lecture-sync|recordings|media)(\/|$)/.test(
              req.url,
            ),
          ),
          false,
        );
        assert.equal(
          requests.some((req) =>
            /multipart\/|image\//.test(req.headers["content-type"] || ""),
          ),
          false,
        );
        await owner.getByRole("button", { name: "Close editor" }).click();
        await fixture("community-index-unavailable", author.id);
        try {
          assert.equal(
            (await reader.goto(`${webOrigin}/community`)).status(),
            503,
          );
          await expect(
            reader.getByRole("main").getByRole("alert"),
          ).toContainText("Community is temporarily unavailable.");
          assert.equal(
            (await reader.goto(`${webOrigin}/community/${post.id}`)).status(),
            503,
          );
          await expect(
            reader.getByRole("button", { name: "Retry entry", exact: true }),
          ).toBeVisible();
        } finally {
          await fixture("community-index-prepare", author.id);
        }
        await reader
          .getByRole("button", { name: "Retry entry", exact: true })
          .click();
        await expect(
          reader.getByRole("heading", { name: "Concurrent idea" }),
        ).toBeVisible();
        assert.equal(
          (await anonymous.cookies()).length,
          0,
          "Public reader issued cookies",
        );
      },
    );
    await scenario(
      "Community account revocation clears editors while published posts remain",
      async () => {
        await row(owner, title)
          .getByRole("button", { name: "Edit post", exact: true })
          .click();
        await owner.getByLabel("Markdown body").fill("Clear on block");
        assert.ok(
          (
            await gql(a, access, {
              input: { id: author.id, status: "BLOCKED" },
            })
          ).body.data,
        );
        await owner.evaluate(() =>
          window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true }),
          ),
        );
        await expect(owner).toHaveURL(/login\?session=ended/);
        await expect(owner.locator("textarea")).toHaveCount(0);
        assert.equal(
          (await reader.goto(`${webOrigin}/community/${post.id}`)).status(),
          200,
        );
        assert.ok(
          (await gql(a, access, { input: { id: author.id, status: "ACTIVE" } }))
            .body.data,
        );
        await directory(b, true);
        await row(b, title)
          .getByRole("button", { name: "View post", exact: true })
          .click();
        assert.ok(
          (await gql(a, access, { input: { id: adminB.id, role: "USER" } }))
            .body.data,
        );
        await b.evaluate(() =>
          window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true }),
          ),
        );
        await expect(b).toHaveURL(/login\?session=ended/);
        await expect(b.locator("[data-community-editor]")).toHaveCount(0);
        assert.ok(
          (await gql(a, access, { input: { id: adminB.id, role: "ADMIN" } }))
            .body.data,
        );
        assert.deepEqual(diagnostics, []);
      },
    );
    await scenario(
      "Community cross-tab logout clears the author buffer without changing published content",
      async () => {
        const restored = await login(owner.context(), author);
        await directory(restored);
        await row(restored, title)
          .getByRole("button", { name: "Edit post", exact: true })
          .click();
        await restored
          .getByLabel("Markdown body")
          .fill("Unsaved buffer cleared by cross-tab logout");
        const sibling = await restored.context().newPage();
        await directory(sibling);
        await sibling
          .getByRole("button", { name: "Log out", exact: true })
          .click();
        await expect(sibling).toHaveURL(/login\?session=logged-out/);
        await expect(restored).toHaveURL(/login\?session=ended/);
        await expect(restored.locator("textarea")).toHaveCount(0);
        assert.equal(
          (await reader.goto(`${webOrigin}/community/${post.id}`)).status(),
          200,
        );
        assert.deepEqual(diagnostics, []);
      },
    );
  } finally {
    for (const ctx of contexts)
      for (const page of ctx.pages())
        await page.unrouteAll({ behavior: "wait" }).catch(() => {});
    await Promise.allSettled(routeWork);
    for (const ctx of contexts) await ctx.close();
  }
}
