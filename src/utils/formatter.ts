/**
 * Formatter - Convert LLM output to Markdown and manage PR body sections
 *
 * Responsibilities:
 * - Format LLM JSON output into readable Markdown
 * - Replace AI section in PR body while preserving other content
 * - Use template from TEMPLATE.md
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
   * Convert LLM output (JSON) to formatted Markdown
   * Ensures consistent structure with proper spacing and no nested headings
   */
  toMarkdown(llmOutput: LLMOutput): string {
    const { summary, keyPoints, highlights, breaking } = llmOutput;

    // Build markdown with proper structure and consistent spacing
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
   *
   * Preserves:
   * - Existing developer notes
   * - Other markdown sections (Summary, Checklist, etc.)
   *
   * Logic:
   * - If AI section exists: replace it
   * - If no AI section: append after Summary section, or at end
   */
  replaceAISection(existingBody: string, newAIContent: string): string {
    if (!existingBody) {
      // Empty body: wrap in markers and return
      return `${AI_SECTION_START}\n${newAIContent}\n${AI_SECTION_END}`;
    }

    // Check if AI section already exists
    if (
      existingBody.includes(AI_SECTION_START) &&
      existingBody.includes(AI_SECTION_END)
    ) {
      this.logger.debug("AI section exists, replacing...");
      return this.replaceSection(existingBody, newAIContent);
    }

    // No AI section: append it
    this.logger.debug("No AI section found, appending...");
    return this.appendAISection(existingBody, newAIContent);
  }

  /**
   * Replace existing AI section
   * Ensures proper spacing around markers to prevent markdown degradation
   */
  private replaceSection(body: string, newContent: string): string {
    const startIdx = body.indexOf(AI_SECTION_START);
    const endIdx = body.indexOf(AI_SECTION_END);

    if (startIdx === -1 || endIdx === -1) {
      this.logger.warn("AI section markers not found, appending instead");
      return this.appendAISection(body, newContent);
    }

    const before = body.substring(0, startIdx).trimEnd();
    const after = body.substring(endIdx + AI_SECTION_END.length).trimStart();

    // Ensure proper spacing: before section, markers with content, after section
    let result = before;

    // Add spacing before AI section if there was content before
    if (before.length > 0) {
      result += "\n\n";
    }

    // Add AI section with markers and proper internal spacing
    result += `${AI_SECTION_START}\n`;
    result += newContent;
    if (!newContent.endsWith("\n")) {
      result += "\n";
    }
    result += AI_SECTION_END;

    // Add spacing after AI section if there's content after
    if (after.length > 0) {
      result += "\n\n";
      result += after;
    }

    return result;
  }

  /**
   * Append AI section to body with proper spacing
   *
   * Strategy:
   * 1. If there's a "## Developer Notes" section, insert before it
   * 2. If there's a "## ✅ Checklist" section, insert before it
   * 3. Otherwise, append at end
   */
  private appendAISection(body: string, newContent: string): string {
    const aiSectionBlock = `${AI_SECTION_START}\n${newContent}${newContent.endsWith("\n") ? "" : "\n"}${AI_SECTION_END}`;

    // Look for Developer Notes section
    const devNotesMatch = body.match(/## 🧑‍💻 Developer Notes\n/);
    if (devNotesMatch) {
      const idx = body.indexOf(devNotesMatch[0]);
      const before = body.substring(0, idx).trimEnd();
      const after = body.substring(idx);
      return `${before}\n\n${aiSectionBlock}\n\n${after}`;
    }

    // Look for Checklist section
    const checklistMatch = body.match(/## ✅ Checklist\n/);
    if (checklistMatch) {
      const idx = body.indexOf(checklistMatch[0]);
      const before = body.substring(0, idx).trimEnd();
      const after = body.substring(idx);
      return `${before}\n\n${aiSectionBlock}\n\n${after}`;
    }

    // Default: append at end with proper spacing
    return `${body.trimEnd()}\n\n${aiSectionBlock}`;
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
