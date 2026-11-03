import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { generate } from "@graphql-codegen/cli";

const snapshot = "contracts/schema.graphql";
const output = "src/graphql/generated.ts";
const mode = process.argv[2];
if (!["generate", "check", "sync"].includes(mode))
  throw new Error("Choose generate, check or sync.");
const backend = resolve(
  process.env.SMARTBORD_BACKEND_PATH || "../SmartBord-AI",
);
if (mode === "sync")
  await writeFile(snapshot, await readFile(join(backend, snapshot)));
if (mode === "check") {
  const source = await readFile(join(backend, snapshot), "utf8");
  if (source !== (await readFile(snapshot, "utf8")))
    throw new Error("Backend schema snapshot drift: run yarn graphql:sync.");
}
const temporary = await mkdtemp(join(tmpdir(), "smartbord-codegen-"));
try {
  const destination =
    mode === "check" ? join(temporary, "generated.ts") : output;
  await generate(
    {
      schema: snapshot,
      documents: "src/graphql/*.graphql",
      generates: {
        [destination]: {
          plugins: ["typescript-operations", "typed-document-node"],
          config: {
            scalars: { ID: { input: "string", output: "string" } },
            enumsAsTypes: true,
            nonOptionalTypename: true,
            skipTypeNameForRoot: true,
          },
        },
      },
    },
    true,
  );
  if (
    mode === "check" &&
    (await readFile(destination, "utf8")) !== (await readFile(output, "utf8"))
  )
    throw new Error("Generated operation drift: run yarn graphql:generate.");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
