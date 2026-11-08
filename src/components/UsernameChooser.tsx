import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Account } from "@/auth/types";
import { createAccountClient, failure } from "@/graphql/client";
import {
  CurrentAccountDocument,
  SetMyUsernameDocument,
} from "@/graphql/generated";
export function UsernameChooser({
  account,
  disabled,
  onSaved,
  invalidate,
}: {
  account: Account;
  disabled: boolean;
  onSaved: (account: Account) => void;
  invalidate: () => void;
}) {
  const [client] = useState(() => createAccountClient(account.id));
  const [pending, setPending] = useState(false),
    [locked, setLocked] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const busy = useRef(false),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      client.stop();
    };
  }, [client]);
  function fail(cause: unknown) {
    const result = failure(cause);
    if (["UNAUTHENTICATED", "FORBIDDEN"].includes(result.code)) invalidate();
    else
      setError(
        result.code === "CONFLICT"
          ? "This username is unavailable, or your account already has a username. Refresh your username before trying again."
          : result.code === "VALIDATION_ERROR"
            ? "Use 3–30 letters, numbers or underscores, starting with a letter."
            : result.message,
      );
    return result;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || locked || disabled) return;
    const username = String(
      new FormData(event.currentTarget).get("username") || "",
    )
      .trim()
      .toLowerCase();
    setError("");
    setNotice("");
    if (!/^[a-z][a-z0-9_]{2,29}$/.test(username)) {
      setError(
        "Use 3–30 letters, numbers or underscores, starting with a letter.",
      );
      return;
    }
    if (
      !window.confirm(
        `Choose ${username} as your permanent username? You can sign in with it or your email. Your public community name stays separate.`,
      )
    )
      return;
    busy.current = true;
    setPending(true);
    try {
      const result = await client.mutate({
        mutation: SetMyUsernameDocument,
        variables: { input: { username } },
      });
      if (live.current) onSaved(result.data!.setMyUsername);
    } catch (cause) {
      if (live.current) {
        const result = fail(cause);
        if (result.uncertain || result.code === "CONFLICT") {
          setLocked(true);
          setNotice(
            "No change will be replayed. Read your current username before another attempt.",
          );
        }
      }
    } finally {
      busy.current = false;
      if (live.current) setPending(false);
    }
  }
  async function refresh() {
    if (busy.current || disabled) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const result = await client.query({ query: CurrentAccountDocument });
      if (!live.current) return;
      const current = result.data!.currentAccount;
      if (current.username) onSaved(current);
      else {
        setLocked(false);
        setNotice(
          "No username is saved yet. Choose an available username before trying again.",
        );
      }
    } catch (cause) {
      if (live.current) fail(cause);
    } finally {
      busy.current = false;
      if (live.current) setPending(false);
    }
  }
  return (
    <section aria-label="Choose your username" className="username-chooser">
      <h3>Choose your username</h3>
      <p className="field-help" id="username-choice-help">
        Choose once. Use 3–30 letters, numbers or underscores, starting with a
        letter. Usernames ignore letter case. Your full name and public
        community name stay separate.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <form method="post" onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={disabled || pending || locked}>
          <label>
            New username
            <input
              name="username"
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z][A-Za-z0-9_]{2,29}"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby="username-choice-help"
            />
          </label>
          <button className="button secondary" type="submit">
            {pending ? "Saving username…" : "Choose username"}
          </button>
        </fieldset>
      </form>
      <button
        className="inline-button"
        disabled={disabled || pending}
        onClick={() => void refresh()}
      >
        Refresh username
      </button>
    </section>
  );
}
