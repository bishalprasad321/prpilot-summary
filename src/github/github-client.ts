/**
 * GitHub API client wrapper using Octokit
 *
 * Handles all GitHub interactions:
 * - Fetch PR details, files, commits
 * - Retrieve diffs
 * - Update PR body
 * - Post comments
 */

import { Octokit } from "@octokit/rest";
import { Logger } from "../utils/logger.js";
import {
  PRMetadata,
  CommitInfo,
  FileChange,
  GitHubClientConfig,
  UpdatePROptions,
} from "../utils/types.js";

export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private logger: Logger;

  constructor(githubToken: string, config: GitHubClientConfig) {
    this.octokit = new Octokit({ auth: githubToken });
    this.owner = config.owner;
    this.repo = config.repo;
    this.logger = new Logger();
  }

  /**
   * Fetch pull request metadata (title, body, base/head SHAs)
   */
  async getPullRequest(prNumber: number): Promise<PRMetadata | null> {
    try {
      const { data } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });

      return {
        title: data.title,
        body: data.body || "",
        base: {
          sha: data.base.sha,
        },
        head: {
          sha: data.head.sha,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch PR #${prNumber}: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Get list of files changed in the PR
   */
  async getChangedFiles(prNumber: number): Promise<FileChange[]> {
    try {
      const { data } = await this.octokit.pulls.listFiles({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: 100,
      });

      return data.map((file) => ({
        filename: file.filename,
        status: file.status as FileChange["status"],
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch changed files for PR #${prNumber}: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get commits in the PR
   */
  async getCommits(prNumber: number): Promise<CommitInfo[]> {
    try {
      const { data } = await this.octokit.pulls.listCommits({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: 50,
      });

      return data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || "Unknown",
        date: commit.commit.author?.date || new Date().toISOString(),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch commits for PR #${prNumber}: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get full diff for PR (base...head)
   */
  async getDiff(prNumber: number): Promise<string> {
    try {
      const { data } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        mediaType: {
          format: "diff",
        },
      });

      return data as unknown as string;
    } catch (error) {
      this.logger.error(
        `Failed to fetch diff for PR #${prNumber}: ${error instanceof Error ? error.message : String(error)}`
      );
      return "";
    }
  }

  /**
   * Get diff between two SHAs (for incremental processing)
   */
  async getDiffBetween(baseSha: string, headSha: string): Promise<string> {
    try {
      const { data } = await this.octokit.repos.compareCommits({
        owner: this.owner,
        repo: this.repo,
        base: baseSha,
        head: headSha,
        mediaType: {
          format: "diff",
        },
      });

      return data as unknown as string;
    } catch (error) {
      this.logger.error(
        `Failed to fetch diff between ${baseSha.slice(0, 7)}...${headSha.slice(0, 7)}: ${error instanceof Error ? error.message : String(error)}`
      );
      return "";
    }
  }

  /**
   * Update PR body
   */
  async updatePullRequest(
    prNumber: number,
    options: UpdatePROptions
  ): Promise<boolean> {
    try {
      await this.octokit.pulls.update({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        body: options.body,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to update PR #${prNumber}: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Post comment on PR
   */
  async commentOnPR(prNumber: number, message: string): Promise<boolean> {
    try {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        body: message,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to post comment on PR #${prNumber}: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }
}
