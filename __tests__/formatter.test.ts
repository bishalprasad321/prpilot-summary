/// <reference types="jest" />

import { Formatter } from "../src/utils/formatter";
import type { LLMOutput, FileChange } from "../src/utils/types";

describe("Formatter", () => {
  let formatter: Formatter;

  beforeEach(() => {
    formatter = new Formatter();
  });

  it("formats LLM output into markdown with all sections", () => {
    const llmOutput: LLMOutput = {
      summary: "Updated the action build pipeline.",
      keyPoints: ["Added ncc bundling", "Committed dist artifacts"],
      highlights: ["Safer marketplace consumption"],
      breaking: true,
    };

    const markdown = formatter.toMarkdown(llmOutput);

    expect(markdown).toContain("## 🤖 AI Generated Summary");
    expect(markdown).toContain("Updated the action build pipeline.");
    expect(markdown).toContain("**Key Points:**");
    expect(markdown).toContain("- Added ncc bundling");
    expect(markdown).toContain("**Highlights:**");
    expect(markdown).toContain("- Safer marketplace consumption");
    expect(markdown).toContain("⚠️ **BREAKING CHANGES**");
    expect(markdown).toContain(
      "This PR contains breaking changes that may affect consumers."
    );
  });

  it("replaces an existing AI section and preserves surrounding content", () => {
    const body = [
      "## 📌 Summary",
      "",
      "<!-- AI:START -->",
      "Old summary",
      "<!-- AI:END -->",
      "",
      "---",
      "",
      "## 🧑‍💻 Developer Notes",
      "- Keep this note",
      "",
      "---",
      "",
      "## ✅ Checklist",
      "- [x] Tests added",
    ].join("\n");

    const updated = formatter.replaceAISection(body, "New summary");

    // Check for AI markers and content (may have extra newline before end marker)
    expect(updated).toContain("<!-- AI:START -->");
    expect(updated).toContain("New summary");
    expect(updated).toContain("<!-- AI:END -->");
    expect(updated).not.toContain("Old summary");
    expect(updated).toContain("## 🧑‍💻 Developer Notes");
    expect(updated).toContain("- Keep this note");
    expect(updated).toContain("## ✅ Checklist");
    expect(updated).toContain("- [x] Tests added");
  });

  it("creates complete template with all sections when no AI section exists", () => {
    const body = [
      "## Overview",
      "Human-authored summary",
      "",
      "## 🧑‍💻 Developer Notes",
      "- Existing note",
    ].join("\n");

    const updated = formatter.replaceAISection(body, "Generated summary");

    // Should contain all template sections
    expect(updated).toContain("## 📌 Summary");
    expect(updated).toContain("<!-- AI:START -->");
    expect(updated).toContain("Generated summary");
    expect(updated).toContain("<!-- AI:END -->");
    expect(updated).toContain("## 🧑‍💻 Developer Notes");
    expect(updated).toContain("- Existing note");
    expect(updated).toContain("## ✅ Checklist");
    // Ensure developer notes are preserved
    expect(formatter.getAISection(updated)).toBe("Generated summary");
  });

  it("returns null when no AI section is present", () => {
    expect(
      formatter.getAISection("## Overview\nNo generated content yet")
    ).toBe(null);
  });

  it("extracts raw PR description and moves it to Developer Notes", () => {
    const rawDescription =
      "This PR fixes the authentication bug\n\nRelated to issue #42";
    const aiContent = "Fixed authentication flow";

    const updated = formatter.replaceAISection(rawDescription, aiContent);

    // Raw description should be moved to Developer Notes
    expect(updated).toContain("## 🧑‍💻 Developer Notes");
    expect(updated).toContain("This PR fixes the authentication bug");
    expect(updated).toContain("Related to issue #42");
    expect(updated).toContain("<!-- AI:START -->");
    expect(updated).toContain(aiContent);
    expect(updated).toContain("<!-- AI:END -->");
  });

  it("generates dynamic checklist based on file changes", () => {
    const files: FileChange[] = [
      {
        filename: "__tests__/formatter.test.ts",
        status: "modified",
        additions: 50,
        deletions: 10,
        changes: 60,
      },
      {
        filename: "docs/README.md",
        status: "modified",
        additions: 30,
        deletions: 5,
        changes: 35,
      },
    ];

    const updated = formatter.replaceAISection("", "AI summary", files);

    // Should mark items as checked based on file changes
    expect(updated).toContain("- [x] Tests added");
    expect(updated).toContain("- [x] Documentation updated");
  });

  it("adds performance review item for large changes", () => {
    const files: FileChange[] = [
      {
        filename: "src/utils/formatter.ts",
        status: "modified",
        additions: 400,
        deletions: 200,
        changes: 600,
      },
    ];

    const updated = formatter.replaceAISection("", "AI summary", files);

    // Should add performance review item for large diffs (>500 changes)
    expect(updated).toContain("- [ ] Performance reviewed");
  });

  it("adds breaking changes item for significant deletions", () => {
    const files: FileChange[] = [
      {
        filename: "src/old-module.ts",
        status: "removed",
        additions: 0,
        deletions: 150,
        changes: 150,
      },
    ];

    const updated = formatter.replaceAISection("", "AI summary", files);

    // Should add breaking changes item for large deletions (>100 lines)
    expect(updated).toContain("- [ ] Breaking changes documented");
  });
});
