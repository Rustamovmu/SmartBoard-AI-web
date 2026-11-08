import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { errorMessage, PasswordResetError, resetPassword } from "@/auth/client";
import { webOrigin } from "@/auth/config";
import { Layout } from "./Layout";

export function PasswordResetForm() {
  const form = useRef<HTMLFormElement>(null),
    busy = useRef(false),
    live = useRef(true);
  const [secure, setSecure] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [complete, setComplete] = useState(false),
    [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    live.current = true;
    setSecure(window.isSecureContext && window.location.origin === webOrigin());
    // Never read a code from a URL or restore sensitive form fields from history.
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname);
    const clear = () => form.current?.reset();
    clear();
    window.addEventListener("pagehide", clear);
    window.addEventListener("pageshow", clear);
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("smartbord:session");
    if (channel) channel.onmessage = clear;
    return () => {
      live.current = false;
      clear();
      channel?.close();
      window.removeEventListener("pagehide", clear);
      window.removeEventListener("pageshow", clear);
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || uncertain || complete || secure !== true) return;
    const element = event.currentTarget;
    const data = new FormData(element);
    const recoveryToken = String(data.get("recoveryToken") || "").trim();
    const password = String(data.get("password") || "");
    const confirmation = String(data.get("confirmation") || "");
    setError("");
    if (!/^sb_p\.[A-Za-z0-9_-]{43}$/.test(recoveryToken)) {
      setError("Enter the complete recovery code supplied by your operator.");
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setError("Use a new password of 12–128 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The new passwords do not match. No reset request was sent.");
      return;
    }
    busy.current = true;
    setPending(true);
    // Keep secrets in this one bounded request only, never in React state or storage.
    element.reset();
    try {
      await resetPassword({ recoveryToken, password });
      if (live.current) setComplete(true);
    } catch (cause) {
      if (live.current) {
        setUncertain(cause instanceof PasswordResetError && cause.uncertain);
        setError(errorMessage(cause));
      }
    } finally {
      busy.current = false;
      if (live.current) {
        form.current?.reset();
        setPending(false);
      }
    }
  }
  return (
    <Layout title="Reset your password">
      <div className="auth-grid">
        <aside className="auth-story">
          <span className="eyebrow">ACCOUNT RECOVERY</span>
          <h1>
            A fresh
            <br /> start for
            <br /> <em>your account.</em>
          </h1>
          <p>
            Your private recordings, photos and notes stay on your device when
            you reset your password.
          </p>
          <div className="privacy-note">
            <span className="shield" aria-hidden="true">
              ⌑
            </span>
            <div>
              <strong>Verified recovery</strong>
              <p>
                An operator verifies account ownership before privately
                supplying a short-lived, single-use code.
              </p>
            </div>
          </div>
        </aside>
        <section className="auth-panel" aria-labelledby="reset-title">
          <div className="form-topline">
            <span className="tiny-label">SMARTBORD ACCOUNT</span>
            <span className="mini-dot" aria-hidden="true" />
          </div>
          <h2 id="reset-title">Reset your password.</h2>
          {complete ? (
            <div role="status" className="session-notice">
              <h3>Password reset complete.</h3>
              <p>
                All previous sessions for this account have ended. Sign in with
                your new password. Your device files are unchanged.
              </p>
              <Link className="text-link" href="/login">
                Log in with your new password
              </Link>
            </div>
          ) : (
            <>
              <p className="form-intro">
                Ask the operator who administers your SmartBord account to
                verify ownership and supply a recovery code. There is no
                automated email request here.
              </p>
              <p className="field-help" id="reset-effects">
                Resetting ends every session for the recovered account. This
                browser will also be signed out if it currently belongs to
                another account. No automatic login occurs.
              </p>
              {secure === false && (
                <p className="error" role="alert">
                  Open the secure reset page before entering a code or password.{" "}
                  <a
                    className="text-link"
                    href={`${webOrigin()}/reset-password`}
                  >
                    Continue to HTTPS
                  </a>
                </p>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {uncertain ? (
                <div className="session-notice" role="status">
                  <p>
                    No reset will be retried automatically. Try signing in with
                    your new password. If that fails, ask your operator for a
                    newly issued code before starting again.
                  </p>
                  <Link className="text-link" href="/login">
                    Try signing in
                  </Link>
                  <p>
                    <Link
                      className="text-link"
                      href="/reset-password"
                      onClick={(event) => {
                        event.preventDefault();
                        form.current?.reset();
                        setUncertain(false);
                        setError("");
                      }}
                    >
                      I have a newly issued code
                    </Link>
                  </p>
                </div>
              ) : (
                <form
                  ref={form}
                  method="post"
                  onSubmit={submit}
                  aria-busy={pending}
                  autoComplete="off"
                  aria-describedby="reset-effects"
                >
                  <fieldset disabled={pending || secure !== true}>
                    <label>
                      Recovery code
                      <input
                        name="recoveryToken"
                        type="password"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        minLength={48}
                        maxLength={48}
                        aria-describedby="recovery-code-help"
                      />
                    </label>
                    <p className="field-help" id="recovery-code-help">
                      Paste the complete code here. Never put it in a web
                      address or share it publicly. Codes expire after 15
                      minutes.
                    </p>
                    <label>
                      New password
                      <input
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={128}
                        aria-describedby="reset-password-help"
                      />
                    </label>
                    <label>
                      Confirm new password
                      <input
                        name="confirmation"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={128}
                      />
                    </label>
                    <p className="field-help" id="reset-password-help">
                      Use 12–128 characters. Spaces are preserved.
                    </p>
                    <button className="button primary submit" type="submit">
                      {pending ? "Resetting password…" : "Set new password"}
                      <span aria-hidden="true">↗</span>
                    </button>
                  </fieldset>
                  <p role="status" className="sr-only">
                    {pending
                      ? "Please wait while the password reset is processed."
                      : ""}
                  </p>
                </form>
              )}
            </>
          )}
          {!complete && (
            <p className="form-switch">
              <Link href="/login">Back to login</Link>
            </p>
          )}
        </section>
      </div>
    </Layout>
  );
}
