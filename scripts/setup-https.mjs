import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  copyFileSync,
  chmodSync,
  rmSync,
  constants,
} from "node:fs";
import { resolve } from "node:path";
import { X509Certificate } from "node:crypto";
import { projectRoot } from "./local-https.mjs";

if (process.platform !== "darwin")
  throw new Error(
    "Automatic local trust setup supports macOS. Configure your trusted certificate paths in .env.local on other platforms.",
  );
const directory = resolve(projectRoot, ".certs");
const files = [
  "rootCA.pem",
  "rootCA-key.pem",
  "localhost.pem",
  "localhost-key.pem",
];
const ca = resolve(directory, "rootCA.pem");
const keychain = resolve(
  process.env.HOME,
  "Library/Keychains/login.keychain-db",
);
function run(command, args) {
  execFileSync(command, args, { stdio: "pipe" });
}

try {
  if (process.argv.includes("--remove-trust")) {
    const fingerprint = new X509Certificate(
      readFileSync(ca),
    ).fingerprint256.replaceAll(":", "");
    run("security", ["remove-trusted-cert", ca]);
    run("security", ["delete-certificate", "-Z", fingerprint, keychain]);
    console.log(
      "Removed this checkout's localhost CA trust/certificate. Local TLS files were preserved.",
    );
  } else {
    if (!process.argv.includes("--trust-local-ca"))
      throw new Error(
        "Run yarn setup:https --trust-local-ca to generate ignored localhost TLS files and authorize their macOS SSL trust.",
      );
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const existing = files.filter((file) =>
      existsSync(resolve(directory, file)),
    );
    if (existing.length && existing.length !== files.length)
      throw new Error(
        "Local TLS files are incomplete. Inspect .certs before repairing; no existing file was overwritten.",
      );
    if (existing.length === 0) {
      const stage = mkdtempSync(resolve(directory, "setup-"));
      try {
        run("openssl", [
          "req",
          "-x509",
          "-newkey",
          "rsa:2048",
          "-nodes",
          "-days",
          "365",
          "-subj",
          "/CN=SmartBord localhost development CA",
          "-addext",
          "basicConstraints=critical,CA:TRUE",
          "-addext",
          "keyUsage=critical,keyCertSign,cRLSign",
          "-addext",
          "nameConstraints=critical,permitted;DNS:localhost,permitted;IP:127.0.0.1/255.255.255.255",
          "-keyout",
          resolve(stage, "rootCA-key.pem"),
          "-out",
          resolve(stage, "rootCA.pem"),
        ]);
        run("openssl", [
          "req",
          "-new",
          "-newkey",
          "rsa:2048",
          "-nodes",
          "-subj",
          "/CN=localhost",
          "-keyout",
          resolve(stage, "localhost-key.pem"),
          "-out",
          resolve(stage, "localhost.csr"),
        ]);
        const { writeFileSync } = await import("node:fs");
        writeFileSync(
          resolve(stage, "extensions.cnf"),
          "subjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n",
        );
        run("openssl", [
          "x509",
          "-req",
          "-days",
          "365",
          "-in",
          resolve(stage, "localhost.csr"),
          "-CA",
          resolve(stage, "rootCA.pem"),
          "-CAkey",
          resolve(stage, "rootCA-key.pem"),
          "-CAcreateserial",
          "-extfile",
          resolve(stage, "extensions.cnf"),
          "-out",
          resolve(stage, "localhost.pem"),
        ]);
        for (const file of files) {
          const target = resolve(directory, file);
          copyFileSync(resolve(stage, file), target, constants.COPYFILE_EXCL);
          chmodSync(target, 0o600);
        }
      } finally {
        rmSync(stage, { recursive: true, force: true });
      }
    }
    const leaf = new X509Certificate(
      readFileSync(resolve(directory, "localhost.pem")),
    );
    if (Date.parse(leaf.validTo) <= Date.now())
      throw new Error(
        "Your local certificate expired. Remove its trust and explicitly replace the expired .certs files before setup.",
      );
    run("security", [
      "add-trusted-cert",
      "-r",
      "trustRoot",
      "-p",
      "ssl",
      "-k",
      keychain,
      ca,
    ]);
    console.log(
      "Localhost HTTPS is ready. Local keys are ignored under .certs and stay on this Mac.",
    );
    console.log(
      "Run the backend with PORT=4001 npm run start:dev, then run yarn dev here.",
    );
    console.log(
      "Open https://localhost:3000/signup. Stop the old HTTP dev command first.",
    );
  }
} catch (error) {
  console.error(
    error.status !== undefined
      ? "Local HTTPS setup could not finish. Approve the macOS trust dialog and retry; no credential output was logged."
      : error.message,
  );
  process.exitCode = 1;
}
