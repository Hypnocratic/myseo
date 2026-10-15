import { useCallback, useEffect, useRef, useState } from "react";
import { View, type PointerEvent as RNPointerEvent, useWindowDimensions } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  MIN_INPUT_HEIGHT,
  dragCeiling,
  resolveDefaultComposerMaxHeight,
  useComposerCeilingStore,
} from "./ceiling";

const ZONE_HEIGHT = 10;
const GRIP_WIDTH = 9;
const GRIP_HEIGHT = 10;
// RN's CursorValue only types 'auto' | 'pointer'; directional cursors need a cast
// (same as resize-handle.tsx).
const ZONE_POINTER_STYLE = {
  cursor: "ns-resize",
  touchAction: "none",
} as object;

interface DragStart {
  pointerId: number;
  pointerY: number;
  startCeiling: number;
}

/**
 * Full-width drag zone across the composer's top edge. Dragging adjusts the
 * session-global composer ceiling: the max height the input grows to before it
 * scrolls. The grip glyph at the top-right is the visual affordance.
 */
export function ComposerResizeZone() {
  const { height: windowHeight } = useWindowDimensions();
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartRef = useRef<DragStart | null>(null);
  const windowHeightRef = useRef(windowHeight);
  windowHeightRef.current = windowHeight;
  const highlighted = isDragging || isHovered;

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
    dragStartRef.current = {
      pointerId,
      pointerY: event.nativeEvent.clientY,
      // A drag from the default height starts at the default ceiling so the
      // first upward move grows past it.
      startCeiling:
        useComposerCeilingStore.getState().ceiling ??
        resolveDefaultComposerMaxHeight(windowHeightRef.current),
    };
    setIsDragging(true);
    document.body.style.cursor = "ns-resize";
    event.preventDefault();
    event.stopPropagation();
    zoneElement?.setPointerCapture?.(pointerId);
  }, []);

  const handlePointerEnter = useCallback(() => setIsHovered(true), []);
  const handlePointerLeave = useCallback(() => setIsHovered(false), []);

  return (
    <View
      testID="composer-resize-zone"
      style={[styles.zone, ZONE_POINTER_STYLE]}
      onPointerDown={startDrag}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <View style={styles.grip}>
        <View style={[styles.line, highlighted && styles.lineHighlighted, { top: 0 }]} />
        <View style={[styles.line, highlighted && styles.lineHighlighted, { top: 8 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  zone: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ZONE_HEIGHT,
    zIndex: 10,
  },
  grip: {
    position: "absolute",
    right: theme.spacing[2],
    top: 0,
    width: GRIP_WIDTH,
    height: GRIP_HEIGHT,
  },
  line: {
    position: "absolute",
    left: 0,
    width: GRIP_WIDTH,
    height: 1,
    borderRadius: 1,
    backgroundColor: theme.colors.border,
    transform: [{ rotate: "-45deg" }],
  },
  lineHighlighted: {
    backgroundColor: theme.colors.accent,
  },
}));
