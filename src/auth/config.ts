export function httpsOrigin(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.origin !== value ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "Configure an exact HTTPS origin without a path or credentials.",
    );
  }
  return url.origin;
}

export function apiOrigin(): string {
  return httpsOrigin(
    process.env.NEXT_PUBLIC_AUTH_API_ORIGIN || "https://localhost:4000",
  );
}

export function webOrigin(): string {
  return httpsOrigin(
    process.env.NEXT_PUBLIC_WEB_ORIGIN || "https://localhost:3000",
  );
}
