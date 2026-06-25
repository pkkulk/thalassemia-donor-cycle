/**
 * Shared Framer Motion variants for the HemoLink web dashboard.
 * Import these in any page/component for consistent animations.
 */

import type { Variants } from "framer-motion";

// ── Page-level container: stagger children
export const pageVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

// ── Individual item: fade + slide up
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

// ── Card: scale up slightly while fading in
export const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

// ── Hero / page header: slide in from left
export const heroVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

// ── Slide in from right (for side panels, charts)
export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

// ── Fast fade (for badges, pills, small elements)
export const fadePop: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: "backOut" },
  },
};

// ── List container that staggers rows
export const listVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

// ── Individual list row
export const rowVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

// ── Stat number counter animation (use with useMotionValue + animate)
export const statCounterTransition = {
  duration: 1.2,
  ease: "easeOut",
};

// ── Hover / tap presets (pass directly as whileHover / whileTap props)
export const hoverLift = { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,.10)" };
export const hoverLiftDark = { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,.35)" };
export const tapShrink = { scale: 0.97, opacity: 0.9 };

// ── Sidebar slide-in from left
export const sidebarVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

// ── Soft panel entrance used for shell surfaces and sections
export const panelVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

// ── Slow floating motion for ambient decoration
export const ambientFloatVariants: Variants = {
  initial: { opacity: 0.3, y: 0 },
  animate: {
    opacity: [0.22, 0.34, 0.22],
    y: [0, -10, 0],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ── Dropdown / popover motion for compact controls
export const popoverVariants: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },
};
