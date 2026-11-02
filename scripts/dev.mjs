import { fork } from "node:child_process";
import { resolve } from "node:path";
import { localTls, localOrigin, projectRoot } from "./local-https.mjs";
import { startApiProxy } from "./api-https-proxy.mjs";

if (process.env.NODE_ENV === "production")
  throw new Error(
    "The localhost development launcher refuses production mode.",
  );
let proxy, child, closing;
async function close() {
  return (closing ??= (async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise((done) => child.once("exit", done));
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 10_000);
      await exited;
      clearTimeout(timer);
    }
    await proxy?.close();
  })());
}
function finish() {
  void close().then(
    () => process.exit(0),
    () => process.exit(1),
  );
}
process.once("SIGINT", finish);
process.once("SIGTERM", finish);
process.once("disconnect", finish);

try {
  const tls = localTls();
  const webOrigin = localOrigin(
    process.env.NEXT_PUBLIC_WEB_ORIGIN || "https://localhost:3000",
  ).origin;
  const apiOrigin = localOrigin(
    process.env.NEXT_PUBLIC_AUTH_API_ORIGIN || "https://localhost:4000",
  ).origin;
  const upstream = localOrigin(
    process.env.SMARTBORD_API_HTTP_ORIGIN || "http://127.0.0.1:4001",
    "http:",
  ).origin;
  if (
    webOrigin === apiOrigin ||
    new URL(webOrigin).port === new URL(upstream).port ||
    new URL(apiOrigin).port === new URL(upstream).port
  ) {
    throw new Error(
      "Web HTTPS, API HTTPS and backend HTTP must use three different ports.",
    );
  }
  proxy = await startApiProxy({
    origin: apiOrigin,
    upstream,
    tls: tls.options,
  });
  child = fork(resolve(projectRoot, "scripts/https-server.mjs"), [], {
    cwd: projectRoot,
    env: {
      ...process.env,
      WEB_DEV: "1",
      NODE_ENV: "development",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_WEB_ORIGIN: webOrigin,
      NEXT_PUBLIC_AUTH_API_ORIGIN: apiOrigin,
      WEB_TLS_CERT: tls.cert,
      WEB_TLS_KEY: tls.key,
      NODE_EXTRA_CA_CERTS: tls.ca,
    },
    stdio: ["inherit", "inherit", "inherit", "ipc"],
  });
  await new Promise((done, reject) => {
    child.once("error", reject);
    child.once("exit", () =>
      reject(
        new Error(
          "Web server exited before startup. Check whether the web port is already in use.",
        ),
      ),
    );
    child.on("message", (message) => {
      if (message.kind === "ready") done();
    });
  });
  if (process.connected) process.send({ kind: "ready" });
  console.log(`Open ${webOrigin}/signup`);
  console.log(`Local API HTTPS: ${apiOrigin} -> ${upstream}`);
  console.log(
    `Run the backend separately: PORT=${new URL(upstream).port || 80} AUTH_BROWSER_ORIGINS=` +
      webOrigin +
      " npm run start:dev (in SmartBord-AI).",
  );
  const shutdown = () => {
    if (!closing) void close().then(() => process.exit(1));
  };
  child.once("exit", shutdown);
} catch (error) {
  console.error(
    error.code === "EADDRINUSE"
      ? "A development port is already in use. Stop your previous dev command, then retry yarn dev."
      : error.message,
  );
  await close();
  process.exitCode = 1;
}
