import { createServer } from "node:https";
import { request } from "node:http";
import { localOrigin } from "./local-https.mjs";

// Development only: stream directly to a fixed loopback API. No body logging,
// disk buffering, credential rewriting or requests to caller-selected hosts.
export async function startApiProxy({ origin, upstream, tls }) {
  const address = localOrigin(origin);
  const target = localOrigin(upstream, "http:");
  const server = createServer(tls, (incoming, outgoing) => {
    const headers = {};
    for (const name of [
      "origin",
      "access-control-request-method",
      "access-control-request-headers",
      "cookie",
      "content-type",
      "content-length",
      "accept",
      "authorization",
      "x-smartbord-client",
      "x-csrf-token",
    ]) {
      if (incoming.headers[name] !== undefined)
        headers[name] = incoming.headers[name];
    }
    const forwarded = request(
      {
        hostname: target.hostname,
        port: Number(target.port || 80),
        path: incoming.url,
        method: incoming.method,
        headers,
        timeout: 15_000,
      },
      (response) => {
        outgoing.writeHead(response.statusCode || 502, response.headers);
        response.pipe(outgoing);
        response.on("error", () => outgoing.destroy());
      },
    );
    forwarded.on("timeout", () => forwarded.destroy());
    forwarded.on("error", () => {
      if (!outgoing.headersSent) {
        outgoing.writeHead(503, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        outgoing.end(
          JSON.stringify({
            code: "SERVICE_UNAVAILABLE",
            message: "Local backend is unavailable.",
          }),
        );
      } else outgoing.destroy();
    });
    incoming.on("aborted", () => forwarded.destroy());
    incoming.on("error", () => forwarded.destroy());
    outgoing.on("close", () => forwarded.destroy());
    incoming.pipe(forwarded);
  });
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(Number(address.port || 443), "127.0.0.1", done);
  });
  return {
    async close() {
      server.closeAllConnections();
      await new Promise((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      );
    },
  };
}
