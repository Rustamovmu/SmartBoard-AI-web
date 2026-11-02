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
  input: { email: string; password: string; name?: string },
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
          "Email or password is incorrect, or this account is unavailable.",
        );
      }
      throw error;
    }
  });
}

let pendingAccount: Promise<Account> | undefined;
export function currentAccount(): Promise<Account> {
  return (pendingAccount ??= exclusive(async () => {
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
      if (
        error instanceof AuthError &&
        error.status !== 0 &&
        error.status < 500
      )
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
  }).finally(() => {
    pendingAccount = undefined;
  }));
}

export async function signOut() {
  await exclusive(async () => {
    await post<{ success: true }>("logout", {});
    localStorage.removeItem(uncertainKey);
    announce("signed-out");
  });
}

function announce(event: string) {
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
