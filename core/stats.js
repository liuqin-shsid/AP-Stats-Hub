/* 统计计算。 */

/* 最小二乘回归。点数不足或某一轴为常数时返回 null（此时 r 未定义）。 */
function regression(points) {
  const n = points.length; if (n < 2) return null;
  const mx = points.reduce((s,p)=>s+p.x,0)/n, my = points.reduce((s,p)=>s+p.y,0)/n;
  let sxx=0, syy=0, sxy=0;
  points.forEach(p=>{const dx=p.x-mx, dy=p.y-my; sxx+=dx*dx; syy+=dy*dy; sxy+=dx*dy;});
  if (!sxx || !syy) return null;
  const slope=sxy/sxx, intercept=my-slope*mx, r=sxy/Math.sqrt(sxx*syy);
  return {slope, intercept, r, r2:r*r};
}

/* ---------- 定量数据的概括统计量 ---------- */
/* 四分位数按教材 p.54 与 TI-83/84 的约定：
   先用中位数把数据劈成两半，n 为奇数时两半都排除中位数，
   再分别取两半的中位数。注意这和 Excel 的 QUARTILE 不是同一种算法，
   本站一律用教材/计算器的这一种，保证学生按计算器能对上。 */
const sortedAsc = values => [...values].sort((a, b) => a - b);

function medianOf(sorted) {
  const n = sorted.length;
  if (!n) return NaN;
  const m = n >> 1;
  return n % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/* 五数概括 + IQR + 1.5×IQR 围栏（围栏只用于判定离群点，不画进箱线图） */
function fiveNumber(values) {
  const s = sortedAsc(values), n = s.length;
  if (!n) return null;
  const half = n >> 1;
  const q1 = medianOf(s.slice(0, half));
  const q3 = medianOf(s.slice(n % 2 ? half + 1 : half));
  const iqr = q3 - q1;
  return { n, min: s[0], q1, median: medianOf(s), q3, max: s[n - 1], iqr,
           lowerFence: q1 - 1.5 * iqr, upperFence: q3 + 1.5 * iqr, sorted: s };
}

/* 样本均值与样本标准差（分母 n − 1，与站内其它页面一致） */
function meanSd(values) {
  const n = values.length;
  if (!n) return { mean: NaN, sd: NaN };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = n < 2 ? NaN : Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  return { mean, sd };
}
