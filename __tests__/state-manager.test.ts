import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { StateManager } from "../src/state/state-manager";

describe("StateManager", () => {
  let tempDir: string;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "state-manager-test-"));
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("persists state updates to disk", () => {
    const manager = new StateManager(tempDir);

    manager.setLastProcessedSha("abcdef1234567890");
    manager.setPRNumber(42);

    const reloaded = new StateManager(tempDir);

    expect(reloaded.getLastProcessedSha()).toBe("abcdef1234567890");
    expect(reloaded.getPRNumber()).toBe(42);

    const rawState = JSON.parse(
      fs.readFileSync(path.join(tempDir, ".ai-pr-state.json"), "utf-8")
    ) as { lastProcessedSha: string; prNumber: number };

    expect(rawState.lastProcessedSha).toBe("abcdef1234567890");
    expect(rawState.prNumber).toBe(42);
  });

  it("falls back to default state when the state file is invalid", () => {
    fs.writeFileSync(path.join(tempDir, ".ai-pr-state.json"), "{invalid json");

    const manager = new StateManager(tempDir);

    expect(manager.getLastProcessedSha()).toBeNull();
    expect(manager.getPRNumber()).toBeNull();
  });

  it("resets persisted state back to defaults", () => {
    const manager = new StateManager(tempDir);

    manager.setLastProcessedSha("abcdef1234567890");
    manager.setPRNumber(99);
    manager.reset();

    expect(manager.getLastProcessedSha()).toBeNull();
    expect(manager.getPRNumber()).toBeNull();
    expect(manager.getState().processedAt).toEqual(expect.any(String));
  });
});
