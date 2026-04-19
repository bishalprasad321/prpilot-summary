/**
 * Formatter - Convert LLM output to Markdown and manage PR body sections
 *
 * Responsibilities:
 * - Format LLM JSON output into readable Markdown
 * - Replace AI section in PR body while preserving other content
 * - Use template from TEMPLATE.md (including Developer Notes and Checklist)
 * - Extract and preserve existing developer notes from PR body
 */

import { Logger } from "../utils/logger.js";
import { LLMOutput } from "../utils/types.js";

const AI_SECTION_START = "<!-- AI:START -->";
const AI_SECTION_END = "<!-- AI:END -->";

export class Formatter {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
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
   * - Existing checklist items
   * - Other markdown sections
   *
   * Logic:
   * - If AI section exists: replace it and ensure template structure
   * - If no AI section: create complete template with all sections
   */
  replaceAISection(existingBody: string, newAIContent: string): string {
    if (!existingBody) {
      // Empty body: create complete template with default values
      return this.createCompleteTemplate(
        newAIContent,
        "- Add any extra context here",
        "- [ ] Tests added\n- [ ] Documentation updated"
      );
    }

    // Extract existing developer notes and checklist to preserve them
    const existingDevNotes = this.extractExistingDeveloperNotes(existingBody);
    const existingChecklist = this.extractExistingChecklist(existingBody);

    // Check if AI section already exists
    if (
      existingBody.includes(AI_SECTION_START) &&
      existingBody.includes(AI_SECTION_END)
    ) {
      this.logger.debug("AI section exists, replacing...");
      return this.replaceSectionWithTemplate(
        existingBody,
        newAIContent,
        existingDevNotes,
        existingChecklist
      );
    }

    // No AI section: create complete template
    this.logger.debug("No AI section found, creating complete template...");
    return this.createCompleteTemplate(
      newAIContent,
      existingDevNotes,
      existingChecklist
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
