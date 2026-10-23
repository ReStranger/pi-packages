# @gotgenes/pi-permission-mode

Pi extension providing `/permission-mode [normal|yolo|deny]` to switch permission mode per session.

## Usage

Use the `/permission-mode` slash command inside Pi:

- `/permission-mode` — Displays the current permission mode.
- `/permission-mode normal` — Standard permission mode (rules apply; prompts on ask).
- `/permission-mode yolo` — Auto-approves all asks; explicit denies remain blocked.
- `/permission-mode deny` — Auto-denies all asks; explicit allows remain allowed.

## Session Persistence

The selected permission mode is stored in session entries under the custom entry type `permission-mode`.
When resuming a session (`/resume`), the mode is automatically restored.
Modes are scoped strictly to the session: global and project `config.json` files are never touched.
