import next from "next";
import { createServer } from "node:https";
import { readFileSync } from "node:fs";

const origin = new URL(
  process.env.NEXT_PUBLIC_WEB_ORIGIN || "https://localhost:3000",
);
if (origin.protocol !== "https:" || origin.hostname !== "localhost")
  throw new Error("Local HTTPS server requires localhost.");
const app = next({
  dev: process.env.WEB_DEV === "1",
  hostname: "localhost",
  port: Number(origin.port),
});
await app.prepare();
const server = createServer(
  {
    cert: readFileSync(process.env.WEB_TLS_CERT),
    key: readFileSync(process.env.WEB_TLS_KEY),
  },
  app.getRequestHandler(),
);
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(Number(origin.port), "127.0.0.1", resolve);
});
process.send?.({ kind: "ready" });
console.log(`SmartBord HTTPS: ${origin.origin}`);
let closing;
function close() {
  closing ??= (async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await app.close();
    process.exit(0);
  })();
}
process.once("SIGTERM", close);
process.once("SIGINT", close);
process.once("disconnect", close);
