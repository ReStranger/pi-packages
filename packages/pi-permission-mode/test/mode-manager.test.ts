import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import { extractSessionMode, validateMode } from "#src/mode-manager";
import { PERMISSION_MODE_CUSTOM_TYPE } from "#src/types";

describe("mode-manager", () => {
  describe("validateMode", () => {
    it("accepts valid modes in lowercase", () => {
      expect(validateMode("normal")).toBe("normal");
      expect(validateMode("yolo")).toBe("yolo");
      expect(validateMode("deny")).toBe("deny");
    });

    it("trims whitespace and ignores case", () => {
      expect(validateMode("  normal  ")).toBe("normal");
      expect(validateMode("YOLO")).toBe("yolo");
      expect(validateMode(" Deny ")).toBe("deny");
    });

    it("returns null for invalid modes", () => {
      expect(validateMode("")).toBeNull();
      expect(validateMode("invalid")).toBeNull();
      expect(validateMode("yoloo")).toBeNull();
      expect(validateMode("123")).toBeNull();
    });
  });

  describe("extractSessionMode", () => {
    it("returns undefined for empty entries", () => {
      expect(extractSessionMode([])).toBeUndefined();
    });

    it("extracts valid mode from a single entry", () => {
      const entries = [
        {
          type: "custom",
          customType: PERMISSION_MODE_CUSTOM_TYPE,
          data: { mode: "yolo" },
        },
      ] as unknown as SessionEntry[];
      expect(extractSessionMode(entries)).toBe("yolo");
    });

    it("returns the latest mode when multiple entries exist", () => {
      const entries = [
        {
          type: "custom",
          customType: PERMISSION_MODE_CUSTOM_TYPE,
          data: { mode: "normal" },
        },
        { type: "message", content: "hello" },
        {
          type: "custom",
          customType: PERMISSION_MODE_CUSTOM_TYPE,
          data: { mode: "deny" },
        },
      ] as unknown as SessionEntry[];
      expect(extractSessionMode(entries)).toBe("deny");
    });

    it("ignores entries with corrupted or unknown modes", () => {
      const entries = [
        {
          type: "custom",
          customType: PERMISSION_MODE_CUSTOM_TYPE,
          data: { mode: "yolo" },
        },
        {
          type: "custom",
          customType: PERMISSION_MODE_CUSTOM_TYPE,
          data: { mode: "corrupted_mode" },
        },
        {
          type: "custom",
          customType: PERMISSION_MODE_CUSTOM_TYPE,
          data: null,
        },
      ] as unknown as SessionEntry[];
      expect(extractSessionMode(entries)).toBe("yolo");
    });

    it("ignores entries of other types", () => {
      const entries = [
        {
          type: "custom",
          customType: "other-type",
          data: { mode: "deny" },
        },
      ] as unknown as SessionEntry[];
      expect(extractSessionMode(entries)).toBeUndefined();
    });
  });
});
