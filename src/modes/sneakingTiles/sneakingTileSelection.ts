import type { SneakingTileSelection } from "./sneakingTilesConfig"

export function chooseSneakingColumn(
  columnCount: number,
  selection: SneakingTileSelection,
  random: () => number = Math.random,
  excludedColumns: ReadonlySet<number> = new Set(),
): number {
  if (columnCount <= 1) return 0

  const availableColumns = Array.from(
    { length: columnCount },
    (_, column) => column,
  ).filter((column) => !excludedColumns.has(column))
  const candidates =
    availableColumns.length > 0
      ? availableColumns
      : Array.from({ length: columnCount }, (_, column) => column)

  if (selection === "outer") {
    const outerColumns = [0, columnCount - 1].filter((column) =>
      candidates.includes(column),
    )
    const outerCandidates =
      outerColumns.length > 0 ? outerColumns : candidates
    return outerCandidates[
      Math.min(
        Math.floor(random() * outerCandidates.length),
        outerCandidates.length - 1,
      )
    ]!
  }

  return candidates[
    Math.min(
      Math.floor(random() * candidates.length),
      candidates.length - 1,
    )
  ]!
}
