import { describe, expect, it } from "vitest";

import { PermissionManager } from "#src/policy/permission-manager";
import type { PermissionMode, ScopeConfig } from "#src/types";
import { createInMemoryPolicyLoader } from "#test/helpers/manager-harness";

function makeManager(
  global: Record<string, unknown>,
  getMode: () => PermissionMode,
  project?: ScopeConfig,
): PermissionManager {
  return new PermissionManager({
    policyLoader: createInMemoryPolicyLoader({
      global: { permission: global } as ScopeConfig,
      project,
    }),
    getMode,
  });
}

describe("PermissionManager mode support", () => {
  describe("deny mode rewrite", () => {
    it("rewrites a would-be-ask tool check to deny with origin 'deny'", () => {
      const manager = makeManager({ bash: "ask" }, () => "deny");
      const result = manager.check({
        kind: "tool",
        surface: "bash",
        input: { command: "rm -rf /tmp/x" },
      });
      expect(result.state).toBe("deny");
      expect(result.origin).toBe("deny");
      expect(result.reason).toBe("Denied by deny mode");
    });

    it("rewrites universal-default ask to deny with origin 'deny'", () => {
      const manager = makeManager({}, () => "deny");
      const result = manager.check({
        kind: "tool",
        surface: "unknownTool",
        input: {},
      });
      expect(result.state).toBe("deny");
      expect(result.origin).toBe("deny");
      expect(result.reason).toBe("Denied by deny mode");
    });

    it("passes an explicit allow through unchanged in deny mode", () => {
      const manager = makeManager({ read: "allow" }, () => "deny");
      const result = manager.check({
        kind: "tool",
        surface: "read",
        input: { path: "/tmp/file.txt" },
      });
      expect(result.state).toBe("allow");
      expect(result.origin).not.toBe("deny");
    });

    it("preserves explicit deny with its original reason in deny mode", () => {
      const manager = makeManager(
        { bash: { "*": { action: "deny", reason: "Blocked rm" } } },
        () => "deny",
      );
      const result = manager.check({
        kind: "tool",
        surface: "bash",
        input: { command: "rm -rf /" },
      });
      expect(result.state).toBe("deny");
      expect(result.origin).toBe("global");
      expect(result.reason).toBe("Blocked rm");
    });

    it("leaves display surfaces rewrite-free under deny mode", () => {
      const manager = makeManager({ bash: "ask" }, () => "deny");

      const bashRule = manager
        .getComposedConfigRules()
        .find((r) => r.surface === "bash");
      expect(bashRule?.action).toBe("ask");
      expect(bashRule?.origin).not.toBe("deny");

      expect(manager.getToolPermission("bash")).toBe("ask");
    });
  });

  describe("normal mode", () => {
    it("does not rewrite asks (state stays ask)", () => {
      const manager = makeManager({ bash: "ask" }, () => "normal");
      const result = manager.check({
        kind: "tool",
        surface: "bash",
        input: { command: "ls" },
      });
      expect(result.state).toBe("ask");
      expect(result.origin).not.toBe("deny");
      expect(result.origin).not.toBe("yolo");
    });
  });

  describe("dynamic mode switching", () => {
    it("reads mode per check, so toggling mode takes effect immediately", () => {
      let mode: PermissionMode = "normal";
      const manager = makeManager({ bash: "ask" }, () => mode);

      expect(
        manager.check({
          kind: "tool",
          surface: "bash",
          input: { command: "echo 1" },
        }).state,
      ).toBe("ask");

      mode = "deny";
      const denyResult = manager.check({
        kind: "tool",
        surface: "bash",
        input: { command: "echo 1" },
      });
      expect(denyResult.state).toBe("deny");
      expect(denyResult.origin).toBe("deny");

      mode = "yolo";
      const yoloResult = manager.check({
        kind: "tool",
        surface: "bash",
        input: { command: "echo 1" },
      });
      expect(yoloResult.state).toBe("allow");
      expect(yoloResult.origin).toBe("yolo");
    });
  });
});
