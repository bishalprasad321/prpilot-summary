/**
 * State Manager - Persists processing state for idempotency
 *
 * Stores:
 * - Last processed commit SHA
 * - Processing history
 * - Cache (optional)
 *
 * Storage options:
 * 1. GitHub workflow artifacts (persistent across runs)
 * 2. Local file (for local testing)
 * 3. Memory (for single run)
 *
 * Uses local file storage for simplicity in action context.
 */

import * as fs from "fs";
import * as path from "path";
import { Logger } from "../utils/logger.js";

const STATE_FILE = ".ai-pr-state.json";

interface StateData {
  lastProcessedSha: string | null;
  processedAt: string;
  prNumber: number | null;
}

export class StateManager {
  private logger: Logger;
  private stateFilePath: string;
  private state: StateData;

  constructor(workingDir?: string) {
    this.logger = new Logger();
    this.stateFilePath = path.join(workingDir || process.cwd(), STATE_FILE);
    this.state = this.loadState();
  }

  /**
   * Load state from file
   */
  private loadState(): StateData {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const content = fs.readFileSync(this.stateFilePath, "utf-8");
        const parsed = JSON.parse(content) as StateData;
        this.logger.debug(`Loaded state from ${this.stateFilePath}`);
        return parsed;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load state file: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Return default state
    return {
      lastProcessedSha: null,
      processedAt: new Date().toISOString(),
      prNumber: null,
    };
  }

  /**
   * Get last processed SHA
   */
  getLastProcessedSha(): string | null {
    return this.state.lastProcessedSha;
  }

  /**
   * Set last processed SHA
   */
  setLastProcessedSha(sha: string): void {
    this.state.lastProcessedSha = sha;
    this.state.processedAt = new Date().toISOString();
    this.saveState();
    this.logger.debug(`Updated last processed SHA to ${sha.slice(0, 7)}`);
  }

  /**
   * Set PR number for tracking
   */
  setPRNumber(prNumber: number): void {
    this.state.prNumber = prNumber;
    this.saveState();
  }

  /**
   * Get PR number
   */
  getPRNumber(): number | null {
    return this.state.prNumber;
  }

  /**
   * Save state to file
   */
  private saveState(): void {
    try {
      fs.writeFileSync(
        this.stateFilePath,
        JSON.stringify(this.state, null, 2),
        "utf-8"
      );
      this.logger.debug(`State saved to ${this.stateFilePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to save state: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Reset state (for testing or manual reset)
   */
  reset(): void {
    this.state = {
      lastProcessedSha: null,
      processedAt: new Date().toISOString(),
      prNumber: null,
    };
    this.saveState();
    this.logger.info("State reset");
  }

  /**
   * Get full state object (for debugging)
   */
  getState(): StateData {
    return { ...this.state };
  }
}
