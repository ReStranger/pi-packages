import { expect, test } from "vitest";
import { DEFAULT_EXTENSION_CONFIG } from "#src/config/extension-config";
import {
  getPermissionSystemStatus,
  PERMISSION_SYSTEM_DENY_STATUS_VALUE,
  PERMISSION_SYSTEM_YOLO_STATUS_VALUE,
} from "#src/config/status";

test("Permission-system status is only exposed when yolo mode is enabled", () => {
  expect(getPermissionSystemStatus(DEFAULT_EXTENSION_CONFIG)).toBe(undefined);
  expect(
    getPermissionSystemStatus({ ...DEFAULT_EXTENSION_CONFIG, yoloMode: true }),
  ).toBe(PERMISSION_SYSTEM_YOLO_STATUS_VALUE);
});

test("Permission-system status reflects sessionMode override", () => {
  expect(getPermissionSystemStatus(DEFAULT_EXTENSION_CONFIG, "normal")).toBe(
    undefined,
  );
  expect(getPermissionSystemStatus(DEFAULT_EXTENSION_CONFIG, "yolo")).toBe(
    PERMISSION_SYSTEM_YOLO_STATUS_VALUE,
  );
  expect(getPermissionSystemStatus(DEFAULT_EXTENSION_CONFIG, "deny")).toBe(
    PERMISSION_SYSTEM_DENY_STATUS_VALUE,
  );
  // sessionMode overrides config.yoloMode
  expect(
    getPermissionSystemStatus(
      { ...DEFAULT_EXTENSION_CONFIG, yoloMode: true },
      "deny",
    ),
  ).toBe(PERMISSION_SYSTEM_DENY_STATUS_VALUE);
  expect(
    getPermissionSystemStatus(
      { ...DEFAULT_EXTENSION_CONFIG, yoloMode: true },
      "normal",
    ),
  ).toBe(undefined);
});
