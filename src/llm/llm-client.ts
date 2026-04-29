/**
 * LLM Client - Abstraction over multiple LLM providers
 *
 * Responsibilities:
 * - Build system/user prompts
 * - Call provider-specific APIs
 * - Parse and validate response
 * - Handle retries and errors
 */

import fetch from "node-fetch";
import { Logger } from "../utils/logger.js";
import { LLMContext, LLMOutput } from "../utils/types.js";

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

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
    finishMessage?: string;
    tokenCount?: number;
  }>;
  error?: {
    message?: string;
  };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    thoughtsTokenCount?: number;
  };
  modelVersion?: string;
}

type LLMProvider = "auto" | "openai" | "openai-compatible" | "gemini" | "groq";

interface LLMClientOptions {
  provider?: LLMProvider;
  baseUrl?: string;
  debug?: boolean;
}

export class LLMClient {
  private apiKey: string;
  private model: string;
  private logger: Logger;
  private provider: Exclude<LLMProvider, "auto">;
  private baseUrl?: string;

  constructor(
    apiKey: string,
    model: string = "openai/gpt-oss-120b",
    options: LLMClientOptions = {}
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.logger = new Logger(options.debug);
    this.provider = this.resolveProvider(options.provider || "auto", model);
    this.baseUrl = options.baseUrl?.trim() || undefined;
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
6. Be brief and token-efficient

Output MUST be valid JSON with this exact structure:
{
  "summary": "max 40 words",
  "keyPoints": ["max 3 concise points"],
  "highlights": ["max 2 concise highlights"],
  "breaking": false
}

Return only the JSON object.
Do not use markdown.
Do not wrap the JSON in code fences.
Stop immediately after the closing }.`;

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

Please generate exactly one compact JSON object and nothing else.`;

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
  }

  /**
   * Get provider selected for the model
   */
  getProvider(): Exclude<LLMProvider, "auto"> {
    return this.provider;
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
          `LLM call attempt ${attempt}/${maxRetries} using provider: ${this.provider}, model: ${this.model}`
        );

        const content =
          this.provider === "gemini"
            ? await this.callGemini(messages)
            : await this.callOpenAICompatible(messages);

        if (!content) {
          throw new Error("Empty response from LLM");
        }

        // Parse JSON response
        try {
          const parsed = this.parseLLMOutput(content);
          this.logger.info(
            `✓ LLM succeeded on attempt ${attempt} (summary: ${parsed.summary.length} chars)`
          );
          return parsed;
        } catch (parseError) {
          throw new Error(
            `Failed to parse LLM response as JSON: ${
              parseError instanceof Error
                ? parseError.message
                : String(parseError)
            }. Response preview: ${content.substring(0, 160)}`
          );
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Attempt ${attempt} failed: ${lastError.message}`);

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

  private resolveProvider(
    provider: LLMProvider,
    model: string
  ): Exclude<LLMProvider, "auto"> {
    if (provider !== "auto") {
      return provider;
    }

    const normalizedModel = model.trim().toLowerCase();

    if (normalizedModel.startsWith("gemini")) {
      return "gemini";
    }

    if (
      normalizedModel.startsWith("openai/gpt-oss") ||
      normalizedModel.startsWith("llama-") ||
      normalizedModel.startsWith("mixtral-") ||
      normalizedModel.startsWith("gemma")
    ) {
      return "groq";
    }

    if (
      normalizedModel.startsWith("gpt") ||
      normalizedModel.startsWith("o1") ||
      normalizedModel.startsWith("o3") ||
      normalizedModel.startsWith("o4")
    ) {
      return "openai";
    }

    return "openai-compatible";
  }

  private async callOpenAICompatible(
    messages: OpenAIMessage[]
  ): Promise<string> {
    const apiEndpoint = this.getOpenAICompatibleEndpoint();

    const response = await fetch(apiEndpoint, {
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
    return data.choices[0]?.message?.content || "";
  }

  private getOpenAICompatibleEndpoint(): string {
    if (this.baseUrl) {
      const trimmedBase = this.baseUrl.replace(/\/$/, "");
      return trimmedBase.endsWith("/chat/completions")
        ? trimmedBase
        : `${trimmedBase}/chat/completions`;
    }

    if (this.provider === "groq") {
      return "https://api.groq.com/openai/v1/chat/completions";
    }

    return "https://api.openai.com/v1/chat/completions";
  }

  private async callGemini(messages: OpenAIMessage[]): Promise<string> {
    const systemPrompt =
      messages.find((message) => message.role === "system")?.content || "";
    const userPrompt =
      messages
        .filter((message) => message.role === "user")
        .map((message) => message.content)
        .join("\n\n") || "";

    const apiEndpoint =
      this.baseUrl ||
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(
        this.apiKey
      )}`;

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            required: ["summary", "keyPoints", "highlights", "breaking"],
            properties: {
              summary: {
                type: "STRING",
              },
              keyPoints: {
                type: "ARRAY",
                items: {
                  type: "STRING",
                },
              },
              highlights: {
                type: "ARRAY",
                items: {
                  type: "STRING",
                },
              },
              breaking: {
                type: "BOOLEAN",
              },
            },
          },
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as GeminiResponse;
      const providerHint =
        response.status === 404
          ? " Try a current Gemini model such as gemini-2.5-flash or gemini-2.5-flash-lite."
          : "";
      throw new Error(
        `API error ${response.status}: ${JSON.stringify(errorData)}${providerHint}`
      );
    }

    const data = (await response.json()) as GeminiResponse;
    const candidate = data.candidates?.[0];
    const content =
      candidate?.content?.parts?.map((part) => part.text || "").join("\n") ||
      "";

    if (!candidate) {
      throw new Error("Gemini returned no candidates");
    }

    this.logger.debug(
      `Gemini response metadata: ${JSON.stringify({
        modelVersion: data.modelVersion,
        finishReason: candidate.finishReason,
        finishMessage: candidate.finishMessage,
        tokenCount: candidate.tokenCount,
        usageMetadata: data.usageMetadata,
        contentLength: content.length,
      })}`
    );

    if (!content) {
      throw new Error(
        `Gemini returned empty content (finishReason: ${
          candidate.finishReason || "unknown"
        }, finishMessage: ${candidate.finishMessage || "none"})`
      );
    }

    if (candidate.finishReason === "MAX_TOKENS") {
      throw new Error(
        `Gemini response was truncated before completion (finishReason: MAX_TOKENS, tokenCount: ${
          candidate.tokenCount ?? "unknown"
        }, thoughtsTokenCount: ${
          data.usageMetadata?.thoughtsTokenCount ?? "unknown"
        })`
      );
    }

    return content;
  }

  private parseLLMOutput(content: string): LLMOutput {
    const candidates = this.extractJsonCandidates(content);
    let lastError: Error | null = null;

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as LLMOutput;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        try {
          return JSON.parse(this.repairJson(candidate)) as LLMOutput;
        } catch (repairError) {
          lastError =
            repairError instanceof Error
              ? repairError
              : new Error(String(repairError));
        }
      }
    }

    throw new Error(
      `Failed to parse JSON from response: ${lastError?.message || "unknown parse error"}`
    );
  }

  private extractJsonCandidates(content: string): string[] {
    const trimmed = content.trim();
    const candidates = new Set<string>();

    if (trimmed) {
      candidates.add(trimmed);
    }

    if (trimmed.startsWith("```")) {
      const fenced = trimmed
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, "");

      if (fenced.trim()) {
        candidates.add(fenced.trim());
      }
    }

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      candidates.add(trimmed.slice(firstBrace, lastBrace + 1).trim());
    }

    return Array.from(candidates);
  }

  private repairJson(content: string): string {
    return content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .replace(/,\s*([}\]])/g, "$1")
      .trim();
  }
}
