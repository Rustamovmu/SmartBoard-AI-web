import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import type { Account } from "@/auth/types";
import {
  createAccountClient,
  createAdminClient,
  failure,
} from "@/graphql/client";
import {
  MyCommunityPostsDocument,
  MyCommunityPostDocument,
  AdminCommunityPostsDocument,
  AdminCommunityPostDocument,
  CreateCommunityPostDocument,
  UpdateCommunityPostDocument,
  AdminModerateCommunityPostDocument,
  type ManagedCommunityFragment,
  type MyCommunityPostsQuery,
  type UpdateCommunityPostInput,
  type ModerateCommunityPostInput,
  type CommunityReason,
} from "@/graphql/generated";
import { HelpMarkdown } from "@/components/HelpMarkdown";
import { useUnsavedChanges } from "@/help/useUnsavedChanges";
import { helpDate } from "@/help/shared";
import { communityFilters } from "./shared";
type Post = ManagedCommunityFragment;
type Editor = {
  base: Post | null;
  title: string;
  bodyMarkdown: string;
  publicDisplayName: string;
};
type Action = {
  label: string;
  post: Post;
  update?: UpdateCommunityPostInput;
  moderate?: ModerateCommunityPostInput;
};
export function CommunityManager({
  account,
  invalidate,
  moderation = false,
}: {
  account: Account;
  invalidate: () => void;
  moderation?: boolean;
}) {
  const router = useRouter();
  const input = communityFilters(router.query),
    key = JSON.stringify(input);
  const current = useRef(input);
  current.current = input;
  const [client] = useState(() =>
    moderation
      ? createAdminClient(account.id)
      : createAccountClient(account.id),
  );
  const [page, setPage] = useState<
    MyCommunityPostsQuery["myCommunityPosts"] | null
  >(null);
  const [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null),
    [action, setAction] = useState<Action | null>(null),
    [reason, setReason] = useState<CommunityReason>("OTHER"),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false);
  const busy = useRef(false),
    mounted = useRef(true),
    generation = useRef(0),
    editorGeneration = useRef(0),
    dialog = useRef<HTMLDialogElement>(null),
    cancelButton = useRef<HTMLButtonElement>(null);
  const dirty =
    !!editor &&
    !moderation &&
    (editor.base
      ? (["title", "bodyMarkdown", "publicDisplayName"] as const).some(
          (key) => editor[key] !== editor.base![key],
        )
      : !!(
          editor.title ||
          editor.bodyMarkdown ||
          editor.publicDisplayName !== account.name
        ));
  const unsaved = useUnsavedChanges(
    dirty,
    "Discard unsaved community changes?",
  );
  const fail = useCallback(
    (cause: unknown) => {
      const result = failure(cause);
      if (["UNAUTHENTICATED", "FORBIDDEN"].includes(result.code)) invalidate();
      else
        setError(
          (
            {
              CONFLICT: "This post changed. Reload it before saving.",
              NOT_FOUND: "This post is unavailable. Refresh the directory.",
              VALIDATION_ERROR:
                "Check the title, public name and Markdown body, then try again.",
            } as Record<string, string>
          )[result.code] || result.message,
        );
      return result;
    },
    [invalidate],
  );
  const load = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    setPage(null);
    setError("");
    try {
      const result = moderation
        ? (
            await client.query({
              query: AdminCommunityPostsDocument,
              variables: { input: current.current },
            })
          ).data!.adminCommunityPosts
        : (
            await client.query({
              query: MyCommunityPostsDocument,
              variables: { input: current.current },
            })
          ).data!.myCommunityPosts;
      if (!mounted.current || ticket !== generation.current) return false;
      const last = Math.min(
        10000,
        Math.max(1, Math.ceil(result.total / result.pageSize)),
      );
      if (!result.items.length && result.page > last) {
        await router.replace(
          {
            pathname: router.pathname,
            query: { ...current.current, page: last },
          },
          undefined,
          { shallow: true },
        );
        return false;
      }
      setPage(result);
      return true;
    } catch (cause) {
      if (mounted.current && ticket === generation.current) fail(cause);
      return false;
    } finally {
      if (mounted.current && ticket === generation.current) setLoading(false);
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
    mounted.current = true;
    return () => {
      mounted.current = false;
      ++generation.current;
      client.stop();
    };
  }, [client]);
  useEffect(() => {
    if (action && !dialog.current?.open) {
      dialog.current?.showModal();
      cancelButton.current?.focus();
    }
    if (!action && dialog.current?.open) dialog.current.close();
  }, [action]);
  function discard() {
    if (!unsaved.allowLeave()) return false;
    ++editorGeneration.current;
    unsaved.reset();
    setEditor(null);
    setConflict(false);
    return true;
  }
  function edit(post: Post | null) {
    if (!discard()) return;
    setError("");
    setNotice("");
    setEditor(
      post
        ? {
            base: post,
            title: post.title,
            bodyMarkdown: post.bodyMarkdown,
            publicDisplayName: post.publicDisplayName,
          }
        : {
            base: null,
            title: "",
            bodyMarkdown: "",
            publicDisplayName: account.name,
          },
    );
  }
  async function filter(next: typeof input) {
    if (!discard()) return;
    await router
      .replace({ pathname: router.pathname, query: next }, undefined, {
        shallow: true,
      })
      .catch(() => {});
  }
  async function mutate(
    update?: UpdateCommunityPostInput,
    moderate?: ModerateCommunityPostInput,
  ) {
    if (busy.current || uncertain) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (moderate)
        await client.mutate({
          mutation: AdminModerateCommunityPostDocument,
          variables: { input: moderate },
        });
      else if (update)
        await client.mutate({
          mutation: UpdateCommunityPostDocument,
          variables: { input: update },
        });
      else if (editor)
        await client.mutate({
          mutation: CreateCommunityPostDocument,
          variables: {
            input: {
              title: editor.title,
              publicDisplayName: editor.publicDisplayName,
              bodyMarkdown: editor.bodyMarkdown,
            },
          },
        });
      else return;
      if (!mounted.current) return;
      unsaved.reset();
      setEditor(null);
      setAction(null);
      setConflict(false);
      setNotice(
        "Post saved. Publication changes apply to new reader requests.",
      );
      await load();
    } catch (cause) {
      if (!mounted.current) return;
      const result = fail(cause);
      setAction(null);
      setConflict(result.code === "CONFLICT");
      if (result.uncertain) {
        setUncertain(true);
        setPage(null);
      }
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  function submit() {
    if (!editor) return;
    if (!editor.base) {
      void mutate();
      return;
    }
    const update = {
      id: editor.base.id,
      expectedRevision: editor.base.revision,
      title: editor.title,
      publicDisplayName: editor.publicDisplayName,
      bodyMarkdown: editor.bodyMarkdown,
    };
    if (editor.base.state === "PUBLISHED")
      setAction({ label: "Save published changes", post: editor.base, update });
    else void mutate(update);
  }
  async function reconcile() {
    if (await load()) {
      unsaved.reset();
      setEditor(null);
      setAction(null);
      setUncertain(false);
      setConflict(false);
      setNotice(
        "Directory refreshed. Check whether the earlier change was saved before submitting again.",
      );
    }
  }
  async function reloadEditor() {
    if (!editor?.base || !unsaved.allowLeave()) return;
    const ticket = ++editorGeneration.current;
    try {
      const id = editor.base.id;
      const post = moderation
        ? (
            await client.query({
              query: AdminCommunityPostDocument,
              variables: { id },
            })
          ).data!.adminCommunityPost
        : (
            await client.query({
              query: MyCommunityPostDocument,
              variables: { id },
            })
          ).data!.myCommunityPost;
      if (!mounted.current || ticket !== editorGeneration.current) return;
      unsaved.reset();
      setEditor({
        base: post,
        title: post.title,
        bodyMarkdown: post.bodyMarkdown,
        publicDisplayName: post.publicDisplayName,
      });
      setConflict(false);
      setError("");
    } catch (cause) {
      fail(cause);
    }
  }
  const disabled = pending || uncertain,
    bytes = editor ? new TextEncoder().encode(editor.bodyMarkdown).length : 0;
  return (
    <div style={{ overflowWrap: "anywhere" }}>
      <p className="admin-intro">
        {moderation
          ? "Inspect community drafts, published posts and removed posts. Moderators can remove or restore to draft; only authors edit and publish."
          : "Write general community text. Save draft on server stores this text for you and administrators to read. Publish publicly is a separate action and shows your chosen public name. Withdrawal and removal hide posts but retain server content; V1 has no permanent deletion. Private recordings, images and transcripts must stay on your device."}
      </p>
      <div className="admin-filters">
        <label>
          Publication state
          <select
            value={input.state || ""}
            disabled={disabled}
            onChange={(e) =>
              void filter({
                ...input,
                page: 1,
                state: (e.target.value || undefined) as typeof input.state,
              })
            }
          >
            <option value="">All states</option>
            {["DRAFT", "PUBLISHED", "REMOVED"].map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </label>
        <label>
          Posts per page
          <select
            value={input.pageSize}
            disabled={disabled}
            onChange={(e) =>
              void filter({
                ...input,
                page: 1,
                pageSize: Number(e.target.value),
              })
            }
          >
            {[20, 50, 100].map((size) => (
              <option key={size}>{size}</option>
            ))}
          </select>
        </label>
        <button
          className="button secondary"
          disabled={pending || loading}
          onClick={() =>
            void (uncertain
              ? reconcile()
              : load().then((ok) => {
                  if (ok && !editor) setConflict(false);
                }))
          }
        >
          Refresh directory
        </button>
        {!moderation && (
          <button
            className="button primary"
            disabled={disabled || loading}
            onClick={() => edit(null)}
          >
            New post
          </button>
        )}
      </div>
      {notice && (
        <p role="status" className="session-notice">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {uncertain && (
        <p role="status">
          The outcome is uncertain. Refresh the directory before another change.
          Check whether the change was saved; it will not be automatically
          retried.
        </p>
      )}
      {conflict && !editor && (
        <p role="status">
          Refresh the directory to see the current post before another change.
        </p>
      )}
      {editor && (
        <section
          className="help-editor"
          data-community-editor
          aria-labelledby="community-editor-heading"
        >
          <h2 id="community-editor-heading">
            {moderation || editor.base?.state === "REMOVED"
              ? "View post"
              : editor.base
                ? "Edit post"
                : "New draft"}
          </h2>
          {moderation || editor.base?.state === "REMOVED" ? (
            <section>
              <p>
                {editor.base?.state === "REMOVED"
                  ? `Removed: ${editor.base.removalReason}. The author cannot edit or publish until an administrator restores this post to draft.`
                  : "Read-only moderation view."}
              </p>
              <h3>{editor.title}</h3>
              <p>By {editor.publicDisplayName}</p>
              <HelpMarkdown body={editor.bodyMarkdown} />
            </section>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <fieldset disabled={disabled || conflict}>
                <label>
                  Title
                  <input
                    required
                    maxLength={160}
                    value={editor.title}
                    onChange={(e) =>
                      setEditor({ ...editor, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Public display name
                  <input
                    required
                    maxLength={80}
                    value={editor.publicDisplayName}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        publicDisplayName: e.target.value,
                      })
                    }
                  />
                </label>
                <div className="help-editor-grid">
                  <label>
                    Markdown body
                    <textarea
                      required
                      rows={14}
                      value={editor.bodyMarkdown}
                      aria-describedby="community-markdown-help"
                      onChange={(e) =>
                        setEditor({ ...editor, bodyMarkdown: e.target.value })
                      }
                    />
                    <span id="community-markdown-help">
                      {bytes} / 16384 UTF-8 bytes. Safe text formatting and
                      links; no HTML or images.
                    </span>
                  </label>
                  <section aria-label="Markdown preview">
                    <h3>Preview</h3>
                    <HelpMarkdown body={editor.bodyMarkdown} />
                  </section>
                </div>
                <button
                  type="submit"
                  className="button primary"
                  disabled={
                    !dirty ||
                    bytes > 16384 ||
                    !editor.title.trim() ||
                    !editor.publicDisplayName.trim() ||
                    !editor.bodyMarkdown.trim()
                  }
                >
                  {pending
                    ? "Saving…"
                    : editor.base?.state === "PUBLISHED"
                      ? "Review published changes"
                      : "Save draft on server"}
                </button>
              </fieldset>
            </form>
          )}
          <div className="admin-actions">
            <button disabled={pending} onClick={discard}>
              Close editor
            </button>
            {editor.base && conflict && (
              <button disabled={pending} onClick={() => void reloadEditor()}>
                Reload post
              </button>
            )}
          </div>
        </section>
      )}
      {loading ? (
        <p role="status">Loading community posts…</p>
      ) : (
        page &&
        (!page.items.length ? (
          <p role="status">No posts match these filters.</p>
        ) : (
          <div className="help-admin-list community-admin-list">
            {page.items.map((post) => (
              <article key={post.id}>
                <div>
                  <h2>{post.title}</h2>
                  <span className="status-badge">{post.state}</span>
                  <p>
                    By {post.publicDisplayName} · Revision {post.revision} ·
                    Updated {helpDate(post.updatedAt)}
                  </p>
                  {post.removalReason && (
                    <p>Removal reason: {post.removalReason}</p>
                  )}
                </div>
                <div className="admin-actions">
                  <button disabled={disabled} onClick={() => edit(post)}>
                    {moderation || post.state === "REMOVED"
                      ? "View post"
                      : "Edit post"}
                  </button>
                  {moderation ? (
                    <button
                      disabled={disabled || conflict}
                      onClick={() => {
                        if (discard()) {
                          setReason("OTHER");
                          setAction({
                            label:
                              post.state === "REMOVED"
                                ? "Restore to draft"
                                : "Remove post",
                            post,
                            moderate: {
                              id: post.id,
                              expectedRevision: post.revision,
                              action:
                                post.state === "REMOVED" ? "RESTORE" : "REMOVE",
                            },
                          });
                        }
                      }}
                    >
                      {post.state === "REMOVED"
                        ? "Restore to draft"
                        : "Remove post"}
                    </button>
                  ) : (
                    post.state !== "REMOVED" && (
                      <button
                        disabled={disabled || conflict}
                        onClick={() => {
                          if (discard())
                            setAction({
                              label:
                                post.state === "PUBLISHED"
                                  ? "Withdraw to draft"
                                  : "Publish publicly",
                              post,
                              update: {
                                id: post.id,
                                expectedRevision: post.revision,
                                state:
                                  post.state === "PUBLISHED"
                                    ? "DRAFT"
                                    : "PUBLISHED",
                              },
                            });
                        }}
                      >
                        {post.state === "PUBLISHED"
                          ? "Withdraw to draft"
                          : "Publish publicly"}
                      </button>
                    )
                  )}
                </div>
              </article>
            ))}
          </div>
        ))
      )}
      {page && (
        <nav
          className="admin-pagination"
          aria-label="Community management pagination"
        >
          <span>
            {page.total} posts · Page {page.page}
          </span>
          <div>
            <button
              disabled={disabled || page.page <= 1}
              onClick={() => void filter({ ...input, page: page.page - 1 })}
            >
              Previous
            </button>
            <button
              disabled={
                disabled ||
                page.page >= 10000 ||
                page.page * page.pageSize >= page.total
              }
              onClick={() => void filter({ ...input, page: page.page + 1 })}
            >
              Next
            </button>
          </div>
        </nav>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="community-action-title"
        onCancel={(event) => {
          event.preventDefault();
          if (!busy.current) setAction(null);
        }}
      >
        {action && (
          <>
            <h2 id="community-action-title">{action.label}?</h2>
            <p>{action.post.title}</p>
            <p>
              Public name:{" "}
              {action.update?.publicDisplayName ||
                action.post.publicDisplayName}
            </p>
            <p>
              {action.moderate
                ? "Removal retains the text and locks author changes. Restoration returns to draft, without publishing."
                : "Publication and live changes are publicly visible on new reader requests. Withdrawal retains the server copy."}
            </p>
            {action.moderate?.action === "REMOVE" && (
              <label>
                Removal reason
                <select
                  aria-label="Removal reason"
                  value={reason}
                  disabled={pending}
                  onChange={(e) => setReason(e.target.value as CommunityReason)}
                >
                  {["SPAM", "ABUSE", "PRIVACY", "OFF_TOPIC", "OTHER"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </label>
            )}
            <div className="admin-dialog-actions">
              <button
                className="button secondary"
                ref={cancelButton}
                autoFocus
                disabled={pending}
                onClick={() => setAction(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={pending}
                onClick={() =>
                  void mutate(
                    action.update,
                    action.moderate
                      ? {
                          ...action.moderate,
                          ...(action.moderate.action === "REMOVE"
                            ? { reason }
                            : {}),
                        }
                      : undefined,
                  )
                }
              >
                {pending ? "Applying…" : "Confirm community change"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
