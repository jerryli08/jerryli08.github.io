// A shape's target drawing as an inline SVG: the planner's own silhouette.txt (one character per
// lattice cell, '#' = a cube), exactly the mask the shape search started from.
export function silhouetteSvg(lines, { size = 132, label = '' } = {}) {
  const h = lines.length, w = Math.max(...lines.map((l) => l.length));
  const s = Math.min(22, (size - 12) / Math.max(w, h));
  const W = Math.round(w * s + 12), H = Math.round(h * s + 12);
  let sq = '', n = 0;
  lines.forEach((row, y) => [...row].forEach((ch, x) => {
    const on = ch === '#';
    if (on) n++;
    sq += `<rect x="${(6 + x * s + 1).toFixed(1)}" y="${(6 + y * s + 1).toFixed(1)}" width="${(s - 2).toFixed(1)}" height="${(s - 2).toFixed(1)}" rx="${(s * 0.2).toFixed(1)}" fill="${on ? '#ff6b35' : 'rgba(238,233,227,0.06)'}"/>`;
  }));
  const title = label || `Target drawing: ${n} cells`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${title}" style="display:block;max-width:100%;height:auto">${sq}</svg>`;
}
