import { create } from "zustand";
import { isWeb } from "@/constants/platform";

const DEFAULT_MAX_INPUT_HEIGHT = 160;
const DEFAULT_MAX_VIEWPORT_RATIO = 0.5;
// Manual height upper bound: the composer may never cover more than this share
// of the window, however far the user drags.
const MANUAL_MAX_VIEWPORT_RATIO = 0.8;

export const MIN_INPUT_HEIGHT_MOBILE = 30;
export const MIN_INPUT_HEIGHT_DESKTOP = 46;
export const MIN_INPUT_HEIGHT = isWeb ? MIN_INPUT_HEIGHT_DESKTOP : MIN_INPUT_HEIGHT_MOBILE;

function isValidWindowHeight(windowHeight: number): boolean {
  return Number.isFinite(windowHeight) && windowHeight > 0;
}

export function resolveDefaultComposerMaxHeight(windowHeight: number): number {
  if (!isValidWindowHeight(windowHeight)) return DEFAULT_MAX_INPUT_HEIGHT;
  return Math.max(DEFAULT_MAX_INPUT_HEIGHT, Math.floor(windowHeight * DEFAULT_MAX_VIEWPORT_RATIO));
}

function resolveManualMaxViewportBound(windowHeight: number): number | null {
  if (!isValidWindowHeight(windowHeight)) return null;
  return Math.floor(windowHeight * MANUAL_MAX_VIEWPORT_RATIO);
}

/**
 * Clamp a manual composer height to the drag bounds: never below the one-line
 * input height, never above the viewport bound. Applied at render time, so a
 * window resize clamps visually while the stored value keeps the user's number.
 */
export function clampManualHeight(args: {
  value: number;
  windowHeight: number;
  minInputHeight: number;
}): number {
  const { value, windowHeight, minInputHeight } = args;
  const viewportMax = resolveManualMaxViewportBound(windowHeight);
  const upperBound = viewportMax === null ? value : Math.max(viewportMax, minInputHeight);
  return Math.min(Math.max(value, minInputHeight), upperBound);
}

/**
 * The box follows the pointer 1:1: dragging up from the composer's current
 * visual height adds empty space, dragging down compresses it.
 */
export function dragManualHeight(args: {
  startHeight: number;
  startY: number;
  currentY: number;
  windowHeight: number;
  minInputHeight: number;
}): number {
  const { startHeight, startY, currentY, windowHeight, minInputHeight } = args;
  return clampManualHeight({
    value: startHeight + (startY - currentY),
    windowHeight,
    minInputHeight,
  });
}

interface ComposerManualHeightState {
  /**
   * Manual composer height in px. Session-global (every composer in the app
   * shares it) and in-memory only: `null` means default auto-grow, restored by
   * a reload.
   */
  height: number | null;
  setHeight: (height: number | null) => void;
}

export const useComposerManualHeightStore = create<ComposerManualHeightState>()((set) => ({
  height: null,
  setHeight: (height) => set({ height }),
}));
