import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { localTls, projectRoot } from "../scripts/local-https.mjs";

async function listen(port = 0) {
  const server = createServer((socket) => socket.end());
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", done);
  });
  return {
    server,
    port: server.address().port,
    close: () => new Promise((done) => server.close(done)),
  };
}
async function freePort() {
  const fixture = await listen();
  const port = fixture.port;
  await fixture.close();
  return port;
}
async function run(script, env) {
  const child = spawn(process.execPath, [resolve(projectRoot, script)], {
    cwd: projectRoot,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  let output = "";
  child.stdout.on("data", (data) => {
    output += data;
  });
  child.stderr.on("data", (data) => {
    output += data;
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), 8_000);
  try {
    const result = await new Promise((done, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => done({ code, signal }));
    });
    assert.equal(
      result.signal,
      null,
      "launcher must exit without forced termination",
    );
    assert.equal(result.code, 1);
    assert.doesNotMatch(
      output,
      /uncaughtException|Creating an optimized|Compiled successfully/,
    );
    return output;
  } finally {
    clearTimeout(timer);
  }
}

for (const role of ["web", "api"]) {
  test(`occupied ${role} port fails without leaking a bridge or stopping its owner`, async () => {
    const blocker = await listen();
    const other = await freePort();
    const web = role === "web" ? blocker.port : other;
    const api = role === "api" ? blocker.port : other;
    try {
      const output = await run("scripts/dev.mjs", {
        NODE_ENV: "development",
        NEXT_PUBLIC_WEB_ORIGIN: `https://localhost:${web}`,
        NEXT_PUBLIC_AUTH_API_ORIGIN: `https://localhost:${api}`,
        SMARTBORD_API_HTTP_ORIGIN: `http://127.0.0.1:${await freePort()}`,
      });
      assert.match(
        output,
        new RegExp(
          `${role === "web" ? "Web" : "API"} HTTPS port ${blocker.port} is already in use`,
        ),
      );
      assert.equal(blocker.server.listening, true);
      const released = await listen(other);
      await released.close();
    } finally {
      await blocker.close();
    }
  });
}

test("HTTPS child handles a real bind conflict before preparing Next", async () => {
  const blocker = await listen();
  const tls = localTls();
  try {
    const output = await run("scripts/https-server.mjs", {
      WEB_DEV: "1",
      NEXT_PUBLIC_WEB_ORIGIN: `https://localhost:${blocker.port}`,
      WEB_TLS_CERT: tls.cert,
      WEB_TLS_KEY: tls.key,
    });
    assert.match(output, /Web HTTPS port .* is already in use/);
    assert.equal(blocker.server.listening, true);
  } finally {
    await blocker.close();
  }
});
