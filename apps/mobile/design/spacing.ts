export const spacing = {
  0: 0,
  1: 8,
  2: 16,
  3: 24,
  4: 32,
  5: 40,
  6: 48,
  7: 56,
  8: 64,
} as const;

export const layout = {
  screenPadding: spacing[2],
  sectionGap: spacing[3],
  cardGap: spacing[2],
} as const;
