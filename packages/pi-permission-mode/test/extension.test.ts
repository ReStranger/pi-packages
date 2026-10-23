import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
  getPermissionsService,
  PERMISSIONS_READY_CHANNEL,
} from "@restranger/pi-permission-system";
import { beforeEach, describe, expect, it, vi } from "vitest";
import piPermissionModeExtension from "#src/index";
import { PERMISSION_MODE_CUSTOM_TYPE } from "#src/types";

vi.mock("@restranger/pi-permission-system", () => ({
  getPermissionsService: vi.fn(),
  PERMISSIONS_READY_CHANNEL: "permissions:ready",
}));

describe("piPermissionModeExtension", () => {
  let mockPi: ExtensionAPI;
  let eventHandlers: Map<string, (event: unknown, ctx: unknown) => void>;
  let customEventHandlers: Map<string, (data: unknown) => void>;
  let registeredCommands: Map<
    string,
    {
      description: string;
      getArgumentCompletions?: (prefix: string) => unknown[];
      handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
    }
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers = new Map();
    customEventHandlers = new Map();
    registeredCommands = new Map();

    mockPi = {
      on: vi.fn((event, handler) => {
        eventHandlers.set(
          event,
          handler as (event: unknown, ctx: unknown) => void,
        );
      }),
      events: {
        on: vi.fn((event, handler) => {
          customEventHandlers.set(event, handler as (data: unknown) => void);
          return () => {};
        }),
        emit: vi.fn(),
      },
      registerCommand: vi.fn((name, def) => {
        registeredCommands.set(name, def);
      }),
      appendEntry: vi.fn(),
    } as unknown as ExtensionAPI;
  });

  it("registers session lifecycle hooks and the /permission-mode command", () => {
    piPermissionModeExtension(mockPi);

    expect(mockPi.on).toHaveBeenCalledWith(
      "session_start",
      expect.any(Function),
    );
    expect(mockPi.on).toHaveBeenCalledWith(
      "session_shutdown",
      expect.any(Function),
    );
    expect(mockPi.events.on).toHaveBeenCalledWith(
      PERMISSIONS_READY_CHANNEL,
      expect.any(Function),
    );
    expect(mockPi.registerCommand).toHaveBeenCalledWith(
      "permission-mode",
      expect.any(Object),
    );
  });

  describe("command completions", () => {
    it("returns matching completions for prefix", () => {
      piPermissionModeExtension(mockPi);
      const command = registeredCommands.get("permission-mode")!;

      expect(command.getArgumentCompletions!("")).toEqual([
        {
          value: "normal",
          label: "normal",
          description: "Switch permission mode to normal",
        },
        {
          value: "yolo",
          label: "yolo",
          description: "Switch permission mode to yolo",
        },
        {
          value: "deny",
          label: "deny",
          description: "Switch permission mode to deny",
        },
      ]);
      expect(command.getArgumentCompletions!("y")).toEqual([
        {
          value: "yolo",
          label: "yolo",
          description: "Switch permission mode to yolo",
        },
      ]);
      expect(command.getArgumentCompletions!("den")).toEqual([
        {
          value: "deny",
          label: "deny",
          description: "Switch permission mode to deny",
        },
      ]);
      expect(command.getArgumentCompletions!("norm")).toEqual([
        {
          value: "normal",
          label: "normal",
          description: "Switch permission mode to normal",
        },
      ]);
      expect(command.getArgumentCompletions!("xyz")).toEqual([]);
    });
  });

  describe("command handler", () => {
    let mockContext: ExtensionCommandContext;
    let mockService: {
      getSessionMode: ReturnType<typeof vi.fn>;
      setSessionMode: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockService = {
        getSessionMode: vi.fn().mockReturnValue("normal"),
        setSessionMode: vi.fn(),
      };
      mockContext = {
        sessionManager: {
          getSessionId: vi.fn().mockReturnValue("session-123"),
          getEntries: vi.fn().mockReturnValue([]),
        },
        ui: {
          notify: vi.fn(),
        },
      } as unknown as ExtensionCommandContext;
    });

    it("notifies error if service is not available", async () => {
      vi.mocked(getPermissionsService).mockReturnValue(undefined);
      piPermissionModeExtension(mockPi);
      const command = registeredCommands.get("permission-mode")!;

      await command.handler("normal", mockContext);

      expect(mockContext.ui.notify).toHaveBeenCalledWith(
        "pi-permission-system is not available for this session.",
        "error",
      );
      expect(mockPi.appendEntry).not.toHaveBeenCalled();
    });

    it("displays current mode when called with empty arguments", async () => {
      vi.mocked(getPermissionsService).mockReturnValue(mockService as never);
      piPermissionModeExtension(mockPi);
      const command = registeredCommands.get("permission-mode")!;

      await command.handler("   ", mockContext);

      expect(mockService.getSessionMode).toHaveBeenCalled();
      expect(mockContext.ui.notify).toHaveBeenCalledWith(
        "Current permission mode: normal\nUsage: /permission-mode [normal|yolo|deny]",
        "info",
      );
      expect(mockService.setSessionMode).not.toHaveBeenCalled();
    });

    it("notifies warning for unknown mode", async () => {
      vi.mocked(getPermissionsService).mockReturnValue(mockService as never);
      piPermissionModeExtension(mockPi);
      const command = registeredCommands.get("permission-mode")!;

      await command.handler("fast", mockContext);

      expect(mockContext.ui.notify).toHaveBeenCalledWith(
        "Unknown mode 'fast'. Usage: /permission-mode [normal|yolo|deny]",
        "warning",
      );
      expect(mockService.setSessionMode).not.toHaveBeenCalled();
      expect(mockPi.appendEntry).not.toHaveBeenCalled();
    });

    it("sets mode and appends entry for valid mode", async () => {
      vi.mocked(getPermissionsService).mockReturnValue(mockService as never);
      piPermissionModeExtension(mockPi);
      const command = registeredCommands.get("permission-mode")!;

      await command.handler("yolo", mockContext);

      expect(mockService.setSessionMode).toHaveBeenCalledWith("yolo");
      expect(mockPi.appendEntry).toHaveBeenCalledWith(
        PERMISSION_MODE_CUSTOM_TYPE,
        { mode: "yolo" },
      );
      expect(mockContext.ui.notify).toHaveBeenCalledWith(
        "Permission mode set to yolo.",
        "info",
      );
    });
  });

  describe("session lifecycle and persistence", () => {
    let mockContext: ExtensionContext;
    let mockService: {
      getSessionMode: ReturnType<typeof vi.fn>;
      setSessionMode: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockService = {
        getSessionMode: vi.fn(),
        setSessionMode: vi.fn(),
      };
      mockContext = {
        sessionManager: {
          getSessionId: vi.fn().mockReturnValue("session-abc"),
          getEntries: vi.fn().mockReturnValue([
            {
              type: "custom",
              customType: PERMISSION_MODE_CUSTOM_TYPE,
              data: { mode: "deny" },
            },
          ]),
        },
      } as unknown as ExtensionContext;
    });

    it("restores mode on session_start if service is available immediately", () => {
      vi.mocked(getPermissionsService).mockReturnValue(mockService as never);
      piPermissionModeExtension(mockPi);

      const sessionStart = eventHandlers.get("session_start")!;
      sessionStart({}, mockContext);

      expect(mockService.setSessionMode).toHaveBeenCalledWith("deny");
    });

    it("queues restored mode and applies when permissions service becomes ready", () => {
      vi.mocked(getPermissionsService).mockReturnValueOnce(undefined);
      piPermissionModeExtension(mockPi);

      const sessionStart = eventHandlers.get("session_start")!;
      sessionStart({}, mockContext);

      expect(mockService.setSessionMode).not.toHaveBeenCalled();

      vi.mocked(getPermissionsService).mockReturnValue(mockService as never);
      const readyHandler = customEventHandlers.get(PERMISSIONS_READY_CHANNEL)!;
      readyHandler({ sessionId: "session-abc", adjudicatesLocally: true });

      expect(mockService.setSessionMode).toHaveBeenCalledWith("deny");
    });

    it("clears pending modes on session_shutdown", () => {
      vi.mocked(getPermissionsService).mockReturnValueOnce(undefined);
      piPermissionModeExtension(mockPi);

      const sessionStart = eventHandlers.get("session_start")!;
      sessionStart({}, mockContext);

      const sessionShutdown = eventHandlers.get("session_shutdown")!;
      sessionShutdown({}, mockContext);

      vi.mocked(getPermissionsService).mockReturnValue(mockService as never);
      const readyHandler = customEventHandlers.get(PERMISSIONS_READY_CHANNEL)!;
      readyHandler({ sessionId: "session-abc", adjudicatesLocally: true });

      expect(mockService.setSessionMode).not.toHaveBeenCalled();
    });
  });
});
