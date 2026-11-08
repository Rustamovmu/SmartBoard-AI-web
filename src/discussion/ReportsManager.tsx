import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Account } from "@/auth/types";
import {
  createAccountClient,
  createAdminClient,
  failure,
} from "@/graphql/client";
import {
  MyCommunityReportsDocument,
  AdminCommunityReportsDocument,
  CreateCommunityReportDocument,
  AdminReviewCommunityReportDocument,
  AdminCommunityPostDocument,
  AdminCommunityCommentDocument,
  AdminModerateCommunityPostDocument,
  AdminModerateCommunityCommentDocument,
  type MyCommunityReportsQuery,
  type ReportFieldsFragment,
  type ReportState,
  type ReportTarget,
  type CommunityReason,
} from "@/graphql/generated";
import { HelpMarkdown } from "@/components/HelpMarkdown";
import { boundedPage, reasons, uuid } from "./shared";
type Target = {
  id: string;
  state: "DRAFT" | "PUBLISHED" | "REMOVED";
  revision: number;
  publicDisplayName: string;
  bodyMarkdown: string;
  title?: string;
};
export function ReportsManager({
  account,
  invalidate,
  moderation = false,
}: {
  account: Account;
  invalidate: () => void;
  moderation?: boolean;
}) {
  const router = useRouter();
  const targetId = uuid(router.query.targetId)
    ? router.query.targetId
    : undefined;
  const targetType =
    router.query.targetType === "POST" || router.query.targetType === "COMMENT"
      ? (router.query.targetType as ReportTarget)
      : undefined;
  const state =
    typeof router.query.state === "string" &&
    ["OPEN", "RESOLVED", "DISMISSED"].includes(router.query.state)
      ? (router.query.state as ReportState)
      : undefined;
  const input = {
    page: boundedPage(router.query.page),
    pageSize: 20,
    ...(state ? { state } : {}),
  };
  const key = JSON.stringify(input),
    current = useRef(input);
  current.current = input;
  const [client] = useState(() =>
    moderation
      ? createAdminClient(account.id)
      : createAccountClient(account.id),
  );
  const [data, setData] = useState<
      MyCommunityReportsQuery["myCommunityReports"] | null
    >(null),
    [selected, setSelected] = useState<{
      report: ReportFieldsFragment;
      target: Target;
    } | null>(null);
  const [reason, setReason] = useState<CommunityReason>("OTHER"),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [locked, setLocked] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const live = useRef(true),
    generation = useRef(0),
    selection = useRef(0),
    busy = useRef(false);
  const fail = useCallback(
    (cause: unknown) => {
      const result = failure(cause);
      if (["UNAUTHENTICATED", "FORBIDDEN"].includes(result.code)) invalidate();
      else
        setError(
          result.code === "CONFLICT"
            ? "This target was already reported, or the report/content changed. Refresh and inspect the saved state."
            : result.code === "NOT_FOUND"
              ? "The published target is unavailable. A withdrawn or removed target cannot receive new reports."
              : result.message,
        );
      return result;
    },
    [invalidate],
  );
  const load = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    setData(null);
    setError("");
    try {
      const result = moderation
        ? (
            await client.query({
              query: AdminCommunityReportsDocument,
              variables: { input: current.current },
            })
          ).data!.adminCommunityReports
        : (
            await client.query({
              query: MyCommunityReportsDocument,
              variables: { input: current.current },
            })
          ).data!.myCommunityReports;
      if (!live.current || ticket !== generation.current) return false;
      const last = Math.max(1, Math.ceil(result.total / result.pageSize));
      if (result.page > last) {
        await router.replace(
          { pathname: router.pathname, query: { ...router.query, page: last } },
          undefined,
          { shallow: true },
        );
        return false;
      }
      setData(result);
      return true;
    } catch (cause) {
      if (live.current && ticket === generation.current) fail(cause);
      return false;
    } finally {
      if (live.current && ticket === generation.current) setLoading(false);
    }
  }, [client, moderation, fail, router]);
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    setSelected(null);
    ++selection.current;
    void loader.current();
    return () => {
      ++generation.current;
    };
  }, [key]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      ++generation.current;
      ++selection.current;
      client.stop();
    };
  }, [client]);
  async function inspect(report: ReportFieldsFragment) {
    const ticket = ++selection.current;
    setSelected(null);
    setLoading(true);
    setError("");
    try {
      const target =
        report.targetType === "POST"
          ? (
              await client.query({
                query: AdminCommunityPostDocument,
                variables: { id: report.targetId },
              })
            ).data!.adminCommunityPost
          : (
              await client.query({
                query: AdminCommunityCommentDocument,
                variables: { id: report.targetId },
              })
            ).data!.adminCommunityComment;
      if (live.current && ticket === selection.current)
        setSelected({ report, target });
    } catch (cause) {
      if (live.current && ticket === selection.current) fail(cause);
    } finally {
      if (live.current && ticket === selection.current) setLoading(false);
    }
  }
  async function write(
    kind: "create" | "review" | "moderate",
    report?: ReportFieldsFragment,
    outcome?: "RESOLVED" | "DISMISSED",
  ) {
    if (busy.current || locked) return;
    const prompt =
      kind === "create"
        ? "Submit this reason-coded report? Administrators can review it. Reports do not automatically hide content."
        : kind === "review"
          ? `Mark this report ${outcome}? This records a review outcome and does not change content visibility.`
          : selected?.target.state === "REMOVED"
            ? "Restore this content to draft? It will remain hidden until its owner republishes."
            : "Remove this content with the selected reason? The author will see the reason.";
    if (!window.confirm(prompt)) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (kind === "create" && targetId && targetType)
        await client.mutate({
          mutation: CreateCommunityReportDocument,
          variables: { input: { targetId, targetType, reason } },
        });
      else if (kind === "review" && report && outcome)
        await client.mutate({
          mutation: AdminReviewCommunityReportDocument,
          variables: {
            input: {
              id: report.id,
              expectedRevision: report.revision,
              state: outcome,
            },
          },
        });
      else if (kind === "moderate" && selected) {
        const input = {
          id: selected.target.id,
          expectedRevision: selected.target.revision,
          action:
            selected.target.state === "REMOVED"
              ? ("RESTORE" as const)
              : ("REMOVE" as const),
          ...(selected.target.state === "REMOVED" ? {} : { reason }),
        };
        if (selected.report.targetType === "POST")
          await client.mutate({
            mutation: AdminModerateCommunityPostDocument,
            variables: { input },
          });
        else
          await client.mutate({
            mutation: AdminModerateCommunityCommentDocument,
            variables: { input },
          });
      } else return;
      if (!live.current) return;
      ++selection.current;
      setSelected(null);
      setNotice(
        kind === "moderate"
          ? "Content moderation saved. Review the report separately."
          : "Report change saved.",
      );
      if (!(await load()) && live.current)
        setNotice(
          "Change saved, but the report directory could not be refreshed. Retry the read.",
        );
    } catch (cause) {
      if (live.current) {
        const result = fail(cause);
        if (result.uncertain || result.code === "CONFLICT") {
          setLocked(true);
          setNotice(
            "No write will be replayed. Reconcile reports and inspect saved state before another change.",
          );
        }
      }
    } finally {
      busy.current = false;
      if (live.current) setPending(false);
    }
  }
  async function refresh() {
    ++selection.current;
    setSelected(null);
    if ((await load()) && live.current) {
      setLocked(false);
      setNotice(
        "Reports reloaded. Inspect the saved result before another change.",
      );
    }
  }
  const disabled = loading || pending || locked;
  return (
    <section className="discussion-manager">
      <p>
        Report a published community post or comment using a reason code.
        Reports are private to the reporter and platform administrators. No
        private lecture text, files or attachments are collected. One report per
        account and target is retained, including after review.
      </p>
      {!moderation && targetId && targetType && (
        <section className="discussion-editor">
          <h2>Report {targetType.toLowerCase()}</h2>
          <p className="discussion-id">Target {targetId}</p>
          <label>
            Report reason{" "}
            <select
              aria-label="Report reason"
              value={reason}
              disabled={disabled}
              onChange={(e) => setReason(e.target.value as CommunityReason)}
            >
              {reasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button disabled={disabled} onClick={() => void write("create")}>
            Submit report
          </button>
        </section>
      )}
      <div className="discussion-actions">
        <label>
          Report state{" "}
          <select
            aria-label="Report state"
            value={state || ""}
            disabled={pending}
            onChange={(e) =>
              void router.replace(
                {
                  pathname: router.pathname,
                  query: {
                    ...router.query,
                    page: 1,
                    state: e.target.value || undefined,
                  },
                },
                undefined,
                { shallow: true },
              )
            }
          >
            <option value="">All states</option>
            {["OPEN", "RESOLVED", "DISMISSED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button disabled={pending || loading} onClick={() => void refresh()}>
          {locked ? "Reconcile reports" : "Refresh reports"}
        </button>
      </div>
      {loading && <p role="status">Loading reports…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {data && (
        <>
          <div className="discussion-list">
            {!data.items.length && <p>No matching reports.</p>}
            {data.items.map((report) => (
              <article key={report.id} data-report-id={report.id}>
                <h2>
                  {report.targetType} · {report.reason}
                </h2>
                <p>
                  {report.state} · Revision {report.revision}
                </p>
                <p className="discussion-id">Target {report.targetId}</p>
                <Link href={`/community/${report.postId}`} prefetch={false}>
                  Read parent post
                </Link>
                {moderation && (
                  <div className="discussion-actions">
                    <button
                      disabled={disabled}
                      onClick={() => void inspect(report)}
                    >
                      Inspect reported content
                    </button>
                    {report.state === "OPEN" && (
                      <>
                        <button
                          disabled={disabled}
                          onClick={() =>
                            void write("review", report, "RESOLVED")
                          }
                        >
                          Resolve report
                        </button>
                        <button
                          disabled={disabled}
                          onClick={() =>
                            void write("review", report, "DISMISSED")
                          }
                        >
                          Dismiss report
                        </button>
                      </>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
          <nav aria-label="Report pages" className="discussion-actions">
            <button
              disabled={disabled || input.page === 1}
              onClick={() =>
                void router.replace(
                  {
                    pathname: router.pathname,
                    query: { ...router.query, page: input.page - 1 },
                  },
                  undefined,
                  { shallow: true },
                )
              }
            >
              Previous page
            </button>
            <span>
              Page {input.page} · {data.total} reports
            </span>
            <button
              disabled={disabled || input.page * 20 >= data.total}
              onClick={() =>
                void router.replace(
                  {
                    pathname: router.pathname,
                    query: { ...router.query, page: input.page + 1 },
                  },
                  undefined,
                  { shallow: true },
                )
              }
            >
              Next page
            </button>
          </nav>
        </>
      )}
      {selected && (
        <section className="discussion-editor" data-report-inspection>
          <h2>Reported {selected.report.targetType.toLowerCase()}</h2>
          <p>
            {selected.target.state} · Revision {selected.target.revision}
          </p>
          {selected.target.title && <h3>{selected.target.title}</h3>}
          <p>By {selected.target.publicDisplayName}</p>
          <HelpMarkdown body={selected.target.bodyMarkdown} />
          <label>
            Content removal reason{" "}
            <select
              aria-label="Content removal reason"
              value={reason}
              disabled={disabled}
              onChange={(e) => setReason(e.target.value as CommunityReason)}
            >
              {reasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button disabled={disabled} onClick={() => void write("moderate")}>
            {selected.target.state === "REMOVED"
              ? "Restore reported content"
              : "Remove reported content"}
          </button>
          <button
            disabled={pending}
            onClick={() => {
              ++selection.current;
              setSelected(null);
            }}
          >
            Close inspection
          </button>
        </section>
      )}
    </section>
  );
}
