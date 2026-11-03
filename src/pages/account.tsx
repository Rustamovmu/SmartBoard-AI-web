import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import {
  AuthError,
  currentAccount,
  errorMessage,
  signOut,
} from "@/auth/client";
import { accountProps } from "@/auth/server";
import type { Account } from "@/auth/types";

export const getServerSideProps = accountProps;

export default function AccountPage({
  initialAccount,
  initialError,
}: {
  initialAccount: Account | null;
  initialError: string | null;
}) {
  const [account, setAccount] = useState(initialAccount);
  const [error, setError] = useState(initialError || "");
  const [pending, setPending] = useState(false);
  const generation = useRef(0);
  const leaving = useRef(false);
  const check = useCallback(async () => {
    if (leaving.current) return;
    const ticket = ++generation.current;
    setError("");
    try {
      const user = await currentAccount();
      if (ticket === generation.current && !leaving.current) setAccount(user);
    } catch (cause) {
      if (ticket !== generation.current || leaving.current) return;
      setAccount(null);
      if (
        cause instanceof AuthError &&
        (cause.status === 401 || cause.status === 403)
      ) {
        window.location.replace("/login?session=ended");
      } else setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    void check();
    const visible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const hide = () => {
      ++generation.current;
      setAccount(null);
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) void check();
    };
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("smartbord:session");
    if (channel)
      channel.onmessage = () => {
        setAccount(null);
        void check();
      };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", restored);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 60_000);
    return () => {
      ++generation.current;
      channel?.close();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", restored);
    };
  }, [check]);

  async function logout() {
    if (leaving.current) return;
    leaving.current = true;
    ++generation.current;
    setPending(true);
    setError("");
    try {
      await signOut();
      setAccount(null);
      window.location.replace("/login?session=logged-out");
    } catch (cause) {
      setError(errorMessage(cause));
      leaving.current = false;
      setPending(false);
    }
  }

  return (
    <Layout title="Your account">
      <section className="account-shell">
        <span className="eyebrow">YOUR SMARTBORD SPACE</span>
        <div className="account-heading">
          <h1>Your account.</h1>
          <span className="account-tag">
            <span className="mini-dot" />{" "}
            {account ? "CONNECTED" : "CHECKING SESSION"}
          </span>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}{" "}
            <button className="inline-button" onClick={() => void check()}>
              Retry account check
            </button>
          </div>
        )}
        {!account ? (
          <div className="account-loading" role="status">
            {error
              ? "Your account is unavailable until it can be verified."
              : "Checking your secure session…"}
            <p>
              <Link href="/login">Return to log in</Link>
            </p>
          </div>
        ) : (
          <div className="account-grid">
            <section className="profile-card" aria-labelledby="profile-heading">
              <div className="profile-top">
                <span className="avatar" aria-hidden="true">
                  {account.name.charAt(0).toUpperCase()}
                </span>
                <span className="tiny-label">PLATFORM PROFILE</span>
              </div>
              <h2 id="profile-heading">{account.name}</h2>
              <p className="profile-email">{account.email}</p>
              <dl>
                <div>
                  <dt>Account role</dt>
                  <dd>
                    {account.role === "ADMIN" ? "Administrator" : "Member"}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{account.status}</dd>
                </div>
                <div>
                  <dt>Joined</dt>
                  <dd>
                    {new Date(account.createdAt).toLocaleDateString("en-GB", {
                      timeZone: "UTC",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              </dl>
              {account.role === "ADMIN" && account.status === "ACTIVE" && (
                <p>
                  <Link
                    className="text-link"
                    href="/admin/users"
                    prefetch={false}
                  >
                    Manage platform accounts ↗
                  </Link>
                </p>
              )}
              <button
                className="button secondary"
                disabled={pending}
                onClick={() => void logout()}
              >
                {pending ? "Logging out…" : "Log out"}
                <span aria-hidden="true">↗</span>
              </button>
            </section>
            <aside className="ownership-card">
              <Link
                href="/account/posts"
                className="text-link"
                prefetch={false}
              >
                Manage your community posts
              </Link>
              <span className="tiny-label">A NOTE ON OWNERSHIP</span>
              <h2>
                Your account
                <br />
                connects you.
                <br />
                <em>
                  Your device
                  <br />
                  keeps your notes.
                </em>
              </h2>
              <p>
                This website does not store or display your phone’s private
                recordings, photos or lecture notes.
              </p>
              <p>
                Logging out ends this browser session. It never deletes files
                from your phone.
              </p>
              <div className="ownership-foot">
                PRIVATE BY DESIGN <span aria-hidden="true">↗</span>
              </div>
            </aside>
          </div>
        )}
      </section>
    </Layout>
  );
}
