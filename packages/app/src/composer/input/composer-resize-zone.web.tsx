import { useCallback, useEffect, useRef, useState } from "react";
import { View, type PointerEvent as RNPointerEvent, useWindowDimensions } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  MIN_INPUT_HEIGHT,
  composerRuntimeHeightRef,
  dragCeiling,
  resolveDefaultComposerMaxHeight,
  useComposerCeilingStore,
} from "./ceiling";

const ZONE_HEIGHT = 10;

interface DragStart {
  pointerId: number;
  pointerY: number;
  startCeiling: number;
}

/**
 * Full-width drag zone across the composer card's top edge. Dragging adjusts
 * the session-global composer ceiling: the max height the input grows to
 * before it scrolls. The ns-resize cursor is the affordance.
 */
export function ComposerResizeZone() {
  const { height: windowHeight } = useWindowDimensions();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<DragStart | null>(null);
  const windowHeightRef = useRef(windowHeight);
  windowHeightRef.current = windowHeight;

  useEffect(() => {
    if (!isDragging) return;

    function handlePointerMove(moveEvent: PointerEvent) {
      const dragStart = dragStartRef.current;
      if (!dragStart || moveEvent.pointerId !== dragStart.pointerId) return;
      moveEvent.preventDefault();
      useComposerCeilingStore.getState().setCeiling(
        dragCeiling({
          startCeiling: dragStart.startCeiling,
          startY: dragStart.pointerY,
          currentY: moveEvent.clientY,
          windowHeight: windowHeightRef.current,
          minInputHeight: MIN_INPUT_HEIGHT,
        }),
      );
    }

    function handlePointerUp(upEvent: PointerEvent) {
      const dragStart = dragStartRef.current;
      if (!dragStart || upEvent.pointerId !== dragStart.pointerId) return;
      dragStartRef.current = null;
      setIsDragging(false);
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      // Restore the cursor if the zone unmounts mid-drag (e.g. tab switch).
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging]);

  const startDrag = useCallback((event: RNPointerEvent) => {
    const zoneElement = event.currentTarget as unknown as HTMLElement | null;
    const pointerId = event.nativeEvent.pointerId;
    // Start from the composer's realized style height, not the stored ceiling:
    // when the text fits below the ceiling the two differ, and starting from
    // the ceiling adds a dead band before the box visibly responds.
    dragStartRef.current = {
      pointerId,
      pointerY: event.nativeEvent.clientY,
      startCeiling:
        composerRuntimeHeightRef.current ??
        useComposerCeilingStore.getState().ceiling ??
        resolveDefaultComposerMaxHeight(windowHeightRef.current),
    };
    setIsDragging(true);
    document.body.style.cursor = "ns-resize";
    event.preventDefault();
    event.stopPropagation();
    zoneElement?.setPointerCapture?.(pointerId);
  }, []);

  return (
    <View
      testID="composer-resize-zone"
      style={[styles.zone, ZONE_POINTER_STYLE]}
      onPointerDown={startDrag}
    />
  );
}

// RN's CursorValue only types 'auto' | 'pointer'; directional cursors need a cast
// (same as resize-handle.tsx).
const ZONE_POINTER_STYLE = {
  cursor: "ns-resize",
  touchAction: "none",
} as object;

const styles = StyleSheet.create({
  zone: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ZONE_HEIGHT,
    zIndex: 10,
  },
});
