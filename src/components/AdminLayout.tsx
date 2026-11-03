import Link from "next/link";
import { useRouter } from "next/router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AuthError,
  currentAccount,
  errorMessage,
  signOut,
} from "@/auth/client";
import type { Account } from "@/auth/types";
import { Layout } from "./Layout";

export interface AdminPageProps {
  initialAccount: Account | null;
  initialError: string | null;
  denied: boolean;
}
export function AdminLayout({
  initialAccount,
  initialError,
  denied: initialDenied,
  children,
  heading = "Accounts.",
  pageTitle = "Account administration",
  requiredRole = "ADMIN",
}: AdminPageProps & {
  children: (account: Account, invalidate: () => void) => ReactNode;
  heading?: string;
  pageTitle?: string;
  requiredRole?: "ADMIN" | "ACTIVE";
}) {
  const router = useRouter();
  const [account, setAccount] = useState(initialAccount);
  const [denied, setDenied] = useState(initialDenied);
  const [error, setError] = useState(initialError || "");
  const [leaving, setLeaving] = useState(false);
  const generation = useRef(0);
  const [checking, setChecking] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const actorId = useRef(initialAccount?.id);
  const exiting = useRef(false);
  const clear = useCallback(() => {
    ++generation.current;
    window.dispatchEvent(new Event("smartbord:clear-protected"));
    setChecking(false);
    setResetVersion((value) => value + 1);
    setAccount(null);
  }, []);
  const check = useCallback(async () => {
    if (exiting.current) return;
    const ticket = ++generation.current;
    setChecking(true);
    setError("");
    try {
      const user = await currentAccount();
      if (ticket !== generation.current || exiting.current) return;
      const allowed =
        (requiredRole === "ACTIVE" || user.role === "ADMIN") &&
        user.status === "ACTIVE";
      setDenied(!allowed);
      if (!allowed) clear();
      else {
        if (actorId.current && actorId.current !== user.id) clear();
        actorId.current = user.id;
        setAccount(user);
      }
      setChecking(false);
    } catch (cause) {
      if (ticket !== generation.current || exiting.current) return;
      clear();
      if (
        cause instanceof AuthError &&
        (cause.status === 401 || cause.status === 403)
      ) {
        window.location.replace("/login?session=ended");
      } else setError(errorMessage(cause));
    }
  }, [clear, requiredRole]);
  useEffect(() => {
    void check();
    const visible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const restored = () => {
      void check();
    };
    const navigating = (url: string, { shallow }: { shallow: boolean }) => {
      // Give an editor a synchronous chance to veto before clearing its tree.
      if (
        !window.dispatchEvent(
          new Event("smartbord:before-admin-navigation", { cancelable: true }),
        )
      ) {
        const error = Object.assign(new Error("Admin navigation cancelled"), {
          cancelled: true,
        });
        router.events.emit("routeChangeError", error, url, { shallow });
        throw error;
      }
      if (!shallow) clear();
    };
    const completed = (_url: string, { shallow }: { shallow: boolean }) => {
      if (!shallow) void check();
    };
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("smartbord:session");
    if (channel)
      channel.onmessage = () => {
        clear();
        void check();
      };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pagehide", clear);
    window.addEventListener("pageshow", restored);
    router.events.on("routeChangeStart", navigating);
    router.events.on("routeChangeComplete", completed);
    router.events.on("routeChangeError", restored);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 60_000);
    return () => {
      ++generation.current;
      channel?.close();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("pagehide", clear);
      window.removeEventListener("pageshow", restored);
      router.events.off("routeChangeStart", navigating);
      router.events.off("routeChangeComplete", completed);
      router.events.off("routeChangeError", restored);
    };
  }, [check, clear, router.events]);
  async function logout() {
    if (exiting.current) return;
    exiting.current = true;
    setLeaving(true);
    clear();
    setError("");
    try {
      await signOut();
      window.location.replace("/login?session=logged-out");
    } catch (cause) {
      exiting.current = false;
      setLeaving(false);
      setError(errorMessage(cause));
    }
  }
  return (
    <Layout title={pageTitle}>
      <div className="admin-shell">
        <aside
          className="admin-nav"
          aria-label={
            requiredRole === "ADMIN" ? "Administration" : "Your account"
          }
        >
          <span className="eyebrow">
            {requiredRole === "ADMIN"
              ? "PLATFORM ADMINISTRATION"
              : "YOUR COMMUNITY POSTS"}
          </span>
          <nav
            aria-label={
              requiredRole === "ADMIN"
                ? "Admin navigation"
                : "Account navigation"
            }
          >
            {requiredRole === "ADMIN" && (
              <>
                <Link
                  href="/admin/users"
                  prefetch={false}
                  aria-current={
                    router.pathname === "/admin/users" ? "page" : undefined
                  }
                >
                  Accounts
                </Link>
                <Link
                  href="/admin/help"
                  prefetch={false}
                  aria-current={
                    router.pathname === "/admin/help" ? "page" : undefined
                  }
                >
                  Help center
                </Link>
                <Link href="/admin/community" prefetch={false}>
                  Community moderation
                </Link>
              </>
            )}
            <Link href="/account/posts" prefetch={false}>
              Your posts
            </Link>
            <Link href="/community" prefetch={false}>
              Read community
            </Link>
            <Link href="/account" prefetch={false}>
              Your account
            </Link>
          </nav>
          <p>
            Private recordings stay on users’ devices. Administrators manage
            platform access.
          </p>
        </aside>
        <section className="admin-content">
          <div className="admin-title">
            <div>
              <span className="tiny-label">
                {requiredRole === "ADMIN"
                  ? "ACCESS & PERMISSIONS"
                  : "COMMUNITY PUBLISHING"}
              </span>
              <h1>{heading}</h1>
            </div>
            <button
              className="button secondary"
              disabled={leaving}
              onClick={() => void logout()}
            >
              Log out
            </button>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}{" "}
              <button className="inline-button" onClick={() => void check()}>
                Retry account check
              </button>
            </div>
          )}
          {checking && <p role="status">Checking account access…</p>}
          {denied ? (
            <section>
              <h2>Access denied</h2>
              <p>
                {requiredRole === "ADMIN"
                  ? "An active administrator account is required."
                  : "An active account is required."}
              </p>
              <Link className="text-link" href="/account">
                Return to your account
              </Link>
            </section>
          ) : account ? (
            <div
              key={`${account.id}:${resetVersion}`}
              hidden={checking}
              aria-busy={checking}
            >
              {children(account, () => {
                clear();
                void check();
              })}
            </div>
          ) : (
            <p role="status">
              {error
                ? "This area is unavailable until your account can be verified."
                : "Checking account access…"}
            </p>
          )}
        </section>
      </div>
    </Layout>
  );
}
