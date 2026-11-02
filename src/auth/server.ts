import type { GetServerSidePropsContext } from "next";
import { apiOrigin, webOrigin } from "./config";
import type { Account } from "./types";

export async function accountProps({ req, res }: GetServerSidePropsContext) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  // Forward only expected cookies to a fixed configured origin. No global
  // session/cache and no forwarded-host-derived destination or Origin.
  const cookie = (req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => /^__Host-sb_(access|refresh|csrf)=/.test(part))
    .join("; ");
  if (
    !cookie.includes("__Host-sb_access=") &&
    !cookie.includes("__Host-sb_refresh=")
  ) {
    return { redirect: { destination: "/login", permanent: false } } as const;
  }
  try {
    const response = await fetch(`${apiOrigin()}/auth/me`, {
      headers: {
        Cookie: cookie,
        Origin: webOrigin(),
        "X-SmartBord-Client": "browser",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 401) {
      // Cookie rotation belongs to the browser's cross-tab lock. Render only
      // a loading shell until the browser revalidates/refreshes.
      return { props: { initialAccount: null, initialError: null } };
    }
    if (!response.ok) throw new Error("Account unavailable");
    const { user } = (await response.json()) as { user: Account };
    return { props: { initialAccount: user, initialError: null } };
  } catch {
    return {
      props: {
        initialAccount: null,
        initialError: "Your account could not be checked. Please retry.",
      },
    };
  }
}
