// Uncontracted (grade 1) English braille, UEB signs: enough to write the word this page embosses.
// Dots are numbered 1, 2, 3 down the left column and 4, 5, 6 down the right.
const L = {
  a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5], h: [1, 2, 5], i: [2, 4], j: [2, 4, 5],
  k: [1, 3], l: [1, 2, 3], m: [1, 3, 4], n: [1, 3, 4, 5], o: [1, 3, 5], p: [1, 2, 3, 4], q: [1, 2, 3, 4, 5], r: [1, 2, 3, 5], s: [2, 3, 4], t: [2, 3, 4, 5],
  u: [1, 3, 6], v: [1, 2, 3, 6], w: [2, 4, 5, 6], x: [1, 3, 4, 6], y: [1, 3, 4, 5, 6], z: [1, 3, 5, 6],
};
/** cells for a word: [{ ch, label, dots, of }] where `of` is the index of the letter the cell belongs to */
export function toBraille(word) {
  const cells = [];
  [...word].forEach((ch, i) => {
    const lo = ch.toLowerCase();
    if (!L[lo]) return;
    if (ch !== lo) cells.push({ ch: '', label: 'Capital sign', dots: [6], of: i });
    cells.push({ ch, label: ch, dots: L[lo], of: i });
  });
  return cells;
}
/** a dot's column (0 left, 1 right) and row (0..2) as read */
export const dotPos = (d) => ({ col: d <= 3 ? 0 : 1, row: (d - 1) % 3 });
/** the Unicode braille character for a cell */
export const unicode = (dots) => String.fromCharCode(0x2800 + dots.reduce((m, d) => m | (1 << (d - 1)), 0));
