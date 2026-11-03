import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Account } from "@/auth/types";
import { createAdminClient, failure } from "@/graphql/client";
import {
  AdminCreateHelpEntryDocument,
  AdminHelpEntriesDocument,
  AdminHelpEntryDocument,
  AdminUpdateHelpEntryDocument,
  type AdminHelpEntriesQuery,
  type ManagedHelpFragment,
  type HelpKind,
  type HelpState,
  type HelpTopic,
  type UpdateHelpEntryInput,
} from "@/graphql/generated";
import { HelpMarkdown } from "@/components/HelpMarkdown";
import { helpFilters, helpDate, topicLabel, topics } from "@/help/shared";
import { useUnsavedChanges } from "@/help/useUnsavedChanges";
type Page = AdminHelpEntriesQuery["adminHelpEntries"];
type Editor = {
  base: ManagedHelpFragment | null;
  kind: HelpKind;
  title: string;
  bodyMarkdown: string;
  topic: HelpTopic;
  order: number;
};
type Action = { label: string; input: UpdateHelpEntryInput; title: string };
export function HelpManager({
  account,
  invalidate,
}: {
  account: Account;
  invalidate: () => void;
}) {
  const router = useRouter();
  const basic = helpFilters(router.query);
  const state = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(
    String(router.query.state),
  )
    ? (router.query.state as HelpState)
    : undefined;
  const input = { ...basic, ...(state ? { state } : {}) };
  const key = JSON.stringify(input);
  const current = useRef(input);
  current.current = input;
  const [client] = useState(() => createAdminClient(account.id));
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null),
    [action, setAction] = useState<Action | null>(null),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false);
  const busy = useRef(false),
    mounted = useRef(true),
    generation = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty =
    !!editor &&
    (!editor.base
      ? !!(editor.title || editor.bodyMarkdown)
      : editor.title !== editor.base.title ||
        editor.bodyMarkdown !== editor.base.bodyMarkdown ||
        editor.order !== editor.base.order ||
        (editor.kind === "FAQ" && editor.topic !== editor.base.topic));
  const unsaved = useUnsavedChanges(dirty);
  const fail = useCallback(
    (cause: unknown) => {
      const result = failure(cause);
      if (["UNAUTHENTICATED", "FORBIDDEN"].includes(result.code)) {
        invalidate();
        return result;
      }
      const messages: Record<string, string> = {
        CONFLICT: "This entry changed. Reload it before saving.",
        NOT_FOUND: "This help entry no longer exists. Refresh the directory.",
        VALIDATION_ERROR:
          "Check the title, Markdown body, topic and display order, then try again.",
      };
      setError(messages[result.code] || result.message);
      return result;
    },
    [invalidate],
  );
  const load = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    setError("");
    setPage(null);
    try {
      const result = (
        await client.query({
          query: AdminHelpEntriesDocument,
          variables: { input: current.current },
        })
      ).data!.adminHelpEntries;
      if (!mounted.current || ticket !== generation.current) return false;
      const last = Math.min(
        10000,
        Math.max(1, Math.ceil(result.total / result.pageSize)),
      );
      if (!result.items.length && result.page > last) {
        await router.replace(
          {
            pathname: "/admin/help",
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
  }, [client, fail, router]);
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
    if (action && !dialog.current?.open) dialog.current?.showModal();
    if (!action && dialog.current?.open) dialog.current.close();
  }, [action]);
  function discard() {
    if (!unsaved.allowLeave()) return false;
    unsaved.reset();
    setEditor(null);
    setConflict(false);
    return true;
  }
  async function filter(next: typeof input) {
    if (!discard()) return;
    setNotice("");
    await router
      .replace({ pathname: "/admin/help", query: next }, undefined, {
        shallow: true,
      })
      .catch(() => {});
  }
  function edit(entry: ManagedHelpFragment | null) {
    if (!discard()) return;
    setError("");
    setNotice("");
    setEditor(
      entry
        ? {
            base: entry,
            kind: entry.kind,
            title: entry.title,
            bodyMarkdown: entry.bodyMarkdown,
            topic: entry.topic || "GENERAL",
            order: entry.order,
          }
        : {
            base: null,
            kind: input.kind,
            title: "",
            bodyMarkdown: "",
            topic: "GENERAL",
            order: 0,
          },
    );
  }
  async function mutate(update?: UpdateHelpEntryInput) {
    if (busy.current || uncertain) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (update)
        await client.mutate({
          mutation: AdminUpdateHelpEntryDocument,
          variables: { input: update },
        });
      else if (editor)
        await client.mutate({
          mutation: AdminCreateHelpEntryDocument,
          variables: {
            input: {
              kind: editor.kind,
              title: editor.title,
              bodyMarkdown: editor.bodyMarkdown,
              order: editor.order,
              ...(editor.kind === "FAQ" ? { topic: editor.topic } : {}),
            },
          },
        });
      if (!mounted.current) return;
      unsaved.reset();
      setEditor(null);
      setAction(null);
      setConflict(false);
      setNotice(
        "Help entry saved. Publication changes apply to new reader requests.",
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
    const change: UpdateHelpEntryInput = {
      id: editor.base.id,
      expectedRevision: editor.base.revision,
      title: editor.title,
      bodyMarkdown: editor.bodyMarkdown,
      order: editor.order,
      ...(editor.kind === "FAQ" ? { topic: editor.topic } : {}),
    };
    if (editor.base.state === "PUBLISHED")
      setAction({
        label: "Save published changes",
        title: editor.title,
        input: change,
      });
    else void mutate(change);
  }
  async function reconcile() {
    if (await load()) {
      unsaved.reset();
      setEditor(null);
      setUncertain(false);
      setConflict(false);
      setNotice(
        "Directory refreshed. Check whether the earlier change was saved before submitting again.",
      );
    }
  }
  async function reloadEditor() {
    if (!editor?.base || !unsaved.allowLeave()) return;
    try {
      const entry = (
        await client.query({
          query: AdminHelpEntryDocument,
          variables: { id: editor.base.id },
        })
      ).data!.adminHelpEntry;
      unsaved.reset();
      setEditor({
        base: entry,
        kind: entry.kind,
        title: entry.title,
        bodyMarkdown: entry.bodyMarkdown,
        topic: entry.topic || "GENERAL",
        order: entry.order,
      });
      setConflict(false);
      setError("");
    } catch (cause) {
      fail(cause);
    }
  }
  const disabled = pending || uncertain;
  const bytes = editor
    ? new TextEncoder().encode(editor.bodyMarkdown).length
    : 0;
  return (
    <div>
      <p className="admin-intro">
        Write platform guidance and service updates. New entries start as
        drafts. Archived entries can be restored to draft.
      </p>
      <div className="admin-filters">
        <label>
          Content kind
          <select
            value={input.kind}
            disabled={disabled}
            onChange={(e) =>
              void filter({
                kind: e.target.value as HelpKind,
                page: 1,
                pageSize: 20,
              })
            }
          >
            <option value="FAQ">FAQs</option>
            <option value="ANNOUNCEMENT">Announcements</option>
          </select>
        </label>
        <label>
          Publication state
          <select
            value={state || ""}
            disabled={disabled}
            onChange={(e) =>
              void filter({
                ...input,
                page: 1,
                state: (e.target.value || undefined) as typeof state,
              })
            }
          >
            <option value="">All states</option>
            {["DRAFT", "PUBLISHED", "ARCHIVED"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        {input.kind === "FAQ" && (
          <label>
            Topic filter
            <select
              value={input.topic || ""}
              disabled={disabled}
              onChange={(e) =>
                void filter({
                  ...input,
                  page: 1,
                  topic: (e.target.value || undefined) as typeof input.topic,
                })
              }
            >
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topicLabel(topic)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className="button secondary"
          disabled={pending || loading}
          onClick={() => void (uncertain ? reconcile() : load())}
        >
          Refresh directory
        </button>
        <button
          className="button primary"
          disabled={disabled || loading}
          onClick={() => edit(null)}
        >
          {input.kind === "FAQ" ? "Create FAQ" : "Create announcement"}
        </button>
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
          A successful refresh will close this editor; check whether the change
          was saved.
        </p>
      )}
      {editor && (
        <section
          className="help-editor"
          data-help-editor
          aria-labelledby="editor-heading"
        >
          <h2 id="editor-heading">
            {editor.base ? "Edit entry" : "New draft"}
          </h2>
          {editor.base?.state === "ARCHIVED" ? (
            <section>
              <p>
                This archived entry is read only. Restore it to draft from the
                directory to edit.
              </p>
              <h3>{editor.title}</h3>
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
                    value={editor.title}
                    maxLength={160}
                    required
                    onChange={(e) =>
                      setEditor({ ...editor, title: e.target.value })
                    }
                  />
                </label>
                <div className="admin-filters">
                  {editor.kind === "FAQ" && (
                    <label>
                      FAQ topic
                      <select
                        value={editor.topic}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            topic: e.target.value as HelpTopic,
                          })
                        }
                      >
                        {topics.map((topic) => (
                          <option key={topic} value={topic}>
                            {topicLabel(topic)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Display order (lower first)
                    <input
                      type="number"
                      min={0}
                      max={1000000}
                      required
                      value={editor.order}
                      onChange={(e) =>
                        setEditor({ ...editor, order: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <div className="help-editor-grid">
                  <label>
                    Markdown body
                    <textarea
                      rows={14}
                      value={editor.bodyMarkdown}
                      required
                      aria-describedby="markdown-help"
                      onChange={(e) =>
                        setEditor({ ...editor, bodyMarkdown: e.target.value })
                      }
                    />
                    <span id="markdown-help">
                      {bytes} / 16384 UTF-8 bytes. Headings, lists, code and
                      safe links; no HTML or images.
                    </span>
                  </label>
                  <section aria-label="Markdown preview">
                    <h3>Preview</h3>
                    <HelpMarkdown body={editor.bodyMarkdown} />
                  </section>
                </div>
                <button
                  className="button primary"
                  type="submit"
                  disabled={
                    bytes > 16384 ||
                    !editor.title.trim() ||
                    !editor.bodyMarkdown.trim() ||
                    !dirty
                  }
                >
                  {pending
                    ? "Saving…"
                    : editor.base?.state === "PUBLISHED"
                      ? "Review published changes"
                      : "Save draft"}
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
                Reload entry
              </button>
            )}
          </div>
        </section>
      )}
      {loading ? (
        <p role="status">Loading help entries…</p>
      ) : (
        page &&
        (!page.items.length ? (
          <p role="status">No entries match these filters.</p>
        ) : (
          <div className="help-admin-list">
            {page.items.map((entry) => (
              <article key={entry.id}>
                <div>
                  <h2>{entry.title}</h2>
                  <span className="status-badge">{entry.state}</span>
                  <p>
                    Order {entry.order} · Revision {entry.revision} · Updated{" "}
                    {helpDate(entry.updatedAt)}
                  </p>
                </div>
                <div className="admin-actions">
                  <button disabled={disabled} onClick={() => edit(entry)}>
                    {entry.state === "ARCHIVED" ? "View entry" : "Edit entry"}
                  </button>
                  {entry.state === "ARCHIVED" ? (
                    <button
                      disabled={disabled}
                      onClick={() => {
                        if (discard())
                          void mutate({
                            id: entry.id,
                            expectedRevision: entry.revision,
                            state: "DRAFT",
                          });
                      }}
                    >
                      Restore to draft
                    </button>
                  ) : (
                    <>
                      <button
                        disabled={disabled}
                        onClick={() => {
                          if (discard())
                            setAction({
                              label:
                                entry.state === "PUBLISHED"
                                  ? "Unpublish entry"
                                  : "Publish entry",
                              title: entry.title,
                              input: {
                                id: entry.id,
                                expectedRevision: entry.revision,
                                state:
                                  entry.state === "PUBLISHED"
                                    ? "DRAFT"
                                    : "PUBLISHED",
                              },
                            });
                        }}
                      >
                        {entry.state === "PUBLISHED" ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        disabled={disabled}
                        onClick={() => {
                          if (discard())
                            setAction({
                              label: "Archive entry",
                              title: entry.title,
                              input: {
                                id: entry.id,
                                expectedRevision: entry.revision,
                                state: "ARCHIVED",
                              },
                            });
                        }}
                      >
                        Archive
                      </button>
                    </>
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
          aria-label="Help administration pagination"
        >
          <span>
            {page.total} entries · Page {page.page}
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
        aria-labelledby="help-action-title"
        onCancel={(event) => {
          event.preventDefault();
          if (!busy.current) setAction(null);
        }}
      >
        {action && (
          <>
            <h2 id="help-action-title">{action.label}?</h2>
            <p>{action.title}</p>
            <p>
              Publication changes apply immediately to new reader requests.
              Archived entries remain available to administrators.
            </p>
            <div className="admin-dialog-actions">
              <button
                className="button secondary"
                autoFocus
                disabled={pending}
                onClick={() => setAction(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={pending}
                onClick={() => void mutate(action.input)}
              >
                {pending ? "Applying…" : "Confirm publication change"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
