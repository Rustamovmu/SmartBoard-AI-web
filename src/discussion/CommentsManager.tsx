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
  MyCommunityCommentsDocument,
  AdminCommunityCommentsDocument,
  CreateCommunityCommentDocument,
  UpdateCommunityCommentDocument,
  AdminModerateCommunityCommentDocument,
  MyCommunityCommentDocument,
  AdminCommunityCommentDocument,
  type ManagedCommentFragment,
  type MyCommunityCommentsQuery,
  type CommunityState,
  type CommunityReason,
  type UpdateCommunityCommentInput,
  type ModerateCommunityCommentInput,
} from "@/graphql/generated";
import { HelpMarkdown } from "@/components/HelpMarkdown";
import { useUnsavedChanges } from "@/help/useUnsavedChanges";
import { boundedPage, reasons, uuid } from "./shared";
type Comment = ManagedCommentFragment;
type Editor = {
  base: Comment | null;
  postId: string;
  publicDisplayName: string;
  bodyMarkdown: string;
};
export function CommentsManager({
  account,
  invalidate,
  moderation = false,
}: {
  account: Account;
  invalidate: () => void;
  moderation?: boolean;
}) {
  const router = useRouter();
  const postId = uuid(router.query.postId) ? router.query.postId : undefined;
  const state =
    typeof router.query.state === "string" &&
    ["DRAFT", "PUBLISHED", "REMOVED"].includes(router.query.state)
      ? (router.query.state as CommunityState)
      : undefined;
  const input = {
    page: boundedPage(router.query.page),
    pageSize: 20,
    ...(postId ? { postId } : {}),
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
    MyCommunityCommentsQuery["myCommunityComments"] | null
  >(null);
  const [editor, setEditor] = useState<Editor | null>(() =>
    !moderation && postId && router.query.compose === "1"
      ? {
          base: null,
          postId,
          publicDisplayName: account.name,
          bodyMarkdown: "",
        }
      : null,
  );
  const [reason, setReason] = useState<CommunityReason>("OTHER");
  const [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [locked, setLocked] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const live = useRef(true),
    generation = useRef(0),
    busy = useRef(false),
    selection = useRef(0);
  const dirty =
    !!editor &&
    !moderation &&
    (editor.base
      ? editor.publicDisplayName !== editor.base.publicDisplayName ||
        editor.bodyMarkdown !== editor.base.bodyMarkdown
      : !!editor.bodyMarkdown || editor.publicDisplayName !== account.name);
  const unsaved = useUnsavedChanges(dirty, "Discard unsaved comment changes?");
  const fail = useCallback(
    (cause: unknown) => {
      const result = failure(cause);
      if (["UNAUTHENTICATED", "FORBIDDEN"].includes(result.code)) invalidate();
      else
        setError(
          result.code === "NOT_FOUND"
            ? "This comment or its published parent is unavailable. Refresh comments."
            : result.code === "CONFLICT"
              ? "This comment changed or is locked. Reload before making another change."
              : result.code === "VALIDATION_ERROR"
                ? "Enter a public name and a comment of at most 4096 UTF-8 bytes."
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
              query: AdminCommunityCommentsDocument,
              variables: { input: current.current },
            })
          ).data!.adminCommunityComments
        : (
            await client.query({
              query: MyCommunityCommentsDocument,
              variables: { input: current.current },
            })
          ).data!.myCommunityComments;
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
  function discard() {
    if (!unsaved.allowLeave()) return false;
    ++selection.current;
    unsaved.reset();
    setEditor(null);
    return true;
  }
  async function select(comment: Comment) {
    if (!discard()) return;
    const ticket = ++selection.current;
    setLoading(true);
    try {
      const result = moderation
        ? (
            await client.query({
              query: AdminCommunityCommentDocument,
              variables: { id: comment.id },
            })
          ).data!.adminCommunityComment
        : (
            await client.query({
              query: MyCommunityCommentDocument,
              variables: { id: comment.id },
            })
          ).data!.myCommunityComment;
      if (live.current && ticket === selection.current)
        setEditor({
          base: result,
          postId: result.postId,
          publicDisplayName: result.publicDisplayName,
          bodyMarkdown: result.bodyMarkdown,
        });
    } catch (cause) {
      if (live.current && ticket === selection.current) fail(cause);
    } finally {
      if (live.current && ticket === selection.current) setLoading(false);
    }
  }
  async function mutate(
    update?: UpdateCommunityCommentInput,
    moderate?: ModerateCommunityCommentInput,
  ) {
    if (busy.current || locked) return;
    if ((moderate || update?.state) && !unsaved.allowLeave()) return;
    if (
      !window.confirm(
        moderate
          ? `${moderate.action === "REMOVE" ? "Remove this comment with the selected reason" : "Restore this comment to withdrawn draft"}?`
          : update?.state === "DRAFT"
            ? "Withdraw this comment? Its text remains on the server."
            : editor?.base
              ? "Save comment text? Published comments update publicly; withdrawn comments stay withdrawn."
              : "Publish this comment? Your chosen name and text will be public.",
      )
    )
      return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (moderate)
        await client.mutate({
          mutation: AdminModerateCommunityCommentDocument,
          variables: { input: moderate },
        });
      else if (update)
        await client.mutate({
          mutation: UpdateCommunityCommentDocument,
          variables: { input: update },
        });
      else if (editor)
        await client.mutate({
          mutation: CreateCommunityCommentDocument,
          variables: {
            input: {
              postId: editor.postId,
              publicDisplayName: editor.publicDisplayName,
              bodyMarkdown: editor.bodyMarkdown,
            },
          },
        });
      if (!live.current) return;
      unsaved.reset();
      ++selection.current;
      setEditor(null);
      setNotice("Comment change saved.");
      if (!(await load()) && live.current)
        setNotice(
          "Comment change saved, but the directory could not be refreshed. Retry the read.",
        );
    } catch (cause) {
      if (live.current) {
        const result = fail(cause);
        if (result.uncertain || result.code === "CONFLICT") {
          setLocked(true);
          setNotice(
            "No change will be replayed. Reconcile comments before trying again.",
          );
        }
      }
    } finally {
      busy.current = false;
      if (live.current) setPending(false);
    }
  }
  async function reconcile() {
    if (!discard()) return;
    if ((await load()) && live.current) {
      setLocked(false);
      setNotice(
        "Directory reloaded. Inspect the saved comment before another change.",
      );
    }
  }
  const disabled = pending || loading || locked;
  async function filter(next: Record<string, string | number | undefined>) {
    if (discard())
      await router.replace(
        { pathname: router.pathname, query: { ...next, compose: undefined } },
        undefined,
        { shallow: true },
      );
  }
  return (
    <section className="discussion-manager">
      <p>
        Comments are general community text saved on the server and readable by
        administrators. Publishing exposes your chosen name and text.
        Withdrawal/removal retain the text. Keep private lecture content on your
        device.
      </p>
      <div className="discussion-actions">
        <label>
          Comment state{" "}
          <select
            aria-label="Comment state"
            value={state || ""}
            disabled={pending}
            onChange={(e) =>
              void filter({
                postId,
                state: e.target.value || undefined,
                page: 1,
              })
            }
          >
            <option value="">All states</option>
            {["PUBLISHED", "DRAFT", "REMOVED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {postId && (
          <>
            <Link href={`/community/${postId}`} prefetch={false}>
              Read parent post
            </Link>
            <button
              disabled={disabled}
              onClick={() => {
                if (discard())
                  setEditor({
                    base: null,
                    postId,
                    publicDisplayName: account.name,
                    bodyMarkdown: "",
                  });
              }}
              hidden={moderation}
            >
              New comment
            </button>
            <button
              disabled={pending}
              onClick={() => void filter({ page: 1, state })}
            >
              All posts’ comments
            </button>
          </>
        )}
        <button
          disabled={pending || loading}
          onClick={() => void (locked ? reconcile() : load())}
        >
          {locked ? "Reconcile comments" : "Refresh comment directory"}
        </button>
      </div>
      {loading && <p role="status">Loading comment directory…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {moderation && (
        <label>
          Moderation reason{" "}
          <select
            aria-label="Moderation reason"
            value={reason}
            disabled={disabled}
            onChange={(e) => setReason(e.target.value as CommunityReason)}
          >
            {reasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      )}
      {data && (
        <>
          <div className="discussion-list">
            {!data.items.length && <p>No matching comments.</p>}
            {data.items.map((comment) => (
              <article key={comment.id} data-comment-id={comment.id}>
                <h2>{comment.publicDisplayName}</h2>
                <p>
                  {comment.state} · Revision {comment.revision}
                  {comment.removalReason
                    ? ` · Removal reason: ${comment.removalReason}`
                    : ""}
                </p>
                <p className="discussion-id">Comment {comment.id}</p>
                <HelpMarkdown body={comment.bodyMarkdown} />
                <div className="discussion-actions">
                  <Link href={`/community/${comment.postId}`} prefetch={false}>
                    Parent post
                  </Link>
                  <button
                    disabled={disabled}
                    onClick={() => void select(comment)}
                  >
                    {moderation || comment.state === "REMOVED"
                      ? "View comment"
                      : "Edit comment"}
                  </button>
                  {moderation ? (
                    <button
                      disabled={disabled}
                      onClick={() =>
                        void mutate(undefined, {
                          id: comment.id,
                          expectedRevision: comment.revision,
                          action:
                            comment.state === "REMOVED" ? "RESTORE" : "REMOVE",
                          ...(comment.state === "REMOVED" ? {} : { reason }),
                        })
                      }
                    >
                      {comment.state === "REMOVED"
                        ? "Restore comment"
                        : "Remove comment"}
                    </button>
                  ) : (
                    comment.state !== "REMOVED" && (
                      <button
                        disabled={disabled}
                        onClick={() =>
                          void mutate({
                            id: comment.id,
                            expectedRevision: comment.revision,
                            state:
                              comment.state === "PUBLISHED"
                                ? "DRAFT"
                                : "PUBLISHED",
                          })
                        }
                      >
                        {comment.state === "PUBLISHED"
                          ? "Withdraw comment"
                          : "Republish comment"}
                      </button>
                    )
                  )}
                </div>
              </article>
            ))}
          </div>
          <nav
            aria-label="Managed comment pages"
            className="discussion-actions"
          >
            <button
              disabled={disabled || input.page === 1}
              onClick={() =>
                void filter({ postId, state, page: input.page - 1 })
              }
            >
              Previous page
            </button>
            <span>
              Page {input.page} · {data.total} comments
            </span>
            <button
              disabled={disabled || input.page * input.pageSize >= data.total}
              onClick={() =>
                void filter({ postId, state, page: input.page + 1 })
              }
            >
              Next page
            </button>
          </nav>
        </>
      )}
      {editor && (
        <section className="discussion-editor" data-comment-editor>
          <h2>{editor.base ? "Selected comment" : "Publish a comment"}</h2>
          <p className="discussion-id">Parent post: {editor.postId}</p>
          <label>
            Public comment name{" "}
            <input
              maxLength={80}
              value={editor.publicDisplayName}
              readOnly={moderation || editor.base?.state === "REMOVED"}
              disabled={pending || locked}
              onChange={(e) =>
                setEditor({ ...editor, publicDisplayName: e.target.value })
              }
            />
          </label>
          <label>
            Comment Markdown{" "}
            <textarea
              rows={7}
              value={editor.bodyMarkdown}
              readOnly={moderation || editor.base?.state === "REMOVED"}
              disabled={pending || locked}
              onChange={(e) =>
                setEditor({ ...editor, bodyMarkdown: e.target.value })
              }
            />
          </label>
          <p>
            {new TextEncoder().encode(editor.bodyMarkdown).length} / 4096 UTF-8
            bytes
          </p>
          <HelpMarkdown body={editor.bodyMarkdown} />
          {!moderation && editor.base?.state !== "REMOVED" && (
            <button
              disabled={
                disabled ||
                !editor.publicDisplayName.trim() ||
                !editor.bodyMarkdown.trim() ||
                new TextEncoder().encode(editor.bodyMarkdown).length > 4096
              }
              onClick={() =>
                void mutate(
                  editor.base
                    ? {
                        id: editor.base.id,
                        expectedRevision: editor.base.revision,
                        publicDisplayName: editor.publicDisplayName,
                        bodyMarkdown: editor.bodyMarkdown,
                      }
                    : undefined,
                )
              }
            >
              {editor.base ? "Save comment edit" : "Publish comment"}
            </button>
          )}
          <button disabled={pending} onClick={() => discard()}>
            Close comment editor
          </button>
        </section>
      )}
    </section>
  );
}
