import { fork } from "node:child_process";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { localTls, localOrigin, projectRoot } from "./local-https.mjs";
import { startApiProxy } from "./api-https-proxy.mjs";

if (process.env.NODE_ENV === "production")
  throw new Error(
    "The localhost development launcher refuses production mode.",
  );
let proxy, child, closing;
async function requireFreePort(origin, label) {
  const port = Number(new URL(origin).port || 443);
  const probe = createServer();
  try {
    await new Promise((done, reject) => {
      probe.once("error", reject);
      probe.listen(port, "127.0.0.1", done);
    });
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      throw new Error(
        `${label} port ${port} is already in use. Stop its existing dev command first. The backend must run separately on port 4001.`,
      );
    }
    throw error;
  } finally {
    if (probe.listening) await new Promise((done) => probe.close(done));
  }
}
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
  // Check both ports before creating a bridge or loading Next. The actual web
  // server still handles bind errors in case another process wins the race.
  await requireFreePort(webOrigin, "Web HTTPS");
  await requireFreePort(apiOrigin, "API HTTPS");
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
    const timer = setTimeout(
      () =>
        settled(
          new Error(
            "Web startup timed out. Check the server output and port configuration.",
          ),
        ),
      60_000,
    );
    const error = (failure) => settled(failure);
    const exited = () =>
      settled(
        new Error(
          "Web server exited before startup. Its API bridge has been stopped.",
        ),
      );
    const received = (message) => {
      if (message.kind === "ready") settled();
      if (message.kind === "startup-failed")
        settled(new Error(message.message));
    };
    function settled(failure) {
      clearTimeout(timer);
      child.off("error", error);
      child.off("exit", exited);
      child.off("message", received);
      if (failure) reject(failure);
      else done();
    }
    child.once("error", error);
    child.once("exit", exited);
    child.on("message", received);
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
  process.exit(1);
}
