/**
 * Remote UI mode: the desktop shell loads the daemon's served web UI instead of
 * the bundled `myseo://app` snapshot, so deploying the web-ui artifact on the
 * daemon host updates the desktop client without a desktop rebuild. See
 * docs/desktop-remote-ui.md.
 */
export interface RemoteUiConfig {
  /** Normalized base URL (http/https, no trailing slash, no hash or search). */
  url: string;
}

export function normalizeRemoteUiUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) {
    return null;
  }

  url.hash = "";
  url.search = "";
  const normalized = url.toString();
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

/**
 * The env var exists so development builds and disposable test profiles can
 * exercise remote mode without editing desktop-settings.json.
 */
export function resolveRemoteUiConfig(input: {
  settingUrl: string;
  envUrl: string | undefined;
}): RemoteUiConfig | null {
  const url = normalizeRemoteUiUrl(input.envUrl ?? "") ?? normalizeRemoteUiUrl(input.settingUrl);
  return url ? { url } : null;
}

export function buildRemoteUiUrl(remoteUrl: string, route: string | null | undefined): string {
  const base = normalizeRemoteUiUrl(remoteUrl);
  if (!base) {
    throw new Error(`Invalid remote UI URL: ${remoteUrl}`);
  }
  const target = route && route.startsWith("/") ? route : "/";
  return new URL(target, `${base}/`).toString();
}

/**
 * Main-frame navigation allowlist for a remote-UI window: the daemon origin,
 * the bundled app scheme (failover and protocol redirects), devtools, and
 * blank documents. Everything else is blocked — a remote page must not be able
 * to point the shell at an arbitrary origin while the desktop preload and
 * window chrome are attached.
 */
export function isAllowedRemoteUiNavigation(remoteUrl: string, target: string): boolean {
  const base = normalizeRemoteUiUrl(remoteUrl);
  if (!base) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return false;
  }

  if (url.protocol === "myseo:") {
    return url.hostname === "app";
  }
  if (url.protocol === "devtools:" || url.protocol === "about:") {
    return true;
  }

  const allowedOrigin = new URL(base).origin;
  return url.origin === allowedOrigin && (url.protocol === "http:" || url.protocol === "https:");
}
