import { Variants } from "framer-motion"

export const easings = {
  expoOut: [0.16, 1, 0.3, 1] as const,
  smooth: [0.65, 0, 0.35, 1] as const,
}

export const durations = {
  fast: 0.25,
  base: 0.6,
  slow: 1.1,
}

export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.base,
      ease: easings.expoOut,
    },
  },
}

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.94,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.base,
      ease: easings.expoOut,
    },
  },
}

export const maskReveal: Variants = {
  hidden: {
    y: "105%",
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: durations.base,
      ease: easings.expoOut,
    },
  },
}

export const glitchIn: Variants = {
  hidden: {
    opacity: 0,
    filter: "blur(12px)",
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    transition: {
      duration: durations.base,
      ease: easings.expoOut,
    },
  },
}

export const staggerContainer = (staggerChildren = 0.06, delayChildren = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
})
