/* 绘图基础：坐标域、线性映射、刻度与数值格式。所有 SVG 图表共用。 */

/* 取数据范围并留 10% 边距；全部相等时强制撑开 ±1。 */
function domain(values) {
  let lo = Math.min(...values), hi = Math.max(...values);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * .1;
  return [lo - pad, hi + pad];
}

/* 把 v 从数据域 d 线性映射到像素区间 [a,b]。 */
function scale(v, d, a, b) { return a + (v - d[0]) * (b - a) / (d[1] - d[0]); }

/* 按量级选小数位，避免刻度文字过长。 */
function fmt(v) {
  const a = Math.abs(v);
  return a >= 1000 ? v.toFixed(0) : a >= 10 ? v.toFixed(2) : v.toFixed(3);
}

function ticks(lo, hi, count = 6) {
  return Array.from({length: count}, (_, i) => lo + (hi - lo) * i / (count - 1));
}
