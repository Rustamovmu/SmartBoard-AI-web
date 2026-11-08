import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { errorMessage, signIn } from "@/auth/client";
import { webOrigin } from "@/auth/config";
import { Layout } from "./Layout";

export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const signup = mode === "signup";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [securePage, setSecurePage] = useState<boolean | null>(null);
  useEffect(() => {
    setSecurePage(window.location.origin === webOrigin());
  }, []);
  const busy = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await signIn(mode, {
        ...(signup
          ? {
              email: String(data.get("email")).trim(),
              username: String(data.get("username")).trim(),
            }
          : { identifier: String(data.get("identifier")).trim() }),
        password: String(data.get("password")),
        ...(signup ? { name: String(data.get("name")).trim() } : {}),
      });
      form.reset();
      window.location.replace("/account");
    } catch (cause) {
      setError(errorMessage(cause));
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Layout title={signup ? "Create an account" : "Log in"}>
      <div className="auth-grid">
        <aside className="auth-story">
          <span className="eyebrow">
            A little less admin. A little more learning.
          </span>
          <h1>
            Make room
            <br />
            for your next
            <br /> <em>bright idea.</em>
          </h1>
          <p>
            One account for connected SmartBord services.
            <br />
            Your private lectures stay on your device.
          </p>
          <div className="privacy-note">
            <span className="shield" aria-hidden="true">
              ⌑
            </span>
            <div>
              <strong>Private by design</strong>
              <p>Signing in never uploads your recordings, photos or notes.</p>
            </div>
          </div>
          <span className="story-number" aria-hidden="true">
            01 — YOUR SPACE TO LEARN
          </span>
        </aside>
        <section className="auth-panel" aria-labelledby="form-title">
          <div className="form-topline">
            <span className="tiny-label">SMARTBORD ACCOUNT</span>
            <span className="mini-dot" aria-hidden="true" />
          </div>
          <h2 id="form-title">
            {signup ? "Start with you." : "Welcome back."}
          </h2>
          <p className="form-intro">
            {signup
              ? "Create your account. Keep your learning yours."
              : "A fresh session. The same space to learn."}
          </p>
          {securePage === false && (
            <p role="alert" className="error">
              Open the secure {signup ? "signup" : "login"} page before entering
              your details.{" "}
              <a className="text-link" href={`${webOrigin()}/${mode}`}>
                Continue to HTTPS
              </a>
            </p>
          )}
          {!signup && router.query.session === "ended" && (
            <p role="status" className="session-notice">
              Your session ended or could not be restored. Please log in again.
            </p>
          )}
          {!signup && router.query.session === "logged-out" && (
            <p role="status" className="session-notice">
              You’re logged out. Your device files are unchanged.
            </p>
          )}
          <form method="post" onSubmit={submit} aria-busy={pending}>
            <fieldset disabled={pending || securePage !== true}>
              {signup && (
                <label>
                  Full name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={80}
                    pattern=".*\S.*"
                    placeholder="Your name"
                  />
                </label>
              )}
              {signup && (
                <>
                  <label>
                    Username
                    <input
                      name="username"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      minLength={3}
                      maxLength={30}
                      pattern="[A-Za-z][A-Za-z0-9_]{2,29}"
                      aria-describedby="signup-username-help"
                    />
                  </label>
                  <p id="signup-username-help" className="field-help">
                    Choose a permanent username: 3–30 letters, numbers or
                    underscores, starting with a letter. Letter case is ignored.
                  </p>
                </>
              )}
              <label>
                {signup ? "Email address" : "Username or email"}
                <input
                  name={signup ? "email" : "identifier"}
                  type={signup ? "email" : "text"}
                  autoComplete={signup ? "email" : "username"}
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={254}
                  placeholder={
                    signup ? "you@example.com" : "Your username or email"
                  }
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={signup ? "new-password" : "current-password"}
                  required
                  minLength={signup ? 12 : 1}
                  maxLength={128}
                  aria-describedby={signup ? "password-help" : undefined}
                  placeholder={
                    signup ? "At least 12 characters" : "Your password"
                  }
                />
              </label>
              {signup && (
                <p id="password-help" className="field-help">
                  Use 12–128 characters. Spaces are welcome.
                </p>
              )}
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button className="button primary submit" type="submit">
                {pending
                  ? signup
                    ? "Creating account…"
                    : "Signing in…"
                  : signup
                    ? "Create account"
                    : "Log in"}
                <span aria-hidden="true">↗</span>
              </button>
            </fieldset>
            <p role="status" className="sr-only">
              {pending ? "Please wait while your request is processed." : ""}
            </p>
          </form>
          {!signup && (
            <p className="form-switch">
              <Link href="/reset-password">Reset your password</Link>
            </p>
          )}
          <p className="form-switch">
            {signup ? "Already have an account?" : "New around here?"}{" "}
            <Link href={signup ? "/login" : "/signup"}>
              {signup ? "Log in" : "Create an account"}
            </Link>
          </p>
          <div className="form-footnote">
            <span aria-hidden="true">↳</span> A secure account. No cloud lecture
            library.
          </div>
        </section>
      </div>
    </Layout>
  );
}
