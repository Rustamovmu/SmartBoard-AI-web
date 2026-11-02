import next from "next";
import { createServer } from "node:https";
import { readFileSync } from "node:fs";

const origin = new URL(
  process.env.NEXT_PUBLIC_WEB_ORIGIN || "https://localhost:3000",
);
if (origin.protocol !== "https:" || origin.hostname !== "localhost")
  throw new Error("Local HTTPS server requires localhost.");
let app, server, handler, closing;
function close() {
  return (closing ??= (async () => {
    if (server?.listening) {
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
    }
    await app?.close();
  })());
}
function finish() {
  void close().then(
    () => process.exit(0),
    () => process.exit(1),
  );
}
process.once("SIGTERM", finish);
process.once("SIGINT", finish);
process.once("disconnect", finish);

try {
  server = createServer(
    {
      cert: readFileSync(process.env.WEB_TLS_CERT),
      key: readFileSync(process.env.WEB_TLS_KEY),
    },
    (request, response) => {
      if (!handler) {
        response.writeHead(503, { "Cache-Control": "no-store" });
        response.end("SmartBord is starting.");
        return;
      }
      void handler(request, response);
    },
  );
  // Reserve the real socket before Next installs process-level error handlers.
  // An occupied port must reject startup rather than leave a live IPC child.
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(Number(origin.port || 443), "127.0.0.1", done);
  });
  app = next({
    dev: process.env.WEB_DEV === "1",
    hostname: "localhost",
    port: Number(origin.port || 443),
  });
  await app.prepare();
  handler = app.getRequestHandler();
  if (process.connected) process.send({ kind: "ready" });
  console.log(`SmartBord HTTPS: ${origin.origin}`);
} catch (error) {
  const message =
    error.code === "EADDRINUSE"
      ? `Web HTTPS port ${origin.port || 443} is already in use. Stop its existing dev command first.`
      : "HTTPS web startup failed. Check local TLS files and the Next.js configuration.";
  console.error(message);
  if (process.connected) process.send({ kind: "startup-failed", message });
  await close();
  process.exit(1);
}
