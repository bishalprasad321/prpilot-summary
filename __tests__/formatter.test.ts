import { Formatter } from "../src/utils/formatter";
import type { LLMOutput } from "../src/utils/types";

describe("Formatter", () => {
  let formatter: Formatter;

  beforeEach(() => {
    formatter = new Formatter();
  });

  it("formats LLM output into markdown with AI sections", () => {
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

  it("creates complete template with all sections when no AI section exists", () => {
    const llmOutput: LLMOutput = {
      summary: "Updated the build pipeline.",
      keyPoints: ["Added bundling"],
      highlights: ["Safer marketplace consumption"],
    };

    const updated = formatter.replaceAISection("", formatter.toMarkdown(llmOutput));

    expect(updated).toContain("## 📌 Summary");
    expect(updated).toContain("<!-- AI:START -->");
    expect(updated).toContain("## 🤖 AI Generated Summary");
    expect(updated).toContain("<!-- AI:END -->");
    expect(updated).toContain("## 🧑‍💻 Developer Notes");
    expect(updated).toContain("## ✅ Checklist");
    expect(updated).toContain("- Add any extra context here");
    expect(updated).toContain("- [ ] Tests added");
    expect(updated).toContain("- [ ] Documentation updated");
  });

  it("replaces existing AI section and preserves developer notes and checklist", () => {
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
      "- Keep this custom note",
      "- Another point",
      "",
      "---",
      "",
      "## ✅ Checklist",
      "- [x] Custom checklist item 1",
      "- [ ] Custom checklist item 2",
    ].join("\n");

    const newAiContent = "New AI generated summary";
    const updated = formatter.replaceAISection(body, newAiContent);

    expect(updated).toContain("## 📌 Summary");
    expect(updated).toContain("<!-- AI:START -->\nNew AI generated summary");
    expect(updated).not.toContain("Old summary");
    expect(updated).toContain("## 🧑‍💻 Developer Notes");
    expect(updated).toContain("- Keep this custom note");
    expect(updated).toContain("- Another point");
    expect(updated).toContain("## ✅ Checklist");
    expect(updated).toContain("- [x] Custom checklist item 1");
    expect(updated).toContain("- [ ] Custom checklist item 2");
  });

  it("preserves existing developer notes when replacing AI section", () => {
    const body = [
      "## 📌 Summary",
      "",
      "<!-- AI:START -->",
      "Old content",
      "<!-- AI:END -->",
      "",
      "## 🧑‍💻 Developer Notes",
      "- User added note 1",
      "- User added note 2",
    ].join("\n");

    const updated = formatter.replaceAISection(body, "New AI content");

    expect(updated).toContain("## 🧑‍💻 Developer Notes");
    expect(updated).toContain("- User added note 1");
    expect(updated).toContain("- User added note 2");
    expect(updated).not.toContain("Old content");
  });

  it("preserves existing checklist when replacing AI section", () => {
    const body = [
      "## 📌 Summary",
      "",
      "<!-- AI:START -->",
      "Old content",
      "<!-- AI:END -->",
      "",
      "## ✅ Checklist",
      "- [x] Completed item",
      "- [ ] Pending item",
    ].join("\n");

    const updated = formatter.replaceAISection(body, "New AI content");

    expect(updated).toContain("## ✅ Checklist");
    expect(updated).toContain("- [x] Completed item");
    expect(updated).toContain("- [ ] Pending item");
  });

  it("returns null when no AI section is present", () => {
    expect(formatter.getAISection("## Overview\nNo generated content yet")).toBe(
      null
    );
  });

  it("extracts AI section correctly", () => {
    const body = [
      "## 📌 Summary",
      "",
      "<!-- AI:START -->",
      "This is the AI generated content",
      "Multiple lines of content",
      "<!-- AI:END -->",
      "",
      "## 🧑‍💻 Developer Notes",
    ].join("\n");

    const aiSection = formatter.getAISection(body);

    expect(aiSection).toContain("This is the AI generated content");
    expect(aiSection).toContain("Multiple lines of content");
  });
});
