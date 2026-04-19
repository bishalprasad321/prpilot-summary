/**
 * Formatter - Convert LLM output to Markdown and manage PR body sections
 *
 * Responsibilities:
 * - Format LLM JSON output into readable Markdown
 * - Replace AI section in PR body while preserving other content
 * - Use template from TEMPLATE.md (including Developer Notes and Checklist)
 * - Extract and preserve existing developer notes from PR body
 * - Generate dynamic checklist based on file changes
 */

import { Logger } from "../utils/logger.js";
import { LLMOutput, FileChange } from "../utils/types.js";

const AI_SECTION_START = "<!-- AI:START -->";
const AI_SECTION_END = "<!-- AI:END -->";

export class Formatter {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Extract raw PR description (anything before the template structure)
   * Handles cases where user has already written a description
   * Returns null if no raw description exists
   */
  private extractRawPRDescription(prBody: string): string | null {
    if (!prBody || prBody.length === 0) {
      return null;
    }

    // Check if body already has the standard template
    if (prBody.includes("## 📌 Summary")) {
      // Check if there's content BEFORE the Summary section
      const beforeSummary = prBody.split("## 📌 Summary")[0].trim();
      if (beforeSummary && beforeSummary.length > 0) {
        return beforeSummary;
      }
      return null;
    }

    // If no template exists, entire body (excluding markers) is the description
    if (
      !prBody.includes(AI_SECTION_START) &&
      !prBody.includes("## 🧑‍💻 Developer Notes")
    ) {
      return prBody.trim();
    }

    return null;
  }

  /**
   * Generate dynamic checklist based on files changed
   * Analyzes file types and changes to suggest relevant checklist items
   */
  private generateDynamicChecklist(files: FileChange[]): string {
    const items: string[] = [];

    // Check for test files
    const hasTestChanges = files.some(
      (f) =>
        f.filename.includes("test") ||
        f.filename.includes("spec") ||
        f.filename.endsWith(".test.ts") ||
        f.filename.endsWith(".spec.ts") ||
        f.filename.endsWith("__tests__")
    );

    // Check for documentation files
    const hasDocChanges = files.some(
      (f) =>
        f.filename.endsWith(".md") ||
        f.filename.includes("docs/") ||
        f.filename.includes("README") ||
        f.filename.endsWith("CHANGELOG.md")
    );

    // Check for configuration changes
    const hasConfigChanges = files.some(
      (f) =>
        f.filename.endsWith(".json") ||
        f.filename.endsWith(".yml") ||
        f.filename.endsWith(".yaml") ||
        f.filename.endsWith(".toml")
    );

    // Always include base items
    items.push(
      "- [x] Tests added" + (hasTestChanges ? "" : " (no test files detected)")
    );
    items.push(
      "- [x] Documentation updated" +
        (hasDocChanges ? "" : " (no docs updated)")
    );

    // Add config item if config changed
    if (hasConfigChanges) {
      items.push("- [ ] Configuration validated");
    }

    // Add performance check if large changes
    const totalChanges = files.reduce(
      (acc, f) => acc + f.additions + f.deletions,
      0
    );
    if (totalChanges > 500) {
      items.push("- [ ] Performance reviewed");
    }

    // Add breaking changes item if deletions are significant
    const totalDeletions = files.reduce((acc, f) => acc + f.deletions, 0);
    if (totalDeletions > 100) {
      items.push("- [ ] Breaking changes documented");
    }

    return items.join("\n");
  }

  /**
   * Extract existing developer notes from PR body
   * Captures any content between "## 🧑‍💻 Developer Notes" and the next section
   * Returns empty content if no developer notes exist
   */
  private extractExistingDeveloperNotes(prBody: string): string {
    const devNotesMatch = prBody.match(
      /## 🧑‍💻 Developer Notes\n([\s\S]*?)(?=\n##|$)/
    );

    if (!devNotesMatch || !devNotesMatch[1]) {
      return "- Add any extra context here";
    }

    // Trim the extracted content and preserve its structure
    const content = devNotesMatch[1].trim();

    // If the existing content is just the placeholder, replace it
    if (content === "- Add any extra context here") {
      return content;
    }

    return content;
  }

  /**
   * Extract existing checklist from PR body
   * Captures any content between "## ✅ Checklist" and end of body
   * Returns default checklist if no checklist exists
   */
  private extractExistingChecklist(prBody: string): string {
    const checklistMatch = prBody.match(
      /## ✅ Checklist\n([\s\S]*?)(?=\n##|$)/
    );

    if (!checklistMatch || !checklistMatch[1]) {
      return "- [ ] Tests added\n- [ ] Documentation updated";
    }

    return checklistMatch[1].trim();
  }

  /**
   * Convert LLM output (JSON) to formatted Markdown
   * Generates ONLY the AI-generated summary section (wrapped in markers separately)
   * Developer Notes and Checklist are handled separately to preserve user content
   */
  toMarkdown(llmOutput: LLMOutput): string {
    const { summary, keyPoints, highlights, breaking } = llmOutput;

    // Build markdown sections for AI content only
    const sections: string[] = [];

    // Main heading
    sections.push(`## 🤖 AI Generated Summary`);
    sections.push("");

    // Summary section
    sections.push(summary);
    sections.push("");

    // Key points section
    if (keyPoints && keyPoints.length > 0) {
      sections.push(`**Key Points:**`);
      keyPoints.forEach((point) => {
        sections.push(`- ${point}`);
      });
      sections.push("");
    }

    // Highlights section
    if (highlights && highlights.length > 0) {
      sections.push(`**Highlights:**`);
      highlights.forEach((highlight) => {
        sections.push(`- ${highlight}`);
      });
      sections.push("");
    }

    // Breaking changes warning
    if (breaking) {
      sections.push(`⚠️ **BREAKING CHANGES**`);
      sections.push(
        `This PR contains breaking changes that may affect consumers.`
      );
      sections.push("");
    }

    return sections.join("\n");
  }

  /**
   * Replace AI section in PR body, or append if doesn't exist
   * Also ensures complete template structure with Developer Notes and Checklist
   *
   * Preserves:
   * - Existing developer notes and user context
   * - Raw PR descriptions (moves them to Developer Notes)
   * - Existing checklist items
   * - Other markdown sections
   *
   * Logic:
   * - Extract raw PR description if present and move to Developer Notes
   * - If AI section exists: replace it and ensure template structure
   * - If no AI section: create complete template with all sections
   * - Generate dynamic checklist based on file changes
   */
  replaceAISection(
    existingBody: string,
    newAIContent: string,
    files?: FileChange[]
  ): string {
    // Extract raw description that user might have written
    const rawDescription = this.extractRawPRDescription(existingBody);

    // Extract existing developer notes
    const existingDevNotes = this.extractExistingDeveloperNotes(existingBody);

    // Merge raw description with existing dev notes
    let mergedDevNotes = existingDevNotes;
    if (rawDescription && rawDescription !== "- Add any extra context here") {
      // Prepend raw description to dev notes
      mergedDevNotes = `${rawDescription}\n\n${existingDevNotes}`.trim();
    }

    // Generate dynamic checklist based on files (or use existing)
    const dynamicChecklist = files
      ? this.generateDynamicChecklist(files)
      : this.extractExistingChecklist(existingBody);

    if (!existingBody) {
      // Empty body: create complete template with default values
      return this.createCompleteTemplate(
        newAIContent,
        mergedDevNotes || "- Add any extra context here",
        dynamicChecklist
      );
    }

    // Check if AI section already exists
    if (
      existingBody.includes(AI_SECTION_START) &&
      existingBody.includes(AI_SECTION_END)
    ) {
      this.logger.debug("AI section exists, replacing...");
      return this.replaceSectionWithTemplate(
        existingBody,
        newAIContent,
        mergedDevNotes,
        dynamicChecklist
      );
    }

    // No AI section: create complete template
    this.logger.debug("No AI section found, creating complete template...");
    return this.createCompleteTemplate(
      newAIContent,
      mergedDevNotes,
      dynamicChecklist
    );
  }

  /**
   * Create a complete PR body template with all sections
   * Structure: Summary → AI Summary → Developer Notes → Checklist
   */
  private createCompleteTemplate(
    aiContent: string,
    devNotes: string,
    checklist: string
  ): string {
    const sections: string[] = [];

    // Summary section
    sections.push(`## 📌 Summary`);
    sections.push("");

    // AI section with markers
    sections.push(AI_SECTION_START);
    sections.push(aiContent);
    if (!aiContent.endsWith("\n")) {
      sections.push("");
    }
    sections.push(AI_SECTION_END);
    sections.push("");

    // Separator
    sections.push(`---`);
    sections.push("");

    // Developer Notes section
    sections.push(`## 🧑‍💻 Developer Notes`);
    sections.push("");
    sections.push(devNotes);
    sections.push("");

    // Separator
    sections.push(`---`);
    sections.push("");

    // Checklist section
    sections.push(`## ✅ Checklist`);
    sections.push("");
    sections.push(checklist);

    return sections.join("\n");
  }

  /**
   * Replace existing AI section and rebuild template with preserved content
   */
  private replaceSectionWithTemplate(
    body: string,
    newContent: string,
    devNotes: string,
    checklist: string
  ): string {
    const startIdx = body.indexOf(AI_SECTION_START);
    const endIdx = body.indexOf(AI_SECTION_END);

    if (startIdx === -1 || endIdx === -1) {
      this.logger.warn(
        "AI section markers not found, creating template instead"
      );
      return this.createCompleteTemplate(newContent, devNotes, checklist);
    }

    // Get content before AI section (typically the ## 📌 Summary header)
    const before = body.substring(0, startIdx).trimEnd();

    // Rebuild the complete structure
    const sections: string[] = [];

    // Preserve content before AI section (Summary header)
    if (before.length > 0) {
      sections.push(before);
      sections.push("");
    }

    // AI section with markers and new content
    sections.push(AI_SECTION_START);
    sections.push(newContent);
    if (!newContent.endsWith("\n")) {
      sections.push("");
    }
    sections.push(AI_SECTION_END);
    sections.push("");

    // Separator
    sections.push(`---`);
    sections.push("");

    // Developer Notes section
    sections.push(`## 🧑‍💻 Developer Notes`);
    sections.push("");
    sections.push(devNotes);
    sections.push("");

    // Separator
    sections.push(`---`);
    sections.push("");

    // Checklist section
    sections.push(`## ✅ Checklist`);
    sections.push("");
    sections.push(checklist);

    return sections.join("\n");
  }

  /**
   * Extract only the AI section from a PR body
   * Useful for debugging/validation
   */
  getAISection(body: string): string | null {
    const startIdx = body.indexOf(AI_SECTION_START);
    const endIdx = body.indexOf(AI_SECTION_END);

    if (startIdx === -1 || endIdx === -1) {
      return null;
    }

    return body.substring(startIdx + AI_SECTION_START.length, endIdx).trim();
  }
}
