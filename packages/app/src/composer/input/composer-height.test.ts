import { beforeEach, describe, expect, it } from "vitest";
import {
  clampManualHeight,
  dragManualHeight,
  resolveDefaultComposerMaxHeight,
  useComposerManualHeightStore,
} from "./composer-height";

// Worked example: a 800px-tall window gives a default max of
// max(160, floor(800 * 0.5)) = 400 and a manual upper bound of
// floor(800 * 0.8) = 640.
const windowHeight = 800;
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

describe("clampManualHeight", () => {
  it("keeps a manual height within the drag bounds unchanged", () => {
    expect(clampManualHeight({ value: 500, windowHeight, minInputHeight })).toBe(500);
  });

  it("clamps a manual height above 80% of the window height", () => {
    expect(clampManualHeight({ value: 900, windowHeight, minInputHeight })).toBe(640);
  });

  it("clamps a manual height below the one-line input height", () => {
    expect(clampManualHeight({ value: 10, windowHeight, minInputHeight })).toBe(minInputHeight);
  });

  it("skips the viewport clamp when the window size is unknown", () => {
    expect(clampManualHeight({ value: 900, windowHeight: 0, minInputHeight })).toBe(900);
  });
});

describe("dragManualHeight", () => {
  it("grows the height when the pointer moves up", () => {
    expect(
      dragManualHeight({
        startHeight: 400,
        startY: 500,
        currentY: 440,
        windowHeight,
        minInputHeight,
      }),
    ).toBe(460);
  });

  it("shrinks the height when the pointer moves down", () => {
    expect(
      dragManualHeight({
        startHeight: 400,
        startY: 500,
        currentY: 560,
        windowHeight,
        minInputHeight,
      }),
    ).toBe(340);
  });

  it("clamps at the viewport bound while dragging up", () => {
    expect(
      dragManualHeight({
        startHeight: 400,
        startY: 500,
        currentY: 0,
        windowHeight,
        minInputHeight,
      }),
    ).toBe(640);
  });

  it("clamps at the one-line height while dragging down", () => {
    expect(
      dragManualHeight({
        startHeight: 400,
        startY: 500,
        currentY: 2000,
        windowHeight,
        minInputHeight,
      }),
    ).toBe(minInputHeight);
  });
});

describe("composer manual height store", () => {
  beforeEach(() => {
    useComposerManualHeightStore.getState().setHeight(null);
  });

  it("starts with no manual height", () => {
    expect(useComposerManualHeightStore.getState().height).toBeNull();
  });

  it("stores a dragged height across composers", () => {
    useComposerManualHeightStore.getState().setHeight(500);
    expect(useComposerManualHeightStore.getState().height).toBe(500);
  });
});
