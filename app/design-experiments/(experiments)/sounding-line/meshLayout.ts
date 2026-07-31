// The lattice: a circular hex disc.
//
// Round, not rectangular, and that is load-bearing rather than decorative. Rotation
// preserves a peak's radius, so on a rectangular mesh a peak that sits comfortably
// near the left edge swings clean off the front of the map when you turn it —
// leaving its marker floating over empty space. A disc is the only shape rotation
// cannot carry anything out of.
//
// It also happens to be what the thing wants to look like: under camera tilt a
// circular world renders as an ellipse, which is exactly how a round table reads in
// perspective.

export const CELL_SIZE = 30;
export const ROW_SPACING = CELL_SIZE * (Math.sqrt(3) / 2);

const MARGIN_X = 60;
const HEADER_CLEARANCE = 150;
const FOOTER_CLEARANCE = 120;
// Cap so the disc stays a table rather than filling the viewport. Tilt compresses
// it vertically, so this reads much wider than tall on screen.
const MAX_RADIUS = 340;

export type GridPoint = { x: number; y: number };

export type Mesh = {
  points: GridPoint[];
  edges: [number, number][];
  cx: number;
  cy: number;
  radius: number;
};

export function meshGrid(W: number, H: number): Mesh {
  const cx = W / 2;
  const cy = (HEADER_CLEARANCE + (H - FOOTER_CLEARANCE)) / 2;
  const radius = Math.max(
    120,
    Math.min(MAX_RADIUS, W / 2 - MARGIN_X, (H - HEADER_CLEARANCE - FOOTER_CLEARANCE) / 2 + 90),
  );

  // Build the full hex grid over the disc's bounding box, then keep what falls
  // inside. Indices are remapped so edges only ever reference kept nodes.
  const cols = Math.ceil((radius * 2) / CELL_SIZE) + 2;
  const rows = Math.ceil((radius * 2) / ROW_SPACING) + 2;
  const x0 = cx - radius - CELL_SIZE;
  const y0 = cy - radius - ROW_SPACING;

  const points: GridPoint[] = [];
  const index = new Int32Array(cols * rows).fill(-1);
  const r2 = radius * radius;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = x0 + col * CELL_SIZE + (row % 2) * (CELL_SIZE / 2);
      const y = y0 + row * ROW_SPACING;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      index[row * cols + col] = points.length;
      points.push({ x, y });
    }
  }

  const at = (r: number, c: number) =>
    r < 0 || r >= rows || c < 0 || c >= cols ? -1 : index[r * cols + c];

  const edges: [number, number][] = [];
  const link = (a: number, b: number) => {
    if (a >= 0 && b >= 0) edges.push([a, b]);
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const a = at(row, col);
      if (a < 0) continue;
      link(a, at(row, col + 1));
      if (row % 2 === 0) {
        link(a, at(row + 1, col - 1));
        link(a, at(row + 1, col));
      } else {
        link(a, at(row + 1, col));
        link(a, at(row + 1, col + 1));
      }
    }
  }

  return { points, edges, cx, cy, radius };
}
