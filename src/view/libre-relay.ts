// Each pair marks the ends of a horizontal band of white embroidery.
// Letter spacing, slant, counters and the y descender follow the supplied cap.
const letters = {
  l: { top: 0, rows: [
    [11, 28], [11, 27], [10, 26], [8, 25], [7, 24], [6, 23],
    [5, 22], [4, 21], [3, 20], [2, 18], [0, 17]
  ] },
  i: { top: 0, rows: [
    [11, 27], [9, 26], [], [8, 24], [7, 23], [5, 22],
    [4, 21], [4, 19], [2, 18], [1, 17], [0, 16]
  ] },
  b: { top: 0, rows: [
    [11, 27], [10, 26], [9, 25], [8, 24, 28, 46], [7, 52], [6, 22, 40, 56],
    [4, 21, 39, 55], [3, 19, 38, 54], [2, 18, 37, 53], [1, 47], [0, 14, 19, 41]
  ] },
  r: { top: 3, rows: [
    [8, 23, 26, 38], [6, 43], [6, 25, 34, 42], [4, 20], [3, 20], [2, 19],
    [1, 17], [0, 16]
  ] },
  e: { top: 3, rows: [
    [20, 42], [11, 49], [4, 21, 37, 53], [3, 53], [1, 52], [0, 17],
    [4, 45], [9, 39]
  ] },
  a: { top: 3, rows: [
    [22, 46], [11, 51], [6, 21, 38, 55], [21, 53], [6, 31, 36, 53], [1, 17, 35, 51],
    [0, 51], [4, 30, 35, 50]
  ] },
  y: { top: 3, rows: [
    [7, 25, 42, 55], [9, 26, 39, 52], [11, 27, 37, 49], [11, 28, 33, 46], [13, 42], [15, 39],
    [17, 35], [19, 31], [15, 27], [0, 21]
  ] },
} as const;

const wordmark: ReadonlyArray<[keyof typeof letters, number]> = [
  ['l', 0], ['i', 28], ['b', 55], ['r', 115], ['e', 162],
  ['r', 239], ['e', 287], ['l', 344], ['a', 372], ['y', 430],
];

export function drawLibreRelay(ctx: CanvasRenderingContext2D, x: number, y: number,
  width: number, height: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width / 486, height / 82);
  ctx.lineCap = 'round';

  const stitches = new Path2D();
  for (const [letter, left] of wordmark) {
    const {top, rows} = letters[letter];
    rows.forEach((bands, row) => {
      const baseline = 2.4 + (top + row) * 6.4;
      for (let i = 0; i < bands.length; i += 2) {
        stitches.moveTo(left + bands[i] + 2, baseline);
        stitches.lineTo(left + bands[i + 1] - 2, baseline);
      }
    });
  }
  ctx.strokeStyle = '#eaeaf3';
  ctx.lineWidth = 4.6;
  ctx.stroke(stitches);
  ctx.translate(0, -.8);
  ctx.strokeStyle = '#faf9ff';
  ctx.lineWidth = 1.4;
  ctx.stroke(stitches);
  ctx.restore();
}
