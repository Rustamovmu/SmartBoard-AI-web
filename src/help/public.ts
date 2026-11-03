import type { TypedDocumentNode } from "@apollo/client";
import { print } from "graphql";
import { apiOrigin, webOrigin } from "@/auth/config";
export class PublicHelpError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export async function publicHelpQuery<T, V extends Record<string, unknown>>(
  document: TypedDocumentNode<T, V>,
  variables: V,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}/graphql`, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "Content-Type": "application/json",
        "X-SmartBord-Client": "public",
        ...(typeof window === "undefined" ? { Origin: webOrigin() } : {}),
      },
      body: JSON.stringify({ query: print(document), variables }),
    });
    const payload = await response.json();
    if (!response.ok || payload.errors || !payload.data)
      throw new PublicHelpError(
        String(
          payload.errors?.[0]?.extensions?.code ||
            payload.code ||
            "UNAVAILABLE",
        ),
      );
    return payload.data as T;
  } catch (error) {
    if (error instanceof PublicHelpError) throw error;
    throw new PublicHelpError("UNAVAILABLE");
  }
}
