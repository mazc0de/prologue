/** Spacing used when appending or rebalancing fractional positions. */
export const POSITION_STEP = 1000

/** Below this gap between neighbours, a list should be rebalanced. */
const MIN_GAP = 1e-6

/**
 * Position for an item dropped between `before` and `after` (either may be missing).
 * Only the moved row is written.
 */
export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return POSITION_STEP
  if (before === undefined) return after! - POSITION_STEP
  if (after === undefined) return before + POSITION_STEP
  return (before + after) / 2
}

export function positionAfterLast(positions: number[]): number {
  return positions.length === 0 ? POSITION_STEP : Math.max(...positions) + POSITION_STEP
}

/** True when the gap around `position` has become too small to split again. */
export function needsRebalance(before: number | undefined, position: number, after: number | undefined): boolean {
  return (
    (before !== undefined && Math.abs(position - before) < MIN_GAP) ||
    (after !== undefined && Math.abs(after - position) < MIN_GAP)
  )
}

/** Evenly spaced positions for `count` items. */
export function rebalancedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_STEP)
}
