import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { X509Certificate } from "node:crypto";

export const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export function localTls(env = process.env) {
  const directory = resolve(projectRoot, ".certs");
  const paths = {
    cert: resolve(env.WEB_TLS_CERT || `${directory}/localhost.pem`),
    key: resolve(env.WEB_TLS_KEY || `${directory}/localhost-key.pem`),
    ca: resolve(env.NODE_EXTRA_CA_CERTS || `${directory}/rootCA.pem`),
  };
  try {
    const cert = readFileSync(paths.cert);
    const key = readFileSync(paths.key);
    const ca = readFileSync(paths.ca);
    const leaf = new X509Certificate(cert);
    if (!leaf.checkHost("localhost") || Date.parse(leaf.validTo) <= Date.now())
      throw new Error();
    return { ...paths, options: { cert, key }, caBytes: ca };
  } catch {
    throw new Error(
      "Local TLS files are missing, invalid or expired. Run: yarn setup:https --trust-local-ca",
    );
  }
}

export function localOrigin(value, protocol = "https:") {
  const url = new URL(value);
  if (
    url.protocol !== protocol ||
    url.origin !== value ||
    url.username ||
    url.password ||
    !(protocol === "https:"
      ? url.hostname === "localhost"
      : url.hostname === "127.0.0.1")
  ) {
    throw new Error(
      `Local development requires an exact ${protocol === "https:" ? "https://localhost" : "http://127.0.0.1"} origin.`,
    );
  }
  return url;
}
