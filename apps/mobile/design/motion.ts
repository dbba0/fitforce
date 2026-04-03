export const motion = {
  duration: {
    fast: 120,
    normal: 220,
    slow: 340,
  },
  easing: {
    pressScale: 0.97,
  },
  spring: {
    snappy: {
      damping: 16,
      stiffness: 320,
      mass: 0.72,
    },
    smooth: {
      damping: 18,
      stiffness: 220,
      mass: 0.82,
    },
  },
} as const;
