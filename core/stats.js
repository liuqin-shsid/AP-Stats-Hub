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
