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
      "## Overview",
      "",
      "<!-- AI:START -->",
      "Old summary",
      "<!-- AI:END -->",
      "",
      "## 🧑‍💻 Developer Notes",
      "- Keep this note",
    ].join("\n");

    const updated = formatter.replaceAISection(body, "New summary");

    expect(updated).toContain("<!-- AI:START -->\nNew summary\n<!-- AI:END -->");
    expect(updated).not.toContain("Old summary");
    expect(updated).toContain("## 🧑‍💻 Developer Notes");
    expect(updated).toContain("- Keep this note");
  });

  it("inserts a new AI section before developer notes when none exists", () => {
    const body = [
      "## Overview",
      "Human-authored summary",
      "",
      "## 🧑‍💻 Developer Notes",
      "- Existing note",
    ].join("\n");

    const updated = formatter.replaceAISection(body, "Generated summary");

    expect(updated.indexOf("<!-- AI:START -->")).toBeGreaterThan(-1);
    expect(updated.indexOf("<!-- AI:START -->")).toBeLessThan(
      updated.indexOf("## 🧑‍💻 Developer Notes")
    );
    // Ensure proper spacing is maintained
    expect(updated).toContain("\n\n<!-- AI:START -->");
    expect(updated).toContain("<!-- AI:END -->\n\n");
    expect(formatter.getAISection(updated)).toBe("Generated summary");
  });

  it("returns null when no AI section is present", () => {
    expect(formatter.getAISection("## Overview\nNo generated content yet")).toBe(
      null
    );
  });
});
