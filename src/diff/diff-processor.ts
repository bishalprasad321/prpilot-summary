/**
 * Diff Processor - Intelligent filtering, chunking, and classification
 *
 * Responsibilities:
 * - Filter out noise (binary files, deps, build artifacts)
 * - Chunk large diffs
 * - Detect file language/type
 * - Extract meaningful changes
 */

import { Logger } from "../utils/logger.js";
import { DiffChunk, FileChange } from "../utils/types.js";

export class DiffProcessor {
  private logger: Logger;

  // Files to ignore (binary, generated, etc.)
  private ignorePatterns = [
    /\.lock$/,
    /\.log$/,
    /node_modules\//,
    /dist\//,
    /build\//,
    /\.min\.js$/,
    /\.min\.css$/,
    /\.(png|jpg|jpeg|gif|ico|svg|webp|pdf|zip)$/,
    /\.git\//,
  ];

  // Language detection by file extension
  private languageMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".cpp": "cpp",
    ".c": "c",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".cs": "csharp",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".xml": "xml",
    ".html": "html",
    ".css": "css",
    ".md": "markdown",
    ".sql": "sql",
    ".sh": "bash",
  };

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Main entry point: Process and filter diff
   * Returns chunks ready for LLM consumption
   */
  processAndFilter(
    files: FileChange[],
    diffContent: string,
    maxDiffLines: number
  ): DiffChunk[] {
    const chunks: DiffChunk[] = [];

    // Parse diff content into file chunks
    const fileDiffs = this.parseDiff(diffContent);

    // Filter and process each file
    for (const fileDiff of fileDiffs) {
      // Skip ignored patterns
      if (this.shouldIgnoreFile(fileDiff.filename)) {
        this.logger.debug(`Skipping ignored file: ${fileDiff.filename}`);
        continue;
      }

      // Get file metadata
      const fileMetadata = files.find((f) => f.filename === fileDiff.filename);
      if (!fileMetadata) {
        continue;
      }

      // Detect language
      const language = this.detectLanguage(fileDiff.filename);

      // Create chunk
      const chunk: DiffChunk = {
        file: fileDiff.filename,
        status: fileMetadata.status,
        additions: fileMetadata.additions,
        deletions: fileMetadata.deletions,
        content: fileDiff.content,
        language,
      };

      chunks.push(chunk);
    }

    // If total lines exceed max, summarize
    const totalLines = chunks.reduce(
      (sum, c) => sum + c.content.split("\n").length,
      0
    );

    if (totalLines > maxDiffLines) {
      this.logger.warn(
        `Diff exceeds limit (${totalLines} > ${maxDiffLines}), truncating chunks`
      );
      return this.truncateChunks(chunks, maxDiffLines);
    }

    return chunks;
  }

  /**
   * Parse raw diff output into per-file chunks
   */
  private parseDiff(
    diffContent: string
  ): Array<{ filename: string; content: string }> {
    const chunks: Array<{ filename: string; content: string }> = [];
    const lines = diffContent.split("\n");

    let currentFile = "";
    let currentChunk: string[] = [];

    for (const line of lines) {
      // Detect file headers (diff --git a/... b/...)
      if (line.startsWith("diff --git")) {
        // Save previous chunk
        if (currentFile && currentChunk.length > 0) {
          chunks.push({
            filename: currentFile,
            content: currentChunk.join("\n"),
          });
        }

        // Extract filename
        const match = line.match(/b\/(.*?)$/);
        currentFile = match ? match[1] : "";
        currentChunk = [line];
      } else {
        currentChunk.push(line);
      }
    }

    // Save last chunk
    if (currentFile && currentChunk.length > 0) {
      chunks.push({
        filename: currentFile,
        content: currentChunk.join("\n"),
      });
    }

    return chunks;
  }

  /**
   * Check if file should be ignored
   */
  private shouldIgnoreFile(filename: string): boolean {
    return this.ignorePatterns.some((pattern) => pattern.test(filename));
  }

  /**
   * Detect programming language by file extension
   */
  private detectLanguage(filename: string): string | undefined {
    const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
    return this.languageMap[ext];
  }

  /**
   * Truncate chunks if they exceed max lines
   * Prioritize: modified files > new files > large changes
   */
  private truncateChunks(chunks: DiffChunk[], maxLines: number): DiffChunk[] {
    // Sort by priority: modified first, then by size
    const sorted = [...chunks].sort((a, b) => {
      const priorityOrder = { modified: 0, added: 1, renamed: 2, removed: 3 };
      const priorityA =
        priorityOrder[a.status as keyof typeof priorityOrder] ?? 9;
      const priorityB =
        priorityOrder[b.status as keyof typeof priorityOrder] ?? 9;

      if (priorityA !== priorityB) return priorityA - priorityB;
      return b.additions + b.deletions - (a.additions + a.deletions);
    });

    let lineCount = 0;
    const result: DiffChunk[] = [];

    for (const chunk of sorted) {
      const chunkLines = chunk.content.split("\n").length;
      if (lineCount + chunkLines <= maxLines) {
        result.push(chunk);
        lineCount += chunkLines;
      }
    }

    this.logger.debug(
      `Truncated to ${result.length}/${chunks.length} chunks (${lineCount}/${maxLines} lines)`
    );

    return result;
  }
}
