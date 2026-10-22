import type {
  ExtensionCommandContext,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { PermissionMode } from "#src/types";

import {
  EXTENSION_ID,
  isYoloModeEnabled,
  type PermissionSystemExtensionConfig,
} from "./extension-config";

export const PERMISSION_SYSTEM_STATUS_KEY = EXTENSION_ID;
export const PERMISSION_SYSTEM_YOLO_STATUS_VALUE = "yolo";
export const PERMISSION_SYSTEM_DENY_STATUS_VALUE = "deny";

type PermissionStatusContext =
  | Pick<ExtensionContext, "hasUI" | "ui">
  | Pick<ExtensionCommandContext, "ui">;

export function getPermissionSystemStatus(
  config: PermissionSystemExtensionConfig,
  sessionMode?: PermissionMode,
): string | undefined {
  const mode = sessionMode ?? (isYoloModeEnabled(config) ? "yolo" : "normal");
  if (mode === "yolo") return PERMISSION_SYSTEM_YOLO_STATUS_VALUE;
  if (mode === "deny") return PERMISSION_SYSTEM_DENY_STATUS_VALUE;
  return undefined;
}

export function syncPermissionSystemStatus(
  ctx: PermissionStatusContext,
  config: PermissionSystemExtensionConfig,
  sessionMode?: PermissionMode,
): void {
  ctx.ui.setStatus(
    PERMISSION_SYSTEM_STATUS_KEY,
    getPermissionSystemStatus(config, sessionMode),
  );
}
