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
      "- [x] Custom release check",
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
    expect(updated).toContain("- [x] Custom release check");
  });

  it("does not accumulate separators below developer notes on repeated updates", () => {
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
      "",
      "- Add any extra context here",
      "",
      "---",
      "",
      "## ✅ Checklist",
      "",
      "- [ ] Documentation updated / modified",
    ].join("\n");

    const firstUpdate = formatter.replaceAISection(body, "New summary");
    const secondUpdate = formatter.replaceAISection(firstUpdate, "Newer summary");

    expect(secondUpdate).toBe(
      formatter.replaceAISection(secondUpdate, "Newer summary")
    );
    expect(
      secondUpdate.match(
        /## 🧑‍💻 Developer Notes\n\n- Add any extra context here\n\n---\n\n## ✅ Checklist/
      )
    ).not.toBe(null);
    expect((secondUpdate.match(/\n---\n/g) || []).length).toBe(2);
  });

  it("preserves user-edited developer notes without restoring the placeholder", () => {
    const body = [
      "## 📌 Summary",
      "",
      "<!-- AI:START -->",
      "Old summary",
      "<!-- AI:END -->",
      "",
      "---",
      "",
      "## Developer Notes",
      "",
      "- Validated manually in staging",
      "",
      "---",
      "",
      "## ✅ Checklist",
      "",
      "- [ ] Documentation updated / modified",
    ].join("\n");

    const firstUpdate = formatter.replaceAISection(body, "New summary");
    const secondUpdate = formatter.replaceAISection(firstUpdate, "Newer summary");

    expect(secondUpdate).toContain("## 🧑‍💻 Developer Notes");
    expect(secondUpdate).toContain("- Validated manually in staging");
    expect(secondUpdate).not.toContain("- Add any extra context here");
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

  it("checks documentation when markdown files change", () => {
    const files: FileChange[] = [
      {
        filename: "docs/README.md",
        status: "modified",
        additions: 30,
        deletions: 5,
        changes: 35,
      },
    ];

    const updated = formatter.replaceAISection("", "AI summary", files);

    expect(updated).toContain("- [x] Documentation updated / modified");
    expect(updated).not.toContain("Tests added");
    expect(updated).not.toContain("Configuration validated");
    expect(updated).not.toContain("Performance reviewed");
    expect(updated).not.toContain("Breaking changes documented");
  });

  it("leaves documentation unchecked when no markdown files change", () => {
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

    expect(updated).toContain("- [ ] Documentation updated / modified");
    expect(updated).not.toContain("Performance reviewed");
  });
});
