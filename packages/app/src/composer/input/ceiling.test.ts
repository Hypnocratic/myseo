import { beforeEach, describe, expect, it } from "vitest";
import {
  applyUserCeiling,
  dragCeiling,
  resolveDefaultComposerMaxHeight,
  useComposerCeilingStore,
} from "./ceiling";

// Worked example: a 800px-tall window gives a default ceiling of
// max(160, floor(800 * 0.5)) = 400 and a drag upper bound of floor(800 * 0.8) = 640.
const windowHeight = 800;
const defaultMax = 400;
const minInputHeight = 46;

describe("resolveDefaultComposerMaxHeight", () => {
  it("caps the composer at half the window height", () => {
    expect(resolveDefaultComposerMaxHeight(800)).toBe(400);
  });

  it("never goes below the fallback height", () => {
    expect(resolveDefaultComposerMaxHeight(200)).toBe(160);
  });

  it("falls back to the default height for invalid window sizes", () => {
    expect(resolveDefaultComposerMaxHeight(0)).toBe(160);
    expect(resolveDefaultComposerMaxHeight(Number.NaN)).toBe(160);
  });
});

describe("applyUserCeiling", () => {
  it("returns the default max when no user ceiling is set", () => {
    expect(applyUserCeiling({ defaultMax, userCeiling: null, windowHeight, minInputHeight })).toBe(
      defaultMax,
    );
  });

  it("keeps a user ceiling within the drag bounds unchanged", () => {
    expect(applyUserCeiling({ defaultMax, userCeiling: 500, windowHeight, minInputHeight })).toBe(
      500,
    );
  });

  it("clamps a user ceiling above 80% of the window height", () => {
    expect(applyUserCeiling({ defaultMax, userCeiling: 900, windowHeight, minInputHeight })).toBe(
      640,
    );
  });

  it("clamps a user ceiling below the one-line input height", () => {
    expect(applyUserCeiling({ defaultMax, userCeiling: 10, windowHeight, minInputHeight })).toBe(
      minInputHeight,
    );
  });

  it("skips the viewport clamp when the window size is unknown", () => {
    expect(
      applyUserCeiling({ defaultMax, userCeiling: 900, windowHeight: 0, minInputHeight }),
    ).toBe(900);
  });
});

describe("dragCeiling", () => {
  it("grows the ceiling when the pointer moves up", () => {
    expect(
      dragCeiling({ startCeiling: 400, startY: 500, currentY: 440, windowHeight, minInputHeight }),
    ).toBe(460);
  });

  it("shrinks the ceiling when the pointer moves down", () => {
    expect(
      dragCeiling({ startCeiling: 400, startY: 500, currentY: 560, windowHeight, minInputHeight }),
    ).toBe(340);
  });

  it("clamps at the viewport bound while dragging up", () => {
    expect(
      dragCeiling({ startCeiling: 400, startY: 500, currentY: 0, windowHeight, minInputHeight }),
    ).toBe(640);
  });

  it("clamps at the one-line height while dragging down", () => {
    expect(
      dragCeiling({ startCeiling: 400, startY: 500, currentY: 2000, windowHeight, minInputHeight }),
    ).toBe(minInputHeight);
  });
});

describe("composer ceiling store", () => {
  beforeEach(() => {
    useComposerCeilingStore.getState().setCeiling(null);
  });

  it("starts with no user ceiling", () => {
    expect(useComposerCeilingStore.getState().ceiling).toBeNull();
  });

  it("stores a dragged ceiling across composers", () => {
    useComposerCeilingStore.getState().setCeiling(500);
    expect(useComposerCeilingStore.getState().ceiling).toBe(500);
  });
});
