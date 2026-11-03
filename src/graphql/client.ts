import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { authenticatedRequest, AuthError } from "@/auth/client";
import { apiOrigin } from "@/auth/config";

export class PlatformError extends Error {
  constructor(
    public code: string,
    public uncertain = false,
  ) {
    super(code);
  }
}
export function failure(error: unknown): {
  code: string;
  message: string;
  uncertain: boolean;
} {
  const code =
    error instanceof AuthError
      ? error.status === 401
        ? "UNAUTHENTICATED"
        : error.status === 403
          ? "FORBIDDEN"
          : "AUTH_UNAVAILABLE"
      : error instanceof PlatformError
        ? error.code
        : CombinedGraphQLErrors.is(error)
          ? String(error.errors[0]?.extensions?.code || "UNKNOWN")
          : "UNKNOWN";
  const messages: Record<string, string> = {
    CONFLICT: "This entry changed. Refresh it before trying again.",
    NOT_FOUND: "This account no longer exists. Refresh the list.",
    VALIDATION_ERROR:
      "This change was rejected. Refresh the account and try again.",
    RATE_LIMITED: "Too many requests. Wait a minute, then refresh the list.",
    SERVICE_UNAVAILABLE: "SmartBord is temporarily unavailable. Please retry.",
    INTERNAL_ERROR:
      "SmartBord could not complete this request. Refresh before trying again.",
  };
  return {
    code,
    message:
      error instanceof AuthError
        ? error.message
        : messages[code] ||
          "Unable to confirm the result. Refresh the list before trying again.",
    uncertain:
      error instanceof PlatformError ? error.uncertain : code === "UNKNOWN",
  };
}

export function createAdminClient(expectedAccountId: string) {
  return new ApolloClient({
    cache: new InMemoryCache(),
    queryDeduplication: false,
    devtools: { enabled: false },
    defaultOptions: {
      query: { fetchPolicy: "no-cache" },
      watchQuery: { fetchPolicy: "no-cache" },
      mutate: { fetchPolicy: "no-cache" },
    },
    link: new HttpLink({
      uri: `${apiOrigin()}/graphql`,
      fetch: (_uri, options) =>
        authenticatedRequest(async (account, csrfToken) => {
          if (account.id !== expectedAccountId)
            throw new AuthError(
              401,
              "Your session changed. Please sign in again.",
            );
          if (account.role !== "ADMIN" || account.status !== "ACTIVE")
            throw new AuthError(403, "Administrator access is required.");
          let response: Response;
          try {
            response = await fetch(`${apiOrigin()}/graphql`, {
              method: "POST",
              body: options?.body,
              credentials: "include",
              cache: "no-store",
              redirect: "error",
              signal: AbortSignal.any([
                AbortSignal.timeout(12_000),
                ...(options?.signal ? [options.signal] : []),
              ]),
              headers: {
                "Content-Type": "application/json",
                "X-SmartBord-Client": "browser",
                "X-CSRF-Token": csrfToken,
              },
            });
            // Read the whole response before releasing the cross-tab lock. A lost
            // response is uncertain; neither Apollo nor this transport retries it.
            const payload = await response.clone().json();
            if (!response.ok)
              throw new PlatformError(
                String(
                  payload.errors?.[0]?.extensions?.code ||
                    payload.code ||
                    "UNKNOWN",
                ),
                response.status >= 500,
              );
          } catch (error) {
            if (error instanceof PlatformError) throw error;
            throw new PlatformError("UNKNOWN", true);
          }
          return response;
        }),
    }),
  });
}
