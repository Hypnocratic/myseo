# Desktop remote UI

The desktop shell can load the daemon's served web UI instead of the bundled
`myseo://app` snapshot. Deploying the web-ui artifact to the daemon host then
updates the desktop client with no desktop rebuild — the shell only rebuilds for
Electron-main and native changes. The daemon side is the bundled web UI
(`public-docs/web-ui.md`, build in `docs/development.md` → "Bundled daemon web
UI"). This doc covers the desktop side, which is fork-specific — upstream has no
such mode.

## Enable

Set `ui.remoteUrl` in the desktop app's `desktop-settings.json` to the daemon
origin, or launch with `PASEO_DESKTOP_REMOTE_UI_URL`. The env var wins, so dev
builds and test profiles can exercise remote mode without touching settings.
Empty or absent means the bundled UI — that is also the kill switch.

## Behavior

- **Window frame.** Remote mode forces the native OS frame on every platform.
  The custom chrome's drag region and window controls are drawn by the bundled
  UI, which the daemon-served page does not render; without this the window
  can't be dragged or closed on Windows/Linux.
- **Preload bridge.** `preload.ts` exposes `window.paseoDesktop` only to the
  bundled origin (`myseo:`) and, in development, the Metro server (passed via
  `--paseo-bridge-origin`). A remote page gets no desktop IPC surface — window
  controls, dialogs, and `webUtils` file paths stay out of reach of whatever the
  daemon serves.
- **Navigation pin.** Remote windows may only navigate to the daemon origin,
  `myseo://app` (failover), devtools, and blank documents
  (`isAllowedRemoteUiNavigation` in `packages/desktop/src/remote-ui.ts`).
- **Failover.** On a main-frame load failure the window loads the bundled UI at
  the same initial route, which renders its normal disconnected state. Startup
  never depends on the daemon being reachable. Cosmetic known issue: after
  failover on Windows/Linux the bundled UI draws its custom titlebar inside the
  native frame — double chrome, everything still works.
- **Agent deep links.** The served UI has no preload bridge to receive
  `paseo:event:open-agent`, so in remote mode `openOrFocusAgent` navigates the
  window to the agent route instead of sending IPC. Project open-links
  (`paseo:get-pending-open-project`) stay bundled-UI-only.
- **Auth.** The remote origin's localStorage persists in the Electron session,
  so the daemon login is a one-time step per origin, same as a browser.

## Testing without touching the daily install

`PASEO_ELECTRON_USER_DATA_DIR` gives a build an isolated profile — separate
settings, hosts, and single-instance lock. A packaged test build must not
register the `myseo://` protocol handler (on Linux that comes from the installed
`.desktop` entry, so a portable build doesn't steal it; keep it that way).
Dev-mode builds exercise the same remote path: `npm run dev:desktop` with the
env var pointed at any daemon serving the web UI.
