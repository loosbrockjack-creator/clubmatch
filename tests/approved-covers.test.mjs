import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("actual app resolver requires staging flag, stable ID, genuine approval and safe local URL", async () => {
  const entry = {
    clubId: "club",
    src: "/covers/club-123.webp",
    alt: "Representative illustration",
    type: "generated_illustration",
    approved: true,
    mock: false,
    review: {
      action: "approve",
      reviewer: "Fixture reviewer",
      acknowledged: true,
    },
    rights: { referencesChecked: true },
  };
  const input = await fs.readFile(
    path.join(REPO, "lib/approved-covers.ts"),
    "utf8",
  );
  const compile = async (manifest) => {
    const source = input.replace(
      /import manifest from [^;]+;/,
      `const manifest = ${JSON.stringify(manifest)};`,
    );
    const js = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    return (
      await import(
        "data:text/javascript;base64," + Buffer.from(js).toString("base64")
      )
    ).approvedCoverForClub;
  };
  const prior = process.env.NEXT_PUBLIC_APPROVED_COVERS;
  try {
    const resolver = await compile([entry]);
    delete process.env.NEXT_PUBLIC_APPROVED_COVERS;
    assert.equal(resolver({ id: "club" }), undefined);
    process.env.NEXT_PUBLIC_APPROVED_COVERS = "true";
    assert.equal(resolver({ id: "club" }).src, entry.src);
    assert.equal(resolver({ id: "wrong" }), undefined);
    assert.equal(resolver({ id: "club", greek: {} }), undefined);
    assert.equal(
      resolver({ id: "club", categories: ["Sororities"] }),
      undefined,
    );
    for (const invalid of [
      { ...entry, mock: true },
      { ...entry, approved: false },
      { ...entry, src: "https://example.com/art.webp" },
      {
        ...entry,
        review: { action: "approve", reviewer: "", acknowledged: true },
      },
      { ...entry, rights: { referencesChecked: false } },
    ])
      assert.equal((await compile([invalid]))({ id: "club" }), undefined);
  } finally {
    if (prior === undefined) delete process.env.NEXT_PUBLIC_APPROVED_COVERS;
    else process.env.NEXT_PUBLIC_APPROVED_COVERS = prior;
  }
});
