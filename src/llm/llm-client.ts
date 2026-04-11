/**
 * LLM Client - Abstraction over LLM API (OpenAI/GPT by default)
 *
 * Responsibilities:
 * - Build system/user prompts
 * - Call LLM API
 * - Parse and validate response
 * - Handle retries and errors
 */

import fetch from "node-fetch";
import { Logger } from "../utils/logger";
import { LLMContext, LLMOutput } from "../utils/types";

interface OpenAIMessage {
  role: "system" | "user";
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class LLMClient {
  private apiKey: string;
  private model: string;
  private logger: Logger;
  private apiEndpoint = "https://api.openai.com/v1/chat/completions";

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
    this.logger = new Logger();
  }

  /**
   * Build prompt from PR context
   */
  buildPrompt(context: LLMContext): OpenAIMessage[] {
    const { chunks, commitMessages, repoMetadata, stats } = context;

    // Build diff content for prompt
    const diffContent = chunks
      .map(
        (chunk) =>
          `## File: ${chunk.file}
Status: ${chunk.status}
Language: ${chunk.language || "unknown"}
Changes: +${chunk.additions}/-${chunk.deletions}

\`\`\`
${chunk.content.substring(0, 1000)}${chunk.content.length > 1000 ? "\n... (truncated)" : ""}
\`\`\``
      )
      .join("\n\n");

    const commitsSummary = commitMessages
      .slice(0, 10)
      .map((msg) => `- ${msg.split("\n")[0]}`)
      .join("\n");

    const systemPrompt = `You are an expert code reviewer and technical writer. Your task is to analyze pull request changes and generate a clear, concise, and informative PR description.

The description should:
1. Summarize the key changes in plain English
2. Highlight the purpose and impact of the PR
3. List key points that reviewers should know
4. Be professional but accessible
5. Focus on WHAT changed and WHY, not just the code

Output MUST be valid JSON with this exact structure:
{
  "summary": "2-3 sentence summary of changes",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "highlights": ["highlight 1", "highlight 2"],
  "breaking": false
}`;

    const userPrompt = `Please analyze this pull request and generate a description:

**PR**: #${repoMetadata.prNumber}
**Title**: ${repoMetadata.prTitle}
**Repository**: ${repoMetadata.owner}/${repoMetadata.name}

**Commit Messages**:
${commitsSummary}

**Statistics**:
- Files Changed: ${stats.filesChanged}
- Total Additions: ${stats.totalAdditions}
- Total Deletions: ${stats.totalDeletions}
- Commits: ${stats.commits}

**Changes**:
${diffContent}

${repoMetadata.prDescription ? `**Developer Notes**:\n${repoMetadata.prDescription}` : ""}

Please generate a JSON response with the PR description details.`;

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
  }

  /**
   * Call LLM API and get response
   */
  async callLLM(messages: OpenAIMessage[]): Promise<LLMOutput> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(
          `LLM call attempt ${attempt}/${maxRetries} using model: ${this.model}`
        );

        const response = await fetch(this.apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as Record<string, unknown>;
          throw new Error(
            `API error ${response.status}: ${JSON.stringify(errorData)}`
          );
        }

        const data = (await response.json()) as OpenAIResponse;
        const content = data.choices[0]?.message?.content;

        if (!content) {
          throw new Error("Empty response from LLM");
        }

        // Parse JSON response
        try {
          const parsed = JSON.parse(content) as LLMOutput;
          this.logger.info(
            `✓ LLM succeeded on attempt ${attempt} (summary: ${parsed.summary.length} chars)`
          );
          return parsed;
        } catch {
          throw new Error(`Failed to parse LLM response as JSON: ${content.substring(0, 100)}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Attempt ${attempt} failed: ${lastError.message}`
        );

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          this.logger.debug(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `LLM call failed after ${maxRetries} attempts: ${lastError?.message}`
    );
  }
}
