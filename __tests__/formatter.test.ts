/// <reference types="jest" />

import { Formatter } from "../src/utils/formatter";
import type { LLMOutput } from "../src/utils/types";

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
});
