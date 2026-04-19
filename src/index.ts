#!/usr/bin/env node

/**
 * Central Orchestrator for PR Pilot Summary
 *
 * Responsibilities:
 * - Coordinate all modules (github, diff, llm, state, formatter)
 * - Control execution flow (14 steps)
 * - Handle failures gracefully (never break PR)
 * - Log execution for debugging
 *
 * Heavy logic lives in dedicated modules, NOT here.
 */

import * as core from "@actions/core";
import fs from "fs";
import { Logger } from "./utils/logger.js";
import { GitHubClient } from "./github/github-client.js";
import { DiffProcessor } from "./diff/diff-processor.js";
import { LLMClient } from "./llm/llm-client.js";
import { StateManager } from "./state/state-manager.js";
import { Formatter } from "./utils/formatter.js";
import { LLMOutput } from "./utils/types.js";

function isValidLLMOutput(
  output: Record<string, unknown>
): output is LLMOutput {
  return (
    typeof output.summary === "string" &&
    typeof output.keyPoints === "object" &&
    typeof output.highlights === "object" &&
    Array.isArray(output.keyPoints) &&
    Array.isArray(output.highlights)
  );
}

interface GitHubEventPayload {
  action?: string;
  pull_request?: {
    number?: number;
  };
}

type SupportedLLMProvider = "auto" | "openai" | "openai-compatible" | "gemini";

function isSupportedLLMProvider(
  provider: string
): provider is SupportedLLMProvider {
  return ["auto", "openai", "openai-compatible", "gemini"].includes(provider);
}

// =============================================================================
// INITIALIZATION
// =============================================================================

const logger = new Logger();

async function main() {
  logger.info("=".repeat(70));
  logger.info("🚀 PR Pilot Summary - Starting");
  logger.info("=".repeat(70));

  try {
    // =========================================================================
    // STEP 1: PARSE INPUTS
    // =========================================================================
    logger.info("📋 [STEP 1] Parsing inputs from action.yml...");

    const inputs = {
      githubToken: core.getInput("github_token"),
      llmApiKey: core.getInput("llm_api_key"),
      llmProvider: core.getInput("llm_provider") || "auto",
      llmApiBaseUrl: core.getInput("llm_api_base_url"),
      aiModel: core.getInput("ai_model") || "gpt-4o-mini",
      maxDiffLines: parseInt(core.getInput("max_diff_lines")) || 5000,
      enableIncrementalDiffProcessing:
        core.getInput("enable_incremental_diff_processing") !== "false",
      debug: core.getInput("debug") === "true",
    };

    if (!inputs.githubToken || !inputs.llmApiKey) {
      throw new Error("Missing required inputs: github_token or llm_api_key");
    }

    if (!isSupportedLLMProvider(inputs.llmProvider)) {
      throw new Error(
        `Unsupported llm_provider '${inputs.llmProvider}'. Expected one of: auto, openai, openai-compatible, gemini`
      );
    }

    logger.info(`✓ Inputs validated`);
    logger.info(`  - LLM Provider: ${inputs.llmProvider}`);
    logger.info(`  - AI Model: ${inputs.aiModel}`);
    logger.info(
      `  - API Base URL: ${inputs.llmApiBaseUrl || "provider default"}`
    );
    logger.info(`  - Max Diff Lines: ${inputs.maxDiffLines}`);
    logger.info(
      `  - Incremental Processing: ${inputs.enableIncrementalDiffProcessing}`
    );
    logger.info(`  - Debug Mode: ${inputs.debug}`);

    // =========================================================================
    // STEP 2: EXTRACT GITHUB CONTEXT
    // =========================================================================
    logger.info("📦 [STEP 2] Extracting GitHub context from environment...");

    const eventName = process.env.GITHUB_EVENT_NAME;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    let eventPayload: GitHubEventPayload = {};

    if (eventPath) {
      if (!fs.existsSync(eventPath)) {
        throw new Error(`Event file not found at ${eventPath}`);
      }

      try {
        const rawData = fs.readFileSync(eventPath, "utf-8");
        eventPayload = JSON.parse(rawData) as GitHubEventPayload;
        logger.info(`✓ Loaded event payload from ${eventPath}`);
      } catch (fileError) {
        throw new Error(
          `Failed to read GitHub event payload from ${eventPath}: ${
            fileError instanceof Error ? fileError.message : String(fileError)
          }`
        );
      }
    }

    if (eventName !== "pull_request") {
      logger.info(`⏭️  Event is '${eventName}', not 'pull_request'. Exiting.`);
      core.info("Action only runs on pull_request events");
      return;
    }

    const prNumber = eventPayload?.pull_request?.number;
    const repoOwner = process.env.GITHUB_REPOSITORY?.split("/")[0];
    const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
    const eventAction = eventPayload?.action;

    if (!prNumber || !repoOwner || !repoName) {
      throw new Error(
        `Missing PR context. PR: ${prNumber}, Owner: ${repoOwner}, Repo: ${repoName}`
      );
    }

    logger.info(`✓ GitHub context extracted`);
    logger.info(`  - PR: #${prNumber}`);
    logger.info(`  - Repository: ${repoOwner}/${repoName}`);
    logger.info(`  - Event Action: ${eventAction}`);

    // =========================================================================
    // STEP 3: INITIALIZE CLIENTS
    // =========================================================================
    logger.info("🔌 [STEP 3] Initializing clients...");

    const gitHub = new GitHubClient(inputs.githubToken, {
      owner: repoOwner,
      repo: repoName,
    });

    const llm = new LLMClient(inputs.llmApiKey, inputs.aiModel, {
      provider: inputs.llmProvider,
      baseUrl: inputs.llmApiBaseUrl,
      debug: inputs.debug,
    });
    const stateManager = new StateManager();
    const diffProcessor = new DiffProcessor();
    const formatter = new Formatter();

    logger.info(`✓ All clients initialized`);
    logger.info(`  - Resolved LLM Provider: ${llm.getProvider()}`);

    // =========================================================================
    // STEP 4: FETCH PR METADATA
    // =========================================================================
    logger.info("📡 [STEP 4] Fetching PR metadata...");

    const pr = await gitHub.getPullRequest(prNumber);
    if (!pr) {
      throw new Error(`Failed to fetch PR #${prNumber}`);
    }

    const files = await gitHub.getChangedFiles(prNumber);
    const commits = await gitHub.getCommits(prNumber);

    if (!commits || commits.length === 0) {
      throw new Error(`No commits found for PR #${prNumber}`);
    }

    const currentHeadSha = commits[commits.length - 1].sha;

    logger.info(`✓ PR metadata fetched`);
    logger.info(`  - Title: ${pr.title}`);
    logger.info(`  - Base SHA: ${pr.base.sha.slice(0, 7)}`);
    logger.info(`  - Head SHA: ${currentHeadSha.slice(0, 7)}`);
    logger.info(`  - Files Changed: ${files.length}`);
    logger.info(`  - Commits: ${commits.length}`);

    // =========================================================================
    // STEP 5: STATE CHECK (IDEMPOTENCY) - CRITICAL
    // =========================================================================
    logger.info("💾 [STEP 5] Checking state for idempotency...");

    const lastProcessedSha = stateManager.getLastProcessedSha();

    if (lastProcessedSha === currentHeadSha) {
      logger.info(
        `✓ No new changes detected (already processed SHA ${currentHeadSha.slice(0, 7)})`
      );
      logger.info(`ℹ️  Exiting without processing`);
      core.info("PR already processed for current commit");
      return;
    }

    if (lastProcessedSha) {
      logger.info(
        `✓ Incremental diff: ${lastProcessedSha.slice(0, 7)} → ${currentHeadSha.slice(0, 7)}`
      );
    } else {
      logger.info(`✓ First-time processing for this PR`);
    }

    // =========================================================================
    // STEP 6: DIFF RETRIEVAL
    // =========================================================================
    logger.info("📝 [STEP 6] Retrieving diff...");

    let diffContent: string;
    let diffMode: "full" | "incremental";

    if (
      inputs.enableIncrementalDiffProcessing &&
      lastProcessedSha &&
      eventAction === "synchronize"
    ) {
      logger.info(
        `🟡 Attempting incremental mode: fetching diff from ${lastProcessedSha.slice(0, 7)}`
      );

      // Fetch both incremental and full diff to compare sizes
      const incrementalDiff = await gitHub.getDiffBetween(
        lastProcessedSha,
        currentHeadSha
      );
      const fullDiff = await gitHub.getDiff(prNumber);

      const incrementalLineCount = incrementalDiff.split("\n").length;
      const fullLineCount = fullDiff.split("\n").length;

      // If incremental diff is >= 30% of full diff, use full diff for consistent context
      const incrementalThreshold = fullLineCount * 0.3;

      if (incrementalLineCount >= incrementalThreshold) {
        logger.info(
          `⚠️  Incremental diff is ${Math.round((incrementalLineCount / fullLineCount) * 100)}% of full diff`
        );
        logger.info(
          `📊 Switching to full mode for complete PR context (${incrementalLineCount} >= ${Math.round(incrementalThreshold)} lines)`
        );
        diffContent = fullDiff;
        diffMode = "full";
      } else {
        logger.info(
          `✓ Incremental diff is manageable (${Math.round((incrementalLineCount / fullLineCount) * 100)}% of full diff)`
        );
        diffContent = incrementalDiff;
        diffMode = "incremental";
      }
    } else {
      logger.info(`🟢 Full mode: fetching diff from base to head`);
      diffContent = await gitHub.getDiff(prNumber);
      diffMode = "full";
    }

    const diffLineCount = diffContent.split("\n").length;
    logger.info(`✓ Diff retrieved`);
    logger.info(`  - Mode: ${diffMode}`);
    logger.info(`  - Lines: ${diffLineCount}`);

    if (diffLineCount > inputs.maxDiffLines) {
      logger.warn(
        `⚠️  Diff exceeds max_diff_lines (${diffLineCount} > ${inputs.maxDiffLines})`
      );
      logger.info(`📊 Will use summarization instead of full processing`);
    }

    // =========================================================================
    // STEP 7: DIFF INTELLIGENCE LAYER
    // =========================================================================
    logger.info("🧠 [STEP 7] Processing diff through intelligence layer...");

    const processedChunks = diffProcessor.processAndFilter(
      files,
      diffContent,
      inputs.maxDiffLines
    );

    logger.info(`✓ Diff processed`);
    logger.info(`  - Chunks: ${processedChunks.length}`);
    logger.info(
      `  - Total changes: +${processedChunks.reduce((acc, c) => acc + c.additions, 0)}/-${processedChunks.reduce((acc, c) => acc + c.deletions, 0)}`
    );

    if (processedChunks.length === 0) {
      logger.info(
        `⚠️  No meaningful changes detected (empty diff after filtering)`
      );
      logger.info(`ℹ️  Exiting without processing`);
      core.info("No meaningful changes to document");
      return;
    }

    // =========================================================================
    // STEP 8: CONTEXT PREPARATION
    // =========================================================================
    logger.info("🎯 [STEP 8] Preparing context for LLM...");

    const llmContext = {
      chunks: processedChunks,
      commitMessages: commits.map((c) => c.message),
      repoMetadata: {
        owner: repoOwner,
        name: repoName,
        prNumber,
        prTitle: pr.title,
        prDescription: pr.body || "",
      },
      stats: {
        filesChanged: files.length,
        totalAdditions: processedChunks.reduce(
          (acc, c) => acc + c.additions,
          0
        ),
        totalDeletions: processedChunks.reduce(
          (acc, c) => acc + c.deletions,
          0
        ),
        commits: commits.length,
      },
    };

    logger.info(`✓ Context prepared`);
    logger.info(`  - Context size: ${JSON.stringify(llmContext).length} bytes`);

    if (inputs.debug) {
      logger.debug("=== DEBUG: Context Prepared ===");
      logger.debug(JSON.stringify(llmContext, null, 2));
    }

    // =========================================================================
    // STEP 9: LLM EXECUTION
    // =========================================================================
    logger.info("🤖 [STEP 9] Calling LLM...");

    let llmOutput: Record<string, unknown>;

    try {
      const prompt = llm.buildPrompt(llmContext);
      llmOutput = await llm.callLLM(prompt);

      logger.info(`✓ LLM execution successful`);
      logger.info(
        `  - Summary length: ${(llmOutput.summary as string).length} chars`
      );

      if (inputs.debug) {
        logger.debug("=== DEBUG: LLM Output ===");
        logger.debug(JSON.stringify(llmOutput, null, 2));
      }
    } catch (error) {
      logger.error(
        `❌ LLM execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
      logger.error(
        `🛑 Will not update PR to avoid breaking developer workflow`
      );

      // Post error comment to PR
      await gitHub.commentOnPR(
        prNumber,
        `⚠️ **AI Description Generation Failed**\n\nThe automated PR description generation encountered an error. Please check the action logs for details.`
      );

      core.setFailed("LLM generation failed");
      return;
    }

    // =========================================================================
    // STEP 10: FORMAT OUTPUT
    // =========================================================================
    logger.info("🎨 [STEP 10] Formatting output to Markdown...");

    if (!isValidLLMOutput(llmOutput)) {
      throw new Error("Invalid LLM output format");
    }
    const formattedDescription = formatter.toMarkdown(llmOutput as LLMOutput);

    logger.info(`✓ Output formatted`);
    logger.info(`  - Markdown size: ${formattedDescription.length} bytes`);

    if (inputs.debug) {
      logger.debug("=== DEBUG: Formatted Output ===");
      logger.debug(formattedDescription);
    }

    // =========================================================================
    // STEP 11: SAFE PR UPDATE
    // =========================================================================
    logger.info("🔄 [STEP 11] Safely updating PR description...");

    const existingBody = pr.body || "";
    const updatedBody = formatter.replaceAISection(
      existingBody,
      formattedDescription,
      files
    );

    logger.info(`✓ PR body prepared`);
    logger.info(`  - Existing body size: ${existingBody.length} bytes`);
    logger.info(`  - Updated body size: ${updatedBody.length} bytes`);

    if (inputs.debug) {
      logger.debug("=== DEBUG: Updated PR Body ===");
      logger.debug(updatedBody);
    }

    // =========================================================================
    // STEP 12: PUSH UPDATE TO GITHUB
    // =========================================================================
    logger.info("📤 [STEP 12] Pushing update to GitHub...");

    try {
      await gitHub.updatePullRequest(prNumber, {
        body: updatedBody,
      });
      logger.info(`✓ PR updated successfully`);
    } catch (error) {
      logger.error(
        `❌ Failed to update PR: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }

    // =========================================================================
    // STEP 13: PERSIST STATE
    // =========================================================================
    logger.info("💾 [STEP 13] Persisting state...");

    stateManager.setLastProcessedSha(currentHeadSha);

    logger.info(`✓ State persisted`);
    logger.info(`  - Saved SHA: ${currentHeadSha.slice(0, 7)}`);

    // =========================================================================
    // STEP 14: FINAL LOGGING
    // =========================================================================
    logger.info("✅ [STEP 14] Final logging");
    logger.info("=".repeat(70));
    logger.info("✨ PR description updated successfully");
    logger.info(`📊 Summary:`);
    logger.info(`  - Files: ${files.length}`);
    logger.info(
      `  - Changes: +${llmContext.stats.totalAdditions}/-${llmContext.stats.totalDeletions}`
    );
    logger.info(`  - Commits: ${commits.length}`);
    logger.info(`  - PR: #${prNumber} (${pr.title})`);
    logger.info("=".repeat(70));

    core.info("Action completed successfully");
  } catch (error) {
    // =========================================================================
    // ERROR HANDLING
    // =========================================================================
    logger.error("=".repeat(70));
    logger.error("❌ Action failed with error:");
    logger.error(
      error instanceof Error ? error.message : JSON.stringify(error)
    );
    logger.error("=".repeat(70));

    core.setFailed(
      error instanceof Error
        ? error.message
        : "Unknown error occurred in AI PR generator"
    );
  }
}

// Run the action
main().catch((error) => {
  logger.error("Fatal error in main execution:");
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
