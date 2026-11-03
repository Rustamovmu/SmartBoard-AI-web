import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { announce } from "@/auth/client";
import type { Account } from "@/auth/types";
import { createAdminClient, failure } from "@/graphql/client";
import {
  AdminAccountsDocument,
  AdminUpdateAccountAccessDocument,
  type AdminAccountsQuery,
  type UpdateAccountAccessInput,
} from "@/graphql/generated";
import { accountFilters } from "./filters";

type AccountPage = AdminAccountsQuery["adminAccounts"];
type Change = {
  target: Account;
  input: UpdateAccountAccessInput;
  label: string;
};
export function Accounts({
  account,
  invalidate,
}: {
  account: Account;
  invalidate: () => void;
}) {
  const router = useRouter();
  const input = accountFilters(router.query);
  const key = JSON.stringify(input);
  const [client] = useState(() => createAdminClient(account.id));
  const [page, setPage] = useState<AccountPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [pending, setPending] = useState(false);
  const [change, setChange] = useState<Change | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const busy = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const currentInput = useRef(input);
  currentInput.current = input;
  const navigate = useCallback(
    (next: typeof input) => {
      return router.replace(
        {
          pathname: "/admin/users",
          query: {
            page: next.page,
            pageSize: next.pageSize,
            ...(next.role ? { role: next.role } : {}),
            ...(next.status ? { status: next.status } : {}),
          },
        },
        undefined,
        { shallow: true, scroll: false },
      );
    },
    [router],
  );
  const handleFailure = useCallback(
    (cause: unknown) => {
      const result = failure(cause);
      if (result.code === "CONFLICT")
        result.message =
          "The last active administrator cannot be blocked or demoted.";
      if (result.code === "UNAUTHENTICATED" || result.code === "FORBIDDEN") {
        invalidate();
        return result;
      }
      setError(result.message);
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
      const result = await client.query({
        query: AdminAccountsDocument,
        variables: { input: currentInput.current },
      });
      if (!mounted.current || ticket !== generation.current) return;
      const data = result.data!.adminAccounts;
      const last = Math.min(
        10000,
        Math.max(1, Math.ceil(data.total / data.pageSize)),
      );
      if (!data.items.length && data.page > last) {
        await navigate({ ...currentInput.current, page: last });
        return;
      }
      setPage(data);
      setUncertain(false);
    } catch (cause) {
      if (mounted.current && ticket === generation.current)
        handleFailure(cause);
    } finally {
      if (mounted.current && ticket === generation.current) setLoading(false);
    }
  }, [client, handleFailure, navigate]);
  // Input identity is represented by the primitive key, not an object recreated
  // every render. In-flight responses are discarded when the selection changes.
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    setChange(null);
    setNotice("");
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
    const element = dialog.current;
    if (change && element && !element.open) element.showModal();
    if (!change && element?.open) element.close();
  }, [change]);
  function close() {
    if (busy.current) return;
    setChange(null);
    opener.current?.focus();
  }
  function review(
    target: Account,
    field: "role" | "status",
    value: "USER" | "ADMIN" | "ACTIVE" | "BLOCKED",
  ) {
    if (busy.current || loading || uncertain) return;
    opener.current = document.activeElement as HTMLElement;
    setChange({
      target,
      input: { id: target.id, [field]: value },
      label:
        field === "role"
          ? `Change role to ${value}`
          : value === "BLOCKED"
            ? "Block account"
            : "Unblock account",
    });
  }
  async function submit() {
    if (!change || busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await client.mutate({
        mutation: AdminUpdateAccountAccessDocument,
        variables: { input: change.input },
      });
      if (!mounted.current) return;
      setChange(null);
      if (change.target.id === account.id) {
        announce("access-changed");
        invalidate();
        window.location.replace("/login?session=ended");
        return;
      }
      setNotice("Account access changed. The account must log in again.");
      await load();
    } catch (cause) {
      if (!mounted.current) return;
      const result = handleFailure(cause);
      setChange(null);
      if (result.uncertain) {
        setUncertain(true);
        setPage(null);
      }
    } finally {
      busy.current = false;
      if (mounted.current) {
        setPending(false);
        opener.current?.focus();
      }
    }
  }
  return (
    <div>
      <p className="admin-intro">
        Review platform accounts and control their access. Changes end all
        sessions for the affected account.
      </p>
      <div className="admin-filters">
        <label>
          Role filter
          <select
            value={input.role || ""}
            disabled={pending}
            onChange={(e) =>
              void navigate({
                ...input,
                page: 1,
                role: (e.target.value || undefined) as typeof input.role,
              })
            }
          >
            <option value="">All roles</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <label>
          Status filter
          <select
            value={input.status || ""}
            disabled={pending}
            onChange={(e) =>
              void navigate({
                ...input,
                page: 1,
                status: (e.target.value || undefined) as typeof input.status,
              })
            }
          >
            <option value="">All statuses</option>
            {["ACTIVE", "BLOCKED", "DELETED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Rows per page
          <select
            value={input.pageSize}
            disabled={pending}
            onChange={(e) =>
              void navigate({
                ...input,
                page: 1,
                pageSize: Number(e.target.value),
              })
            }
          >
            {[20, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          className="button secondary"
          disabled={pending || loading}
          onClick={() => void load()}
        >
          Refresh list
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
          The outcome is uncertain. Refresh the list before making another
          change.
        </p>
      )}
      {loading ? (
        <p role="status">Loading accounts…</p>
      ) : (
        page && (
          <>
            {!page.items.length ? (
              <p role="status">No accounts match these filters.</p>
            ) : (
              <div
                className="admin-table-scroll"
                role="region"
                aria-label="Account list"
                tabIndex={0}
              >
                <table className="admin-table">
                  <caption className="sr-only">Platform accounts</caption>
                  <thead>
                    <tr>
                      {["Account", "Role", "Status", "Joined", "Actions"].map(
                        (label) => (
                          <th key={label} scope="col">
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {page.items.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <strong>
                            {user.name}
                            {user.id === account.id ? " (you)" : ""}
                          </strong>
                          <span className="admin-email">{user.email}</span>
                        </td>
                        <td>{user.role}</td>
                        <td>
                          <span
                            className={`status-badge status-${user.status.toLowerCase()}`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td>
                          {new Date(user.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              timeZone: "UTC",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </td>
                        <td>
                          {user.status === "DELETED" ? (
                            <span>Read only</span>
                          ) : (
                            <div className="admin-actions">
                              <button
                                disabled={pending || uncertain}
                                onClick={() =>
                                  review(
                                    user,
                                    "role",
                                    user.role === "ADMIN" ? "USER" : "ADMIN",
                                  )
                                }
                              >
                                {user.role === "ADMIN"
                                  ? "Make USER"
                                  : "Make ADMIN"}
                              </button>
                              <button
                                disabled={pending || uncertain}
                                onClick={() =>
                                  review(
                                    user,
                                    "status",
                                    user.status === "ACTIVE"
                                      ? "BLOCKED"
                                      : "ACTIVE",
                                  )
                                }
                              >
                                {user.status === "ACTIVE" ? "Block" : "Unblock"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <nav className="admin-pagination" aria-label="Account pagination">
              <span>
                {page.total} matching accounts · Page {page.page} of{" "}
                {Math.max(
                  1,
                  Math.min(10000, Math.ceil(page.total / page.pageSize)),
                )}
              </span>
              <div>
                <button
                  disabled={pending || page.page <= 1}
                  onClick={() =>
                    void navigate({ ...input, page: page.page - 1 })
                  }
                >
                  Previous
                </button>
                <button
                  disabled={
                    pending ||
                    page.page >= 10000 ||
                    page.page * page.pageSize >= page.total
                  }
                  onClick={() =>
                    void navigate({ ...input, page: page.page + 1 })
                  }
                >
                  Next
                </button>
              </div>
            </nav>
          </>
        )
      )}
      <dialog
        ref={dialog}
        aria-labelledby="change-title"
        aria-describedby="change-description"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        {change && (
          <>
            <h2 id="change-title">{change.label}?</h2>
            <p id="change-description">
              {change.target.name} · {change.target.email}
            </p>
            <p>
              Current: {change.target.role} / {change.target.status}. This
              change ends all sessions for this account. A fresh login is
              required.
            </p>
            {change.target.id === account.id && (
              <p className="session-notice">
                You are changing your own access. You will be signed out if this
                succeeds.
              </p>
            )}
            <p>The last active administrator cannot be blocked or demoted.</p>
            <div className="admin-dialog-actions">
              <button
                className="button secondary"
                autoFocus
                disabled={pending}
                onClick={close}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={pending}
                onClick={() => void submit()}
              >
                {pending ? "Applying change…" : "Confirm change"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
