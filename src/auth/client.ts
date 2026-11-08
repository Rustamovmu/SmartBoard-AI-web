import { apiOrigin, webOrigin } from "./config";
import type { Account, BrowserGrant } from "./types";

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function assertBrowser() {
  if (!window.isSecureContext || window.location.origin !== webOrigin()) {
    throw new AuthError(
      0,
      "Open the configured SmartBord HTTPS address to sign in.",
    );
  }
  // SameSite=Strict requires a same-site deployment. Matching hosts also allow
  // request-scoped SSR to check the API's host-only credential cookies.
  if (
    new URL(apiOrigin()).hostname !== window.location.hostname ||
    apiOrigin() === webOrigin()
  ) {
    throw new AuthError(
      0,
      "Configure HTTPS web and API origins on the same hostname, with different ports.",
    );
  }
}

async function request<T>(
  path: string,
  body?: object,
  csrfToken?: string,
): Promise<T> {
  assertBrowser();
  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}/auth/${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "include",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "X-SmartBord-Client": "browser",
        ...(body === undefined
          ? {}
          : {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken || "",
            }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new AuthError(
      0,
      "Unable to reach SmartBord. Check your connection and trusted HTTPS setup.",
    );
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "Check your details and try again.",
      401: "Your session has ended. Please sign in again.",
      403: "Access was denied. Check your account and HTTPS configuration.",
      409: "This account could not be created. Try signing in instead.",
      429: "Too many attempts. Wait a minute before trying again.",
      503: "SmartBord is temporarily unavailable. Please try again later.",
    };
    throw new AuthError(
      response.status,
      messages[response.status] || "SmartBord could not complete this request.",
    );
  }
  return response.json() as Promise<T>;
}

// All credential writes, including CSRF issuance, share this cross-tab lock.
// A tab reads /me again after acquiring it so a second waiter never rotates a
// credential that another tab already rotated. No raw token enters JS storage.
async function exclusive<T>(action: () => Promise<T>): Promise<T> {
  assertBrowser();
  if (!navigator.locks) {
    throw new AuthError(
      0,
      "This browser cannot safely manage sessions. Use a browser with Web Locks support.",
    );
  }
  return navigator.locks.request("smartbord:browser-auth", action);
}

async function post<T>(path: string, body: object): Promise<T> {
  const { csrfToken } = await request<{ csrfToken: string }>("csrf");
  return request<T>(path, body, csrfToken);
}

// Mark an ambiguous refresh *before* sending it. If a response is lost or the
// tab closes, subsequent tabs require fresh login rather than retrying a spent
// refresh token. This marker contains no account data or credentials.
const uncertainKey = "smartbord:refresh-uncertain";

export function signIn(
  mode: "signup" | "login",
  input: {
    email?: string;
    identifier?: string;
    username?: string;
    password: string;
    name?: string;
  },
) {
  return exclusive(async () => {
    try {
      const grant = await post<BrowserGrant>(mode, input);
      localStorage.removeItem(uncertainKey);
      announce("signed-in");
      return grant;
    } catch (error) {
      if (error instanceof AuthError && error.status === 401) {
        throw new AuthError(
          401,
          "Username, email or password is incorrect, or this account is unavailable.",
        );
      }
      throw error;
    }
  });
}

// Only call while holding the browser auth lock.
async function accountWithinLock(): Promise<Account> {
  try {
    return (await request<{ user: Account }>("me")).user;
  } catch (error) {
    if (!(error instanceof AuthError) || error.status !== 401) throw error;
  }
  if (localStorage.getItem(uncertainKey)) {
    throw new AuthError(
      401,
      "Session refresh was interrupted. Please sign in again.",
    );
  }
  // Fetch CSRF before marking: a failed CSRF GET did not rotate credentials.
  const { csrfToken } = await request<{ csrfToken: string }>("csrf");
  localStorage.setItem(uncertainKey, "1");
  try {
    const grant = await request<BrowserGrant>("refresh", {}, csrfToken);
    localStorage.removeItem(uncertainKey);
    return grant.user;
  } catch (error) {
    if (error instanceof AuthError && error.status !== 0 && error.status < 500)
      localStorage.removeItem(uncertainKey);
    if (
      error instanceof AuthError &&
      (error.status === 0 || error.status >= 500)
    ) {
      throw new AuthError(
        401,
        "Session refresh was interrupted. Please sign in again.",
      );
    }
    throw error;
  }
}

let pendingAccount: Promise<Account> | undefined;
export function currentAccount(): Promise<Account> {
  return (pendingAccount ??= exclusive(accountWithinLock).finally(() => {
    pendingAccount = undefined;
  }));
}

// The caller's complete request shares credential/CSRF serialization. Never
// call currentAccount() from inside this callback (it acquires the same lock).
export function authenticatedRequest<T>(
  action: (account: Account, csrfToken: string) => Promise<T>,
): Promise<T> {
  return exclusive(async () => {
    const account = await accountWithinLock();
    const { csrfToken } = await request<{ csrfToken: string }>("csrf");
    return action(account, csrfToken);
  });
}

export async function signOut() {
  await exclusive(async () => {
    await post<{ success: true }>("logout", {});
    localStorage.removeItem(uncertainKey);
    announce("signed-out");
  });
}

// Reset is a single-use credential write. It shares the auth lock without
// requiring /me or refreshing an existing session.
export class PasswordResetError extends AuthError {
  constructor(
    status: number,
    message: string,
    public uncertain: boolean,
  ) {
    super(status, message);
  }
}
export function resetPassword(input: {
  recoveryToken: string;
  password: string;
}) {
  return exclusive(async () => {
    const { csrfToken } = await request<{ csrfToken: string }>("csrf");
    const previousUncertainty = localStorage.getItem(uncertainKey);
    // A lost reset response may have cleared cookies or revoked this account.
    // Never let another tab attempt refresh after that ambiguous credential write.
    localStorage.setItem(uncertainKey, "1");
    try {
      const result = await request<{ success: boolean }>(
        "password/reset",
        input,
        csrfToken,
      );
      if (result.success !== true)
        throw new AuthError(0, "Unconfirmed reset response.");
      try {
        localStorage.removeItem(uncertainKey);
      } catch {
        /* Fresh login is still safe. */
      }
      announce("signed-out");
    } catch (cause) {
      const status = cause instanceof AuthError ? cause.status : 0;
      const uncertain = status === 0 || status >= 500;
      if (!uncertain) {
        if (previousUncertainty === null) localStorage.removeItem(uncertainKey);
        else localStorage.setItem(uncertainKey, previousUncertainty);
      } else announce("session-uncertain");
      throw new PasswordResetError(
        status,
        uncertain
          ? "Unable to confirm whether your password changed. Do not repeat this recovery code."
          : status === 401
            ? "This recovery code is invalid, expired, already used, or no longer available. Ask your operator for a new code."
            : status === 429
              ? "Too many reset attempts. Wait a minute before trying with an available code."
              : status === 400
                ? "The reset was rejected. Check the complete recovery code and use a new password of 12–128 characters."
                : "The reset was refused. Reload the secure page and check your connection before trying again.",
        uncertain,
      );
    }
  });
}

export function announce(event: string) {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel("smartbord:session");
  channel.postMessage(event);
  channel.close();
}

export function errorMessage(error: unknown) {
  return error instanceof AuthError
    ? error.message
    : "Unable to continue. Check browser storage permissions and try again.";
}
