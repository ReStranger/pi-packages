import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import { PERMISSION_MODE_CUSTOM_TYPE, type PermissionMode } from "./types";

const VALID_MODES: ReadonlySet<PermissionMode> = new Set([
  "normal",
  "yolo",
  "deny",
]);

/** Validate an input string against allowed permission modes. */
export function validateMode(input: string): PermissionMode | null {
  const normalized = input.trim().toLowerCase();
  if (VALID_MODES.has(normalized as PermissionMode)) {
    return normalized as PermissionMode;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Extract the last valid permission mode stored in session entries. */
export function extractSessionMode(
  entries: readonly SessionEntry[],
): PermissionMode | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (
      entry.type === "custom" &&
      entry.customType === PERMISSION_MODE_CUSTOM_TYPE &&
      isRecord(entry.data)
    ) {
      const mode = entry.data.mode;
      if (typeof mode === "string" && VALID_MODES.has(mode as PermissionMode)) {
        return mode as PermissionMode;
      }
    }
  }
  return undefined;
}
