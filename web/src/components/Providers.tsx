"use client";

import { MotionConfig } from "motion/react";

/** Every Motion animation respects the user's reduced-motion setting: transforms off, fades kept. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
