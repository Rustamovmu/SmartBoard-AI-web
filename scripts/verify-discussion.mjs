import assert from "node:assert/strict";
import { join } from "node:path";
import { expect } from "@playwright/test";
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const commentFields = "id postId state revision publicDisplayName bodyMarkdown";
const mine = `query($input:ManagedCommunityCommentsInput!){myCommunityComments(input:$input){items{${commentFields}}total}}`;
const update = `mutation($input:UpdateCommunityCommentInput!){updateCommunityComment(input:$input){${commentFields}}}`;
const reports =
  "query($input:CommunityReportsInput!){myCommunityReports(input:$input){items{id targetId state revision reason}total}}";
const access =
  "mutation($input:UpdateAccountAccessInput!){adminUpdateAccountAccess(input:$input){id role status}}";
export async function verifyDiscussion({
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
    requests = [],
    diagnostics = [],
    work = new Set();
  let bucket = 0,
    count = 0,
    writes = 0;
  async function fresh() {
    const delay = 60100 - (Date.now() % 60000);
    await wait(Math.min(delay, 59000));
    if (delay > 59000) await wait(delay - 59000);
    bucket = Math.floor(Date.now() / 60000);
    count = 0;
    writes = 0;
  }
  await fresh();
  async function scenario(name, run) {
    if (count >= 20 || writes >= 7) {
      console.log("Pacing discussion verification within unchanged limits…");
      await fresh();
    }
    await check(name, run);
  }
  async function context() {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: false });
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
    ctx.on("page", (page) =>
      page.on("pageerror", () => diagnostics.push("Discussion runtime error")),
    );
    return ctx;
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
  async function gql(page, query, variables) {
    return page.evaluate(
      async ({ api, query, variables }) => {
        const csrf = (
          await (
            await fetch(`${api}/auth/csrf`, {
              credentials: "include",
              headers: { "X-SmartBord-Client": "browser" },
            })
          ).json()
        ).csrfToken;
        const response = await fetch(`${api}/graphql`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-SmartBord-Client": "browser",
            "X-CSRF-Token": csrf,
          },
          body: JSON.stringify({ query, variables }),
        });
        return { status: response.status, body: await response.json() };
      },
      { api, query, variables },
    );
  }
  async function confirm(page, run, accept = true) {
    await page.bringToFront();
    const dialog = page
      .waitForEvent("dialog", { timeout: 10000 })
      .then((d) => (accept ? d.accept() : d.dismiss()));
    await Promise.all([dialog, run()]);
  }
  const commentRow = (page, id) => page.locator(`[data-comment-id="${id}"]`);
  const reportRow = (page, id) => page.locator(`[data-report-id="${id}"]`);
  async function directory(page, path = "/account/comments") {
    await page.goto(`${webOrigin}${path}`);
    await expect(
      page.getByRole("button", {
        name: "Refresh comment directory",
        exact: true,
      }),
    ).toBeEnabled({ timeout: 20000 });
  }
  async function reportDirectory(page, path = "/account/reports") {
    await page.goto(`${webOrigin}${path}`);
    await expect(
      page.getByRole("button", { name: "Refresh reports", exact: true }),
    ).toBeEnabled({ timeout: 20000 });
  }
  let a, b, owner, other, reader, post, comment, commentReport;
  const body =
    "A **shared discussion**.\n\n![blocked](https://unrequested.example/discussion.png)\n\n<script>window.discussionInjected=true</script>";
  try {
    a = await login(await context(), adminA);
    b = await login(await context(), adminB);
    owner = await login(await context(), author);
    other = await login(await context(), outsider);
    reader = await (await context()).newPage();
    await scenario(
      "Discussion route/role and protected SSR isolation",
      async () => {
        for (const path of [
          "/account/comments",
          "/account/reports",
          "/admin/comments",
          "/admin/reports",
        ]) {
          await reader.goto(`${webOrigin}${path}`);
          await expect(reader).toHaveURL(`${webOrigin}/login`);
        }
        for (const path of ["/admin/comments", "/admin/reports"]) {
          await other.goto(`${webOrigin}${path}`);
          await expect(
            other.getByRole("heading", { name: "Access denied" }),
          ).toBeVisible();
        }
        const created = await gql(
          owner,
          "mutation($input:CreateCommunityPostInput!){createCommunityPost(input:$input){id revision}}",
          {
            input: {
              title: "Synthetic discussion parent",
              publicDisplayName: "Parent alias",
              bodyMarkdown: "Deliberately published general text",
            },
          },
        );
        assert.ok(created.body.data, JSON.stringify(created.body.errors));
        post = created.body.data.createCommunityPost;
        const published = await gql(
          owner,
          "mutation($input:UpdateCommunityPostInput!){updateCommunityPost(input:$input){id revision}}",
          {
            input: {
              id: post.id,
              expectedRevision: post.revision,
              state: "PUBLISHED",
            },
          },
        );
        assert.ok(published.body.data);
        post = published.body.data.updateCommunityPost;
        await directory(owner, `/account/comments?postId=${post.id}&compose=1`);
        const nextData = await owner.locator("#__NEXT_DATA__").textContent();
        assert.ok(
          !nextData.includes("bodyMarkdown") &&
            !nextData.includes("reporterUserId"),
        );
        const noCsrf = await owner.evaluate(
          async ({ api }) =>
            (
              await fetch(`${api}/graphql`, {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  "X-SmartBord-Client": "browser",
                },
                body: JSON.stringify({
                  query: "{myCommunityReports(input:{}){total}}",
                }),
              })
            ).status,
          { api },
        );
        assert.equal(noCsrf, 403);
      },
    );
    await scenario(
      "Explicit comment publication, byte limits, chosen attribution and safe anonymous reading",
      async () => {
        await expect(owner.getByLabel("Public comment name")).toHaveValue(
          author.name,
        );
        await owner
          .getByLabel("Public comment name")
          .fill("Chosen discussion name");
        await owner.getByLabel("Comment Markdown").fill("한".repeat(1366));
        await expect(
          owner.getByRole("button", { name: "Publish comment", exact: true }),
        ).toBeDisabled();
        await owner.getByLabel("Comment Markdown").fill(body);
        await confirm(
          owner,
          () =>
            owner
              .getByRole("button", { name: "Publish comment", exact: true })
              .click(),
          false,
        );
        assert.equal(
          (await gql(owner, mine, { input: { postId: post.id } })).body.data
            .myCommunityComments.total,
          0,
        );
        await confirm(owner, () =>
          owner
            .getByRole("button", { name: "Publish comment", exact: true })
            .click(),
        );
        await expect(
          owner.getByText("Comment change saved.", { exact: true }),
        ).toBeVisible();
        comment = (await gql(owner, mine, { input: { postId: post.id } })).body
          .data.myCommunityComments.items[0];
        assert.equal(comment.state, "PUBLISHED");
        await reader.goto(`${webOrigin}/community/${post.id}`);
        await expect(commentRow(reader, comment.id)).toContainText(
          "Chosen discussion name",
        );
        await expect(
          commentRow(reader, comment.id).locator("img,script"),
        ).toHaveCount(0);
        assert.equal(
          await reader.evaluate(() => window.discussionInjected),
          undefined,
        );
        assert.ok(
          !requests.some((req) => req.url.includes("unrequested.example")),
        );
        const publicCalls = requests.filter(
          (req) =>
            req.body.includes("CommunityComments") &&
            req.headers["x-smartbord-client"] === "public",
        );
        assert.ok(publicCalls.length);
        for (const req of publicCalls) {
          assert.equal(req.headers.cookie, undefined);
          assert.equal(req.headers.authorization, undefined);
          assert.equal(req.headers["x-csrf-token"], undefined);
        }
      },
    );
    await scenario(
      "Comment owner isolation, dirty-buffer lifecycle and live editing",
      async () => {
        await directory(other);
        await expect(other.getByText("No matching comments.")).toBeVisible();
        const forged = await gql(other, update, {
          input: {
            id: comment.id,
            expectedRevision: comment.revision,
            bodyMarkdown: "Forged",
          },
        });
        assert.equal(forged.body.errors[0].extensions.code, "NOT_FOUND");
        await commentRow(owner, comment.id)
          .getByRole("button", { name: "Edit comment", exact: true })
          .click();
        await owner
          .getByLabel("Comment Markdown")
          .fill("Live edited discussion");
        await owner.evaluate(() =>
          window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true }),
          ),
        );
        await expect(owner.getByLabel("Comment Markdown")).toHaveValue(
          "Live edited discussion",
        );
        await confirm(
          owner,
          () =>
            owner
              .getByRole("link", { name: "Your reports", exact: true })
              .click(),
          false,
        );
        await expect(owner.getByLabel("Comment Markdown")).toHaveValue(
          "Live edited discussion",
        );
        await confirm(owner, () =>
          owner
            .getByRole("button", { name: "Save comment edit", exact: true })
            .click(),
        );
        await expect(
          owner.getByText("Comment change saved.", { exact: true }),
        ).toBeVisible();
        comment = (await gql(owner, mine, { input: { postId: post.id } })).body
          .data.myCommunityComments.items[0];
        await reader
          .getByRole("button", { name: "Refresh comments", exact: true })
          .click();
        await expect(commentRow(reader, comment.id)).toContainText(
          "Live edited discussion",
        );
      },
    );
    await scenario(
      "Private reason-coded comment/post reports, duplicate reconciliation and reporter isolation",
      async () => {
        await reportDirectory(
          other,
          `/account/reports?targetType=COMMENT&targetId=${comment.id}`,
        );
        await other
          .getByLabel("Report reason", { exact: true })
          .selectOption("PRIVACY");
        await confirm(
          other,
          () =>
            other
              .getByRole("button", { name: "Submit report", exact: true })
              .click(),
          false,
        );
        await expect(other.getByText("No matching reports.")).toBeVisible();
        await confirm(other, () =>
          other
            .getByRole("button", { name: "Submit report", exact: true })
            .click(),
        );
        await expect(
          other.getByText("Report change saved.", { exact: true }),
        ).toBeVisible();
        commentReport = (await gql(other, reports, { input: {} })).body.data
          .myCommunityReports.items[0];
        assert.equal(commentReport.reason, "PRIVACY");
        await confirm(other, () =>
          other
            .getByRole("button", { name: "Submit report", exact: true })
            .click(),
        );
        await expect(
          other.getByRole("button", { name: "Reconcile reports", exact: true }),
        ).toBeEnabled();
        await expect(
          other.getByRole("button", { name: "Submit report", exact: true }),
        ).toBeDisabled();
        await other
          .getByRole("button", { name: "Reconcile reports", exact: true })
          .click();
        await expect(
          other.getByRole("button", { name: "Refresh reports", exact: true }),
        ).toBeEnabled();
        assert.equal(
          (await gql(other, reports, { input: {} })).body.data
            .myCommunityReports.total,
          1,
        );
        await reportDirectory(owner);
        await expect(owner.getByText("No matching reports.")).toBeVisible();
        await reportDirectory(
          other,
          `/account/reports?targetType=POST&targetId=${post.id}`,
        );
        await confirm(other, () =>
          other
            .getByRole("button", { name: "Submit report", exact: true })
            .click(),
        );
        await expect(
          other.getByText("Report change saved.", { exact: true }),
        ).toBeVisible();
      },
    );
    await scenario(
      "Reported-content inspection, reasoned moderation, explicit review and restore-to-draft",
      async () => {
        await reportDirectory(a, "/admin/reports");
        await reportRow(a, commentReport.id)
          .getByRole("button", { name: "Inspect reported content" })
          .click();
        await expect(a.locator("[data-report-inspection]")).toContainText(
          "Live edited discussion",
        );
        await a.getByLabel("Content removal reason").selectOption("ABUSE");
        await confirm(a, () =>
          a.getByRole("button", { name: "Remove reported content" }).click(),
        );
        await expect(
          a.getByText(
            "Content moderation saved. Review the report separately.",
            { exact: true },
          ),
        ).toBeVisible();
        await expect(reportRow(a, commentReport.id)).toContainText("OPEN");
        await confirm(a, () =>
          reportRow(a, commentReport.id)
            .getByRole("button", { name: "Resolve report" })
            .click(),
        );
        await expect(reportRow(a, commentReport.id)).toContainText("RESOLVED");
        await directory(owner);
        await expect(commentRow(owner, comment.id)).toContainText(
          "Removal reason: ABUSE",
        );
        await expect(
          commentRow(owner, comment.id).getByRole("button", {
            name: "Edit comment",
            exact: true,
          }),
        ).toHaveCount(0);
        await reader
          .getByRole("button", { name: "Refresh comments", exact: true })
          .click();
        await expect(commentRow(reader, comment.id)).toHaveCount(0);
        await directory(a, `/admin/comments?postId=${post.id}`);
        await confirm(a, () =>
          commentRow(a, comment.id)
            .getByRole("button", { name: "Restore comment" })
            .click(),
        );
        await expect(commentRow(a, comment.id)).toContainText("DRAFT");
        await directory(owner);
        await confirm(owner, () =>
          commentRow(owner, comment.id)
            .getByRole("button", { name: "Republish comment" })
            .click(),
        );
        await expect(commentRow(owner, comment.id)).toContainText("PUBLISHED");
        await reader
          .getByRole("button", { name: "Refresh comments", exact: true })
          .click();
        await expect(commentRow(reader, comment.id)).toBeVisible();
      },
    );
    await scenario(
      "Concurrent report reviews require reconciliation of the actual outcome",
      async () => {
        const postReport = (
          await gql(other, reports, { input: {} })
        ).body.data.myCommunityReports.items.find(
          (r) => r.targetId === post.id,
        );
        await reportDirectory(a, "/admin/reports");
        await reportDirectory(b, "/admin/reports");
        await confirm(a, () =>
          reportRow(a, postReport.id)
            .getByRole("button", { name: "Dismiss report" })
            .click(),
        );
        await expect(reportRow(a, postReport.id)).toContainText("DISMISSED");
        await confirm(b, () =>
          reportRow(b, postReport.id)
            .getByRole("button", { name: "Resolve report" })
            .click(),
        );
        await expect(
          b.getByRole("button", { name: "Reconcile reports", exact: true }),
        ).toBeEnabled();
        await b
          .getByRole("button", { name: "Reconcile reports", exact: true })
          .click();
        await expect(reportRow(b, postReport.id)).toContainText("DISMISSED");
        await directory(owner);
      },
    );
    await scenario(
      "Stale comment revisions require reconciliation without overwriting another edit",
      async () => {
        comment = (await gql(owner, mine, { input: { postId: post.id } })).body
          .data.myCommunityComments.items[0];
        await commentRow(owner, comment.id)
          .getByRole("button", { name: "Edit comment", exact: true })
          .click();
        await owner.getByLabel("Comment Markdown").fill("Stale buffer");
        assert.ok(
          (
            await gql(owner, update, {
              input: {
                id: comment.id,
                expectedRevision: comment.revision,
                bodyMarkdown: "Concurrent saved text",
              },
            })
          ).body.data,
        );
        await confirm(owner, () =>
          owner
            .getByRole("button", { name: "Save comment edit", exact: true })
            .click(),
        );
        await expect(
          owner.getByRole("button", {
            name: "Reconcile comments",
            exact: true,
          }),
        ).toBeEnabled();
        await confirm(owner, () =>
          owner
            .getByRole("button", { name: "Reconcile comments", exact: true })
            .click(),
        );
        await expect(commentRow(owner, comment.id)).toContainText(
          "Concurrent saved text",
        );
        await expect(owner.locator("[data-comment-editor]")).toHaveCount(0);
      },
    );
    await scenario(
      "Aborted and committed-but-lost comment writes are never replayed",
      async () => {
        await directory(owner, `/account/comments?postId=${post.id}&compose=1`);
        await owner
          .getByLabel("Comment Markdown")
          .fill("Ambiguous comment write");
        let intercepted = 0,
          committed = false,
          phase = "abort";
        const handler = (route) => {
          if (
            !route
              .request()
              .postData()
              ?.includes('"operationName":"CreateCommunityComment"')
          )
            return route.continue();
          intercepted++;
          const task = (async () => {
            if (phase === "lost") {
              const response = await route.fetch();
              const json = await response.json();
              assert.ok(json.data?.createCommunityComment);
              committed = true;
            }
            await route.abort("failed");
          })();
          work.add(task);
          task.finally(() => work.delete(task));
          return task;
        };
        await owner.route(`${api}/graphql`, handler);
        try {
          await confirm(owner, () =>
            owner
              .getByRole("button", { name: "Publish comment", exact: true })
              .click(),
          );
          await expect(
            owner.getByRole("button", {
              name: "Reconcile comments",
              exact: true,
            }),
          ).toBeEnabled();
          assert.equal(intercepted, 1);
          await confirm(owner, () =>
            owner
              .getByRole("button", { name: "Reconcile comments", exact: true })
              .click(),
          );
          await expect(
            owner.getByRole("button", {
              name: "Refresh comment directory",
              exact: true,
            }),
          ).toBeEnabled();
          await owner
            .getByRole("button", { name: "New comment", exact: true })
            .click();
          await owner
            .getByLabel("Comment Markdown")
            .fill("Ambiguous comment write");
          phase = "lost";
          await confirm(owner, () =>
            owner
              .getByRole("button", { name: "Publish comment", exact: true })
              .click(),
          );
          await expect(
            owner.getByRole("button", {
              name: "Reconcile comments",
              exact: true,
            }),
          ).toBeEnabled();
          assert.ok(committed);
          assert.equal(intercepted, 2);
          await confirm(owner, () =>
            owner
              .getByRole("button", { name: "Reconcile comments", exact: true })
              .click(),
          );
          await expect(
            owner.getByRole("button", {
              name: "Refresh comment directory",
              exact: true,
            }),
          ).toBeEnabled();
          const entries = (
            await gql(owner, mine, { input: { postId: post.id } })
          ).body.data.myCommunityComments.items;
          assert.equal(
            entries.filter((c) => c.bodyMarkdown === "Ambiguous comment write")
              .length,
            1,
          );
          assert.equal(intercepted, 2);
        } finally {
          await owner.unroute(`${api}/graphql`, handler);
        }
      },
    );
    await scenario(
      "Confirmed comment save with a failed directory read reports success separately",
      async () => {
        await directory(owner, `/account/comments?postId=${post.id}&compose=1`);
        await owner
          .getByLabel("Comment Markdown")
          .fill("Saved before directory outage");
        let saved = false;
        const handler = (route) => {
          const body = route.request().postData() || "";
          if (saved && body.includes('"operationName":"MyCommunityComments"'))
            return route.abort("failed");
          if (!body.includes('"operationName":"CreateCommunityComment"'))
            return route.continue();
          const task = (async () => {
            const response = await route.fetch();
            assert.ok((await response.json()).data?.createCommunityComment);
            saved = true;
            await route.fulfill({ response });
          })();
          work.add(task);
          task.finally(() => work.delete(task));
          return task;
        };
        await owner.route(`${api}/graphql`, handler);
        try {
          await confirm(owner, () =>
            owner
              .getByRole("button", { name: "Publish comment", exact: true })
              .click(),
          );
          await expect(
            owner.getByText(
              "Comment change saved, but the directory could not be refreshed. Retry the read.",
              { exact: true },
            ),
          ).toBeVisible();
        } finally {
          await owner.unroute(`${api}/graphql`, handler);
        }
        await owner
          .getByRole("button", {
            name: "Refresh comment directory",
            exact: true,
          })
          .click();
        await expect(
          owner.getByText("Saved before directory outage", { exact: true }),
        ).toBeVisible();
      },
    );
    await scenario(
      "Committed-but-lost report writes reconcile to one retained report",
      async () => {
        await reportDirectory(
          owner,
          `/account/reports?targetType=COMMENT&targetId=${comment.id}`,
        );
        let intercepted = 0;
        const handler = (route) => {
          if (
            !route
              .request()
              .postData()
              ?.includes('"operationName":"CreateCommunityReport"')
          )
            return route.continue();
          intercepted++;
          const task = (async () => {
            const result = await (await route.fetch()).json();
            assert.ok(result.data?.createCommunityReport);
            await route.abort("failed");
          })();
          work.add(task);
          task.finally(() => work.delete(task));
          return task;
        };
        await owner.route(`${api}/graphql`, handler);
        try {
          await confirm(owner, () =>
            owner
              .getByRole("button", { name: "Submit report", exact: true })
              .click(),
          );
          await expect(
            owner.getByRole("button", {
              name: "Reconcile reports",
              exact: true,
            }),
          ).toBeEnabled();
          await expect(
            owner.getByRole("button", { name: "Submit report", exact: true }),
          ).toBeDisabled();
          await owner
            .getByRole("button", { name: "Reconcile reports", exact: true })
            .click();
          await expect(
            owner.getByRole("button", { name: "Refresh reports", exact: true }),
          ).toBeEnabled();
          assert.equal(intercepted, 1);
          assert.equal(
            (await gql(owner, reports, { input: {} })).body.data
              .myCommunityReports.total,
            1,
          );
        } finally {
          await owner.unroute(`${api}/graphql`, handler);
        }
      },
    );
    await scenario(
      "Withdrawal, republication and hidden parents govern actual public comment visibility",
      async () => {
        await directory(owner);
        await confirm(owner, () =>
          commentRow(owner, comment.id)
            .getByRole("button", { name: "Withdraw comment", exact: true })
            .click(),
        );
        await expect(commentRow(owner, comment.id)).toContainText("DRAFT");
        await reader
          .getByRole("button", { name: "Refresh comments", exact: true })
          .click();
        await expect(commentRow(reader, comment.id)).toHaveCount(0);
        await confirm(owner, () =>
          commentRow(owner, comment.id)
            .getByRole("button", { name: "Republish comment", exact: true })
            .click(),
        );
        await expect(commentRow(owner, comment.id)).toContainText("PUBLISHED");
        post = (
          await gql(
            owner,
            "mutation($input:UpdateCommunityPostInput!){updateCommunityPost(input:$input){id revision}}",
            {
              input: {
                id: post.id,
                expectedRevision: post.revision,
                state: "DRAFT",
              },
            },
          )
        ).body.data.updateCommunityPost;
        await reader
          .getByRole("button", { name: "Refresh comments", exact: true })
          .click();
        await expect(
          reader.getByRole("button", { name: "Retry comments", exact: true }),
        ).toBeVisible();
        post = (
          await gql(
            owner,
            "mutation($input:UpdateCommunityPostInput!){updateCommunityPost(input:$input){id revision}}",
            {
              input: {
                id: post.id,
                expectedRevision: post.revision,
                state: "PUBLISHED",
              },
            },
          )
        ).body.data.updateCommunityPost;
        await reader
          .getByRole("button", { name: "Retry comments", exact: true })
          .click();
        await expect(commentRow(reader, comment.id)).toBeVisible();
      },
    );
    await scenario(
      "Real comment/report index outages fail closed and recover through read retries",
      async () => {
        await fixture("comment-index-unavailable", adminA.id);
        try {
          await reader
            .getByRole("button", { name: "Refresh comments", exact: true })
            .click();
          await expect(
            reader.getByRole("button", { name: "Retry comments", exact: true }),
          ).toBeVisible();
        } finally {
          await fixture("comment-index-prepare", adminA.id);
        }
        await reader
          .getByRole("button", { name: "Retry comments", exact: true })
          .click();
        await expect(commentRow(reader, comment.id)).toBeVisible();
        await fixture("report-index-unavailable", adminA.id);
        try {
          await reportDirectory(a, "/admin/reports");
          await expect(a.getByRole("main").getByRole("alert")).toContainText(
            "temporarily unavailable",
          );
        } finally {
          await fixture("report-index-prepare", adminA.id);
        }
        await a
          .getByRole("button", { name: "Refresh reports", exact: true })
          .click();
        await expect(reportRow(a, commentReport.id)).toBeVisible();
      },
    );
    await scenario(
      "Discussion responsive layout, public transport and protected storage isolation",
      async () => {
        await reader.screenshot({
          path: join(temp, "discussion-public.png"),
          fullPage: true,
        });
        await reader.setViewportSize({ width: 390, height: 844 });
        await expect(commentRow(reader, comment.id)).toBeVisible();
        assert.equal(
          await reader.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await directory(owner, `/account/comments?postId=${post.id}&compose=1`);
        await owner.setViewportSize({ width: 390, height: 844 });
        await owner
          .getByLabel("Comment Markdown")
          .fill("Unsaved responsive preview");
        await expect(
          owner.getByRole("button", { name: "Publish comment", exact: true }),
        ).toBeEnabled();
        await owner
          .getByRole("button", { name: "Publish comment", exact: true })
          .scrollIntoViewIfNeeded();
        await expect(
          owner.locator("[data-comment-editor] .help-markdown"),
        ).toContainText("Unsaved responsive preview");
        await owner.screenshot({
          path: join(temp, "discussion-editor.png"),
          fullPage: true,
        });
        assert.equal(
          await owner.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await reportDirectory(a, "/admin/reports");
        await a.screenshot({
          path: join(temp, "discussion-reports.png"),
          fullPage: true,
        });
        for (const page of [owner, other, a]) {
          const storage = await page.evaluate(() => ({
            local: { ...localStorage },
            session: { ...sessionStorage },
            data: document.querySelector("#__NEXT_DATA__").textContent,
          }));
          assert.ok(!JSON.stringify(storage).includes("Concurrent saved text"));
          assert.ok(
            !JSON.stringify(storage).includes("Unsaved responsive preview"),
          );
          assert.ok(!storage.data.includes("bodyMarkdown"));
        }
        assert.ok(
          !requests.some((req) =>
            /multipart\/form-data/i.test(req.headers["content-type"] || ""),
          ),
        );
        assert.deepEqual(diagnostics, []);
      },
    );
    await scenario(
      "Account/admin revocation and cross-tab logout clear discussion buffers",
      async () => {
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
        assert.ok(
          (await gql(a, access, { input: { id: author.id, status: "ACTIVE" } }))
            .body.data,
        );
        await reportDirectory(b, "/admin/reports");
        await reportRow(b, commentReport.id)
          .getByRole("button", { name: "Inspect reported content" })
          .click();
        await expect(b.locator("[data-report-inspection]")).toBeVisible();
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
        await expect(b.locator("[data-report-inspection]")).toHaveCount(0);
        assert.ok(
          (await gql(a, access, { input: { id: adminB.id, role: "ADMIN" } }))
            .body.data,
        );
        owner = await login(owner.context(), author);
        await directory(owner, `/account/comments?postId=${post.id}&compose=1`);
        await owner
          .getByLabel("Comment Markdown")
          .fill("Cross-tab unsaved discussion");
        const sibling = await owner.context().newPage();
        await reportDirectory(sibling);
        await sibling
          .getByRole("button", { name: "Log out", exact: true })
          .click();
        await expect(sibling).toHaveURL(/login\?session=logged-out/);
        await expect(owner).toHaveURL(/login\?session=ended/);
        await expect(owner.locator("textarea")).toHaveCount(0);
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
