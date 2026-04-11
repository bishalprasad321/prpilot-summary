/* eslint-disable no-console */
/**
 * Logger utility for consistent, formatted logging
 *
 * Usage:
 *   const logger = new Logger();
 *   logger.info("Something good");
 *   logger.warn("Be careful");
 *   logger.error("Oh no!");
 *   logger.debug("Details (only in debug mode)");
 */

export class Logger {
  private debugMode: boolean;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode || process.env.DEBUG === "true";
  }

  /**
   * Info level - general flow information
   */
  info(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ℹ️  ${message}`);
  }

  /**
   * Warning level - something to be aware of
   */
  warn(message: string): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] ⚠️  ${message}`);
  }

  /**
   * Error level - something went wrong
   */
  error(message: string): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ${message}`);
  }

  /**
   * Debug level - detailed information (only logged in debug mode)
   */
  debug(message: string): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🐛 ${message}`);
    }
  }

  /**
   * Success level - something completed successfully
   */
  success(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ ${message}`);
  }

  /**
   * Set debug mode
   */
  setDebugMode(debug: boolean): void {
    this.debugMode = debug;
  }
}
