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
   */
  toMarkdown(llmOutput: LLMOutput): string {
    const { summary, keyPoints, highlights, breaking } = llmOutput;

    // Build markdown
    let markdown = `## 🤖 AI Generated Summary\n\n`;
    markdown += `### Summary\n${summary}\n\n`;

    if (keyPoints && keyPoints.length > 0) {
      markdown += `### Key Points\n`;
      keyPoints.forEach((point) => {
        markdown += `- ${point}\n`;
      });
      markdown += `\n`;
    }

    if (highlights && highlights.length > 0) {
      markdown += `### Highlights\n`;
      highlights.forEach((highlight) => {
        markdown += `- ${highlight}\n`;
      });
      markdown += `\n`;
    }

    if (breaking) {
      markdown += `⚠️ **BREAKING CHANGES** - This PR contains breaking changes\n\n`;
    }

    return markdown;
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
   */
  private replaceSection(body: string, newContent: string): string {
    const startIdx = body.indexOf(AI_SECTION_START);
    const endIdx = body.indexOf(AI_SECTION_END);

    if (startIdx === -1 || endIdx === -1) {
      this.logger.warn("AI section markers not found, appending instead");
      return this.appendAISection(body, newContent);
    }

    const before = body.substring(0, startIdx);
    const after = body.substring(endIdx + AI_SECTION_END.length);

    return `${before}${AI_SECTION_START}\n${newContent}\n${AI_SECTION_END}${after}`;
  }

  /**
   * Append AI section to body
   *
   * Strategy:
   * 1. If there's a "## Developer Notes" section, insert before it
   * 2. If there's a "## ✅ Checklist" section, insert before it
   * 3. Otherwise, append at end
   */
  private appendAISection(body: string, newContent: string): string {
    // Look for Developer Notes section
    const devNotesMatch = body.match(/## 🧑‍💻 Developer Notes\n/);
    if (devNotesMatch) {
      const idx = body.indexOf(devNotesMatch[0]);
      const before = body.substring(0, idx);
      const after = body.substring(idx);
      return `${before}${AI_SECTION_START}\n${newContent}\n${AI_SECTION_END}\n\n${after}`;
    }

    // Look for Checklist section
    const checklistMatch = body.match(/## ✅ Checklist\n/);
    if (checklistMatch) {
      const idx = body.indexOf(checklistMatch[0]);
      const before = body.substring(0, idx);
      const after = body.substring(idx);
      return `${before}${AI_SECTION_START}\n${newContent}\n${AI_SECTION_END}\n\n${after}`;
    }

    // Default: append at end
    return `${body}\n\n${AI_SECTION_START}\n${newContent}\n${AI_SECTION_END}`;
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
