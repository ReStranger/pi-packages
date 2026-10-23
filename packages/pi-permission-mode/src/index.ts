import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  getPermissionsService,
  PERMISSIONS_READY_CHANNEL,
  type PermissionsReadyEvent,
} from "@restranger/pi-permission-system";
import { extractSessionMode, validateMode } from "./mode-manager";
import { PERMISSION_MODE_CUSTOM_TYPE, type PermissionMode } from "./types";

const ALL_MODES: readonly PermissionMode[] = ["normal", "yolo", "deny"];

function isReadyEvent(data: unknown): data is PermissionsReadyEvent {
  return (
    typeof data === "object" &&
    data !== null &&
    "sessionId" in data &&
    typeof (data as Record<string, unknown>).sessionId === "string"
  );
}

export default function piPermissionModeExtension(pi: ExtensionAPI): void {
  const pendingModes = new Map<string, PermissionMode>();

  pi.on("session_start", (_event, ctx) => {
    const sessionId = ctx.sessionManager.getSessionId();
    const entries = ctx.sessionManager.getEntries();
    const restoredMode = extractSessionMode(entries);

    if (restoredMode) {
      const service = getPermissionsService(sessionId);
      if (service) {
        service.setSessionMode(restoredMode);
      } else {
        pendingModes.set(sessionId, restoredMode);
      }
    }
  });

  pi.events.on(PERMISSIONS_READY_CHANNEL, (data: unknown) => {
    if (!isReadyEvent(data)) return;
    const { sessionId } = data;
    if (sessionId) {
      const mode = pendingModes.get(sessionId);
      if (mode) {
        pendingModes.delete(sessionId);
        const service = getPermissionsService(sessionId);
        service?.setSessionMode(mode);
      }
    }
  });

  pi.on("session_shutdown", () => {
    pendingModes.clear();
  });

  pi.registerCommand("permission-mode", {
    description:
      "Switch permission mode for this session (normal | yolo | deny)",
    getArgumentCompletions: (prefix: string) => {
      const lower = prefix.trim().toLowerCase();
      return ALL_MODES.filter((m) => m.startsWith(lower)).map((m) => ({
        value: m,
        label: m,
        description: `Switch permission mode to ${m}`,
      }));
    },
    handler: (args, ctx) => {
      const sessionId = ctx.sessionManager.getSessionId();
      const service = getPermissionsService(sessionId);

      if (!service) {
        ctx.ui.notify(
          "pi-permission-system is not available for this session.",
          "error",
        );
        return Promise.resolve();
      }

      const trimmed = args.trim();
      if (!trimmed) {
        const current = service.getSessionMode();
        ctx.ui.notify(
          `Current permission mode: ${current}\nUsage: /permission-mode [normal|yolo|deny]`,
          "info",
        );
        return Promise.resolve();
      }

      const mode = validateMode(trimmed);
      if (!mode) {
        ctx.ui.notify(
          `Unknown mode '${trimmed}'. Usage: /permission-mode [normal|yolo|deny]`,
          "warning",
        );
        return Promise.resolve();
      }

      service.setSessionMode(mode);
      pi.appendEntry(PERMISSION_MODE_CUSTOM_TYPE, { mode });
      ctx.ui.notify(`Permission mode set to ${mode}.`, "info");
      return Promise.resolve();
    },
  });
}
