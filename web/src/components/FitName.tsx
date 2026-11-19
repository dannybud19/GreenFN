"use client";

import { useEffect, useRef, useState } from "react";

// Doto is monospaced: every character (letter-spacing included) is 0.62 em wide, measured in the browser.
const DOTO_ADVANCE = 0.62;
const SIZES = [30, 26, 22, 18];

/** The font size for a name on one line in `width` px: the largest step that fits, else the minimum (then it truncates). */
export function fitSize(chars: number, width: number): number {
  return SIZES.find((s) => chars * DOTO_ADVANCE * s <= width) ?? SIZES[SIZES.length - 1];
}

/**
 * A player's name in Doto on exactly one line. It shrinks in steps (30, 26, 22, 18 px) to fit the card; if it
 * still does not fit at 18 px it truncates with an ellipsis, and the full name is in the title tooltip. The line
 * height is fixed, so the card is the same height for every player.
 */
export function FitName({ name }: { name: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [width, setWidth] = useState(390);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const size = fitSize(name.length, width);
  return (
    <h2
      ref={ref}
      title={name}
      data-fit-size={size}
      className="dot-heading overflow-hidden text-ellipsis whitespace-nowrap"
      style={{ fontSize: size, lineHeight: "33px", height: 33 }}
    >
      {name}
    </h2>
  );
}
