export const ORIGINAL_MAP_GRID = [
  ["0_1", "0_1", "0_1", "0_1", "0_1", "0_1", "0_0", "0_0", "0_0", "0_0"],
  ["2_1", "2_1", "2_1", "2_1", "2_1", "0_1", "0_0", "2_0", "2_0", "2_0"],
  ["2_1", "2_1", "2_1", "2_1", "2_1", "0_1", "0_0", "1_0", "1_0", "2_0"],
  ["2_1", "1_1", "1_1", "0_1", "0_1", "0_1", "0_0", "1_0", "1_0", "2_0"],
  ["2_1", "1_1", "1_1", "0_1", "0_0", "0_0", "0_0", "1_0", "1_0", "2_0"],
  ["2_1", "1_1", "1_1", "0_1", "0_0", "2_0", "2_0", "2_0", "2_0", "2_0"],
  ["2_1", "2_1", "2_1", "0_1", "0_0", "2_0", "2_0", "2_0", "2_0", "2_0"],
  ["0_1", "0_1", "0_1", "0_1", "0_0", "0_0", "0_0", "0_0", "0_0", "0_0"]
];

export const ORIGINAL_PATHS = {
  left: [[8, 0], [7, 0], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [5, 4], [4, 4], [4, 5], [4, 6], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7]],
  right: [[1, 7], [2, 7], [3, 7], [3, 6], [3, 5], [3, 4], [3, 3], [4, 3], [5, 3], [5, 2], [5, 1], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0]]
};

// The product keeps the reference game's complete battlefield, but assigns
// both halves to one player instead of running a second player/controller.
export const PLAYER_MAP_GRID = ORIGINAL_MAP_GRID;
export const PLAYER_PATHS = ORIGINAL_PATHS;

export function originalCellType(row, col) {
  return ORIGINAL_MAP_GRID[col]?.[row] ?? null;
}

export function playerCellType(row, col) {
  const type = PLAYER_MAP_GRID[col]?.[row] ?? null;
  return type?.replace(/_1$/, "_0") ?? null;
}
