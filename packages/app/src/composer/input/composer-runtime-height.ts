/**
 * Bridge between the composer's measured-height system and the web resize
 * zone: a drag must start from the height the layout is actually using (the
 * height-controlled text area), not from the card around it, or downsizing
 * gets a dead band. Entries are keyed by each composer's textarea element so
 * mounted composers don't clobber each other.
 *
 * Plain mutable map on purpose: read once per drag start, never rendered
 * from. `readComposerRuntimeHeight` is the only DOM touchpoint and is only
 * ever called from the web resize zone.
 */
import type { DimensionValue } from "react-native";

const heights = new WeakMap<object, number>();

export function publishComposerRuntimeHeight(args: {
  textarea: HTMLElement | null;
  height: DimensionValue | undefined;
}): void {
  const { textarea, height } = args;
  if (!textarea || typeof height !== "number") return;
  heights.set(textarea, height);
}

export function readComposerRuntimeHeight(card: HTMLElement | null): number | undefined {
  if (!card) return undefined;
  const textarea = card.querySelector("textarea");
  return textarea ? heights.get(textarea) : undefined;
}
