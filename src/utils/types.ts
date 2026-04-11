/**
 * Shared type definitions
 */

export interface PRMetadata {
  title: string;
  body: string;
  base: {
    sha: string;
  };
  head: {
    sha: string;
  };
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface FileChange {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | "copied" | "unchanged" | "type-changed";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface DiffChunk {
  file: string;
  status: string;
  additions: number;
  deletions: number;
  content: string;
  language?: string;
}

export interface LLMContext {
  chunks: DiffChunk[];
  commitMessages: string[];
  repoMetadata: {
    owner: string;
    name: string;
    prNumber: number;
    prTitle: string;
    prDescription: string;
  };
  stats: {
    filesChanged: number;
    totalAdditions: number;
    totalDeletions: number;
    commits: number;
  };
}

export interface LLMOutput {
  summary: string;
  keyPoints: string[];
  highlights: string[];
  breaking?: boolean;
  [key: string]: unknown;
}

export interface GitHubClientConfig {
  owner: string;
  repo: string;
}

export interface UpdatePROptions {
  body: string;
}
