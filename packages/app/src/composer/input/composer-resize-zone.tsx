// The drag-to-resize composer ceiling is a pointer affordance: web and Electron
// desktop only. Native composers keep the intrinsic auto-grow height
// (see height.native.ts); Metro loads this stub instead of the .web implementation.
export function ComposerResizeZone() {
  return null;
}
