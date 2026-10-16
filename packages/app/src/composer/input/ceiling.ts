import { create } from "zustand";
import { isWeb } from "@/constants/platform";

const DEFAULT_MAX_INPUT_HEIGHT = 160;
const DEFAULT_MAX_VIEWPORT_RATIO = 0.5;
// Upper drag bound: the composer may never cover more than this share of the window.
const CEILING_VIEWPORT_RATIO = 0.8;

const MIN_INPUT_HEIGHT_MOBILE = 30;
const MIN_INPUT_HEIGHT_DESKTOP = 46;
export const MIN_INPUT_HEIGHT = isWeb ? MIN_INPUT_HEIGHT_DESKTOP : MIN_INPUT_HEIGHT_MOBILE;

function isValidWindowHeight(windowHeight: number): boolean {
  return Number.isFinite(windowHeight) && windowHeight > 0;
}

export function resolveDefaultComposerMaxHeight(windowHeight: number): number {
  if (!isValidWindowHeight(windowHeight)) return DEFAULT_MAX_INPUT_HEIGHT;
  return Math.max(DEFAULT_MAX_INPUT_HEIGHT, Math.floor(windowHeight * DEFAULT_MAX_VIEWPORT_RATIO));
}

function resolveCeilingViewportMax(windowHeight: number): number | null {
  if (!isValidWindowHeight(windowHeight)) return null;
  return Math.floor(windowHeight * CEILING_VIEWPORT_RATIO);
}

function clampCeiling(args: { value: number; windowHeight: number }): number {
  const { value, windowHeight } = args;
  const viewportMax = resolveCeilingViewportMax(windowHeight);
  const upperBound = viewportMax === null ? value : Math.max(viewportMax, MIN_INPUT_HEIGHT);
  return Math.min(Math.max(value, MIN_INPUT_HEIGHT), upperBound);
}

export function applyUserCeiling(args: {
  defaultMax: number;
  userCeiling: number | null;
  windowHeight: number;
}): number {
  const { defaultMax, userCeiling, windowHeight } = args;
  if (userCeiling === null) return defaultMax;
  return clampCeiling({ value: userCeiling, windowHeight });
}

export function dragCeiling(args: {
  startHeight: number;
  startY: number;
  currentY: number;
  windowHeight: number;
}): number {
  const { startHeight, startY, currentY, windowHeight } = args;
  // Dragging up (currentY < startY) grows the ceiling. `startHeight` is the
  // composer's realized height when the drag began, so the box tracks the
  // pointer from the first pixel instead of burning off headroom first.
  return clampCeiling({
    value: startHeight + (startY - currentY),
    windowHeight,
  });
}

interface ComposerCeilingState {
  /**
   * User-dragged ceiling for the composer height in px. Session-global (every
   * composer in the app shares it) and in-memory only: `null` means "use the
   * default max" and it returns after a reload.
   */
  ceiling: number | null;
  setCeiling: (ceiling: number | null) => void;
}

export const useComposerCeilingStore = create<ComposerCeilingState>()((set) => ({
  ceiling: null,
  setCeiling: (ceiling) => set({ ceiling }),
}));
