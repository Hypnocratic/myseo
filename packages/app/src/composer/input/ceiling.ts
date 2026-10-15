import { create } from "zustand";
import { isWeb } from "@/constants/platform";

const DEFAULT_MAX_INPUT_HEIGHT = 160;
const DEFAULT_MAX_VIEWPORT_RATIO = 0.5;
// Upper drag bound: the composer may never cover more than this share of the window.
const CEILING_VIEWPORT_RATIO = 0.8;

export const MIN_INPUT_HEIGHT_MOBILE = 30;
export const MIN_INPUT_HEIGHT_DESKTOP = 46;
export const MIN_INPUT_HEIGHT = isWeb ? MIN_INPUT_HEIGHT_DESKTOP : MIN_INPUT_HEIGHT_MOBILE;

export function resolveDefaultComposerMaxHeight(windowHeight: number): number {
  if (!Number.isFinite(windowHeight) || windowHeight <= 0) return DEFAULT_MAX_INPUT_HEIGHT;
  return Math.max(DEFAULT_MAX_INPUT_HEIGHT, Math.floor(windowHeight * DEFAULT_MAX_VIEWPORT_RATIO));
}

function resolveCeilingViewportMax(windowHeight: number): number | null {
  if (!Number.isFinite(windowHeight) || windowHeight <= 0) return null;
  return Math.floor(windowHeight * CEILING_VIEWPORT_RATIO);
}

export function clampCeiling(args: {
  value: number;
  windowHeight: number;
  minInputHeight: number;
}): number {
  const { value, windowHeight, minInputHeight } = args;
  const viewportMax = resolveCeilingViewportMax(windowHeight);
  const upperBound = viewportMax === null ? value : Math.max(viewportMax, minInputHeight);
  return Math.min(Math.max(value, minInputHeight), upperBound);
}

export function applyUserCeiling(args: {
  defaultMax: number;
  userCeiling: number | null;
  windowHeight: number;
  minInputHeight: number;
}): number {
  const { defaultMax, userCeiling, windowHeight, minInputHeight } = args;
  if (userCeiling === null) return defaultMax;
  return clampCeiling({ value: userCeiling, windowHeight, minInputHeight });
}

export function dragCeiling(args: {
  startCeiling: number;
  startY: number;
  currentY: number;
  windowHeight: number;
  minInputHeight: number;
}): number {
  const { startCeiling, startY, currentY, windowHeight, minInputHeight } = args;
  // Dragging up (currentY < startY) grows the ceiling.
  return clampCeiling({
    value: startCeiling + (startY - currentY),
    windowHeight,
    minInputHeight,
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
