import { describe, expect, it } from "vitest";

import {
  buildRemoteUiUrl,
  isAllowedRemoteUiNavigation,
  normalizeRemoteUiUrl,
  resolveRemoteUiConfig,
} from "./remote-ui";

describe("normalizeRemoteUiUrl", () => {
  it("normalizes a daemon origin", () => {
    expect(normalizeRemoteUiUrl("http://100.64.10.10:6767")).toBe("http://100.64.10.10:6767");
    expect(normalizeRemoteUiUrl(" http://100.64.10.10:6767/ ")).toBe("http://100.64.10.10:6767");
  });

  it("keeps https and path prefixes, drops hash and search", () => {
    expect(normalizeRemoteUiUrl("https://myseo.example.com/ui/")).toBe(
      "https://myseo.example.com/ui",
    );
    expect(normalizeRemoteUiUrl("http://host:6767/?x=1#frag")).toBe("http://host:6767");
  });

  it("rejects empty, malformed, and non-http input", () => {
    expect(normalizeRemoteUiUrl("")).toBeNull();
    expect(normalizeRemoteUiUrl("   ")).toBeNull();
    expect(normalizeRemoteUiUrl("not a url")).toBeNull();
    expect(normalizeRemoteUiUrl("ftp://host:6767")).toBeNull();
    expect(normalizeRemoteUiUrl("myseo://app/")).toBeNull();
    expect(normalizeRemoteUiUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("resolveRemoteUiConfig", () => {
  it("prefers the env var over the setting", () => {
    expect(
      resolveRemoteUiConfig({
        settingUrl: "http://setting:6767",
        envUrl: "http://env:6768",
      }),
    ).toEqual({ url: "http://env:6768" });
  });

  it("falls back to the setting", () => {
    expect(resolveRemoteUiConfig({ settingUrl: "http://setting:6767", envUrl: undefined })).toEqual(
      {
        url: "http://setting:6767",
      },
    );
  });

  it("returns null when neither source is a usable URL", () => {
    expect(resolveRemoteUiConfig({ settingUrl: "", envUrl: undefined })).toBeNull();
    expect(resolveRemoteUiConfig({ settingUrl: "garbage", envUrl: "also garbage" })).toBeNull();
  });
});

describe("buildRemoteUiUrl", () => {
  it("composes routes onto the daemon origin", () => {
    expect(buildRemoteUiUrl("http://host:6767", null)).toBe("http://host:6767/");
    expect(buildRemoteUiUrl("http://host:6767", "/")).toBe("http://host:6767/");
    expect(buildRemoteUiUrl("http://host:6767", "/h/s1/agent/a1")).toBe(
      "http://host:6767/h/s1/agent/a1",
    );
  });

  it("treats a route without a leading slash as root", () => {
    expect(buildRemoteUiUrl("http://host:6767", "h/s1/agent/a1")).toBe("http://host:6767/");
  });

  it("throws on an invalid remote URL", () => {
    expect(() => buildRemoteUiUrl("not a url", "/")).toThrow();
  });
});

describe("isAllowedRemoteUiNavigation", () => {
  const remoteUrl = "http://host:6767";

  it("allows same-origin navigation", () => {
    expect(isAllowedRemoteUiNavigation(remoteUrl, "http://host:6767/h/s1/agent/a1")).toBe(true);
    expect(isAllowedRemoteUiNavigation(remoteUrl, "http://host:6767/settings")).toBe(true);
  });

  it("allows the bundled app scheme, devtools, and blank documents", () => {
    expect(isAllowedRemoteUiNavigation(remoteUrl, "myseo://app/")).toBe(true);
    expect(isAllowedRemoteUiNavigation(remoteUrl, "myseo://app/h/s1/agent/a1")).toBe(true);
    expect(
      isAllowedRemoteUiNavigation(remoteUrl, "devtools://devtools/bundled/inspector.html"),
    ).toBe(true);
    expect(isAllowedRemoteUiNavigation(remoteUrl, "about:blank")).toBe(true);
  });

  it("blocks other origins and schemes", () => {
    expect(isAllowedRemoteUiNavigation(remoteUrl, "http://evil:6767/")).toBe(false);
    expect(isAllowedRemoteUiNavigation(remoteUrl, "https://host:6767/")).toBe(false);
    expect(isAllowedRemoteUiNavigation(remoteUrl, "file:///etc/passwd")).toBe(false);
    expect(isAllowedRemoteUiNavigation(remoteUrl, "myseo://evil/")).toBe(false);
    expect(isAllowedRemoteUiNavigation(remoteUrl, "javascript:alert(1)")).toBe(false);
    expect(isAllowedRemoteUiNavigation(remoteUrl, "not a url")).toBe(false);
  });

  it("blocks everything on an invalid remote URL", () => {
    expect(isAllowedRemoteUiNavigation("garbage", "http://host:6767/")).toBe(false);
  });
});
