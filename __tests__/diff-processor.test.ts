import { DiffProcessor } from "../src/diff/diff-processor";
import type { FileChange } from "../src/utils/types";

describe("DiffProcessor", () => {
  let processor: DiffProcessor;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    processor = new DiffProcessor();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("filters ignored files and keeps meaningful diff chunks with language metadata", () => {
    const files: FileChange[] = [
      {
        filename: "src/index.ts",
        status: "modified",
        additions: 10,
        deletions: 2,
        changes: 12,
      },
      {
        filename: "dist/index.js",
        status: "modified",
        additions: 20,
        deletions: 10,
        changes: 30,
      },
    ];

    const diff = [
      "diff --git a/src/index.ts b/src/index.ts",
      "--- a/src/index.ts",
      "+++ b/src/index.ts",
      "@@ -1,2 +1,2 @@",
      "-old",
      "+new",
      "diff --git a/dist/index.js b/dist/index.js",
      "--- a/dist/index.js",
      "+++ b/dist/index.js",
      "@@ -1 +1 @@",
      "-old-build",
      "+new-build",
    ].join("\n");

    const chunks = processor.processAndFilter(files, diff, 100);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      file: "src/index.ts",
      status: "modified",
      language: "typescript",
    });
    expect(chunks[0].content).toContain("diff --git a/src/index.ts b/src/index.ts");
  });

  it("truncates chunks according to priority when diff exceeds max lines", () => {
    const files: FileChange[] = [
      {
        filename: "src/modified.ts",
        status: "modified",
        additions: 2,
        deletions: 1,
        changes: 3,
      },
      {
        filename: "src/added.ts",
        status: "added",
        additions: 8,
        deletions: 0,
        changes: 8,
      },
      {
        filename: "src/removed.ts",
        status: "removed",
        additions: 0,
        deletions: 4,
        changes: 4,
      },
    ];

    const diff = [
      "diff --git a/src/modified.ts b/src/modified.ts",
      "--- a/src/modified.ts",
      "+++ b/src/modified.ts",
      "@@ -1 +1 @@",
      "-old",
      "+new",
      "diff --git a/src/added.ts b/src/added.ts",
      "--- /dev/null",
      "+++ b/src/added.ts",
      "@@ -0,0 +1,3 @@",
      "+one",
      "+two",
      "+three",
      "diff --git a/src/removed.ts b/src/removed.ts",
      "--- a/src/removed.ts",
      "+++ /dev/null",
      "@@ -1,2 +0,0 @@",
      "-gone-one",
      "-gone-two",
    ].join("\n");

    const chunks = processor.processAndFilter(files, diff, 7);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].file).toBe("src/modified.ts");
    expect(chunks[0].status).toBe("modified");
  });
});
