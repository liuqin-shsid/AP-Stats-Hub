/* 通用绘图模块 —— 数据进、SVG 字符串出，不读页面状态也不碰 DOM。
   几何尺寸由调用方用 geom 传入，所以同一套函数能画大图也能画小图。

   目前由「自定义数据」页使用；display-categorical / display-quantitative /
   compare-distributions 三页仍各自保留着自己的那份实现，尚未迁移过来。 */

const Charts = (() => {
  const DEF = { W: 560, H: 360, M: { left: 62, right: 20, top: 22, bottom: 72 } };
  const g = o => ({ ...DEF, ...o, M: { ...DEF.M, ...(o && o.M) } });

  const colorOf = i => i < 5 ? `var(--cat-${i + 1})` : 'var(--cat-other)';
  const sum = a => a.reduce((s, v) => s + v, 0);
  const pctOf = (x, base) => base ? (x / base) * 100 : 0;
  const fmtPct = v => v.toFixed(1) + '%';
  const decimalsFor = step => step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step)));

  /* 刻度步长取 1/2/2.5/5 × 10^k，保证刻度是好读的整数 */
  function niceStep(rawMax) {
    const pow = Math.pow(10, Math.floor(Math.log10(rawMax || 1)));
    return [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => rawMax / s <= 5) || 10 * pow;
  }
  function niceTop(rawMax, isPct) {
    if (isPct) {
      const top = Math.min(100, Math.ceil(rawMax / 10) * 10);
      return { top, step: top <= 20 ? 5 : top <= 50 ? 10 : 20 };
    }
    const step = niceStep(rawMax);
    return { top: Math.ceil(rawMax / step) * step || 1, step };
  }

  /* 顶端 4px 圆角、底端贴基线的竖条 */
  function barPath(x, y, w, h, r = 4) {
    if (h <= 0.5) return '';
    const rr = Math.min(r, w / 2, h);
    return `M ${x} ${y + h} V ${y + rr} Q ${x} ${y} ${x + rr} ${y} H ${x + w - rr} Q ${x + w} ${y} ${x + w} ${y + rr} V ${y + h} Z`;
  }

  const X = (v, lo, hi, G) => G.M.left + (G.W - G.M.right - G.M.left) * (v - lo) / ((hi - lo) || 1);

  /* 纵轴：网格线 + 刻度 + 轴标题。返回 { svg, top } —— top 是画条形要用的同一个轴顶。 */
  function axisY(rawMax, label, G, isPct) {
    const { top, step } = niceTop(rawMax, isPct);
    let s = '';
    for (let v = 0; v <= top + 1e-9; v += step) {
      const y = G.M.top + (G.H - G.M.bottom - G.M.top) * (1 - v / top);
      s += `<line class="grid" x1="${G.M.left}" y1="${y}" x2="${G.W - G.M.right}" y2="${y}"/>` +
           `<text class="val-label" x="${G.M.left - 9}" y="${y + 4}" text-anchor="end">${Number.isInteger(step) ? v : v.toFixed(1)}${isPct ? '%' : ''}</text>`;
    }
    s += `<line class="baseline" x1="${G.M.left}" y1="${G.H - G.M.bottom}" x2="${G.W - G.M.right}" y2="${G.H - G.M.bottom}"/>`;
    s += `<text class="axis-title" transform="translate(16 ${(G.M.top + G.H - G.M.bottom) / 2}) rotate(-90)" text-anchor="middle">${escapeHtml(label)}</text>`;
    return { svg: s, top };
  }

  /* 连续型横轴：等距刻度 + 轴标题 */
  function axisX(lo, hi, label, G) {
    const step = niceStep((hi - lo) / 5), d = decimalsFor(step);
    let s = '';
    for (let x = Math.ceil(lo / step) * step; x <= hi + 1e-9; x += step) {
      const p = X(x, lo, hi, G);
      s += `<line class="tickmark" x1="${p}" y1="${G.H - G.M.bottom}" x2="${p}" y2="${G.H - G.M.bottom + 5}"/>` +
           `<text class="val-label" x="${p}" y="${G.H - G.M.bottom + 19}" text-anchor="middle">${x.toFixed(d)}</text>`;
    }
    s += `<text class="axis-title" x="${(G.M.left + G.W - G.M.right) / 2}" y="${G.H - 10}" text-anchor="middle">${escapeHtml(label)}</text>`;
    return s;
  }

  /* 类别名太长就断成两行，避免互相叠字 */
  function catLabel(text, cx, y) {
    const s = String(text);
    if (s.length <= 9) return `<text class="cat-label" x="${cx}" y="${y}" text-anchor="middle">${escapeHtml(s)}</text>`;
    const cut = s.lastIndexOf('/') + 1 || Math.ceil(s.length / 2);
    return `<text class="cat-label" x="${cx}" y="${y}" text-anchor="middle">${escapeHtml(s.slice(0, cut))}</text>` +
           `<text class="cat-label" x="${cx}" y="${y + 15}" text-anchor="middle">${escapeHtml(s.slice(cut))}</text>`;
  }

  /* ---------- 分箱 ---------- */
  function binChoices(range) {
    const out = [];
    for (let k = -3; k <= 6; k++)
      for (const m of [1, 2, 2.5, 5]) out.push(+(m * Math.pow(10, k)).toPrecision(4));
    return out.filter(w => range / w >= 2 && range / w <= 60).sort((a, b) => a - b);
  }
  const defaultBin = (choices, range) =>
    choices.reduce((best, w) => Math.abs(range / w - 12) < Math.abs(range / best - 12) ? w : best, choices[0]);

  /* 起点对齐到组距的整数倍，和 TI 的 Xmin/Xscl 习惯一致 */
  function histogram(values, w) {
    const lo = Math.floor(Math.min(...values) / w) * w;
    const hi = Math.ceil(Math.max(...values) / w) * w;
    const k = Math.max(1, Math.round((hi - lo) / w));
    const bins = Array.from({ length: k }, (_, i) => ({ lo: lo + i * w, hi: lo + (i + 1) * w, n: 0 }));
    for (const v of values) {
      let i = Math.floor((v - lo) / w);
      if (i >= k) i = k - 1;                       // 最大值落在右端点上
      if (i < 0) i = 0;
      bins[i].n++;
    }
    return { bins, lo, hi, k };
  }

  /* ---------- 分类数据 ---------- */
  function bar({ values, labels, axisLabel, pct, geom }) {
    const G = g(geom);
    const ax = axisY(Math.max(...values), axisLabel, G, pct);
    const band = (G.W - G.M.left - G.M.right) / values.length;
    let s = ax.svg;
    values.forEach((v, i) => {
      const w = band * 0.58;                       // 条形之间留空隙：分类数据的条是分开的
      const x = G.M.left + band * i + (band - w) / 2;
      const y = G.M.top + (G.H - G.M.bottom - G.M.top) * (1 - v / ax.top);
      s += `<path class="bar" fill="${colorOf(i)}" d="${barPath(x, y, w, G.H - G.M.bottom - y)}">` +
           `<title>${escapeHtml(labels[i])}: ${pct ? fmtPct(v) : v}</title></path>`;
      s += `<text class="val-label" x="${G.M.left + band * i + band / 2}" y="${y - 6}" text-anchor="middle">${pct ? fmtPct(v) : v}</text>`;
      s += catLabel(labels[i], G.M.left + band * i + band / 2, G.H - G.M.bottom + 21);
    });
    return s;
  }

  function pie({ values, labels, geom }) {
    const G = g(geom);
    const n = sum(values), cx = G.W / 2, cy = G.H / 2 - 6, r = Math.min(G.H, G.W) / 2 - 46;
    const nonZero = values.filter(v => v > 0).length;
    let a0 = -Math.PI / 2, s = '';
    values.forEach((v, i) => {
      if (!v) return;
      const a1 = a0 + (v / n) * Math.PI * 2;
      const big = a1 - a0 > Math.PI ? 1 : 0;
      const p = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      s += nonZero === 1
        ? `<circle class="slice" fill="${colorOf(i)}" cx="${cx}" cy="${cy}" r="${r}"><title>${escapeHtml(labels[i])}: ${v}</title></circle>`
        : `<path class="slice" fill="${colorOf(i)}" d="M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${big} 1 ${x1} ${y1} Z">` +
          `<title>${escapeHtml(labels[i])}: ${v} (${fmtPct(pctOf(v, n))})</title></path>`;
      if (v / n > 0.04) {
        const [lx, ly] = p((a0 + a1) / 2);
        s += `<text class="pie-label" x="${cx + (lx - cx) * 0.68}" y="${cy + (ly - cy) * 0.68 + 4}" text-anchor="middle">${fmtPct(pctOf(v, n))}</text>`;
      }
      a0 = a1;
    });
    return s;
  }

  /* 并排条形图：每个行类别一组，组内按列类别排开 */
  function grouped({ matrix, rowLabels, colLabels, axisLabel, pct, geom }) {
    const G = g(geom);
    const ax = axisY(Math.max(...matrix.flat()), axisLabel, G, pct);
    const band = (G.W - G.M.left - G.M.right) / matrix.length;
    let s = ax.svg;
    matrix.forEach((row, i) => {
      const inner = band * 0.74 / row.length;
      row.forEach((v, j) => {
        const x = G.M.left + band * i + band * 0.13 + inner * j;
        const y = G.M.top + (G.H - G.M.bottom - G.M.top) * (1 - v / ax.top);
        s += `<path class="bar" fill="${colorOf(j)}" d="${barPath(x, y, Math.max(1, inner - 2), G.H - G.M.bottom - y)}">` +
             `<title>${escapeHtml(rowLabels[i])} · ${escapeHtml(colLabels[j])}: ${pct ? fmtPct(v) : v}</title></path>`;
        if (row.length <= 4)
          s += `<text class="val-label" x="${x + (inner - 2) / 2}" y="${y - 5}" text-anchor="middle" font-size="11">${pct ? fmtPct(v) : v}</text>`;
      });
      s += catLabel(rowLabels[i], G.M.left + band * i + band / 2, G.H - G.M.bottom + 21);
    });
    return s;
  }

  /* 分段条形图：每根条拉到 100%，按条件分布切段 */
  function segmented({ matrix, rowLabels, colLabels, pctAxisLabel, geom }) {
    const G = g(geom);
    const ax = axisY(100, pctAxisLabel, G, true);
    const band = (G.W - G.M.left - G.M.right) / matrix.length;
    let s = ax.svg;
    matrix.forEach((row, i) => {
      const n = sum(row), bw = band * 0.52, x = G.M.left + band * i + (band - bw) / 2;
      let acc = 0;
      row.forEach((v, j) => {
        const p0 = pctOf(acc, n), p1 = pctOf(acc + v, n);
        const y1 = G.M.top + (G.H - G.M.bottom - G.M.top) * (1 - p1 / 100);
        const y0 = G.M.top + (G.H - G.M.bottom - G.M.top) * (1 - p0 / 100);
        s += `<rect class="bar" fill="${colorOf(j)}" x="${x}" y="${y1}" width="${bw}" height="${Math.max(0, y0 - y1)}">` +
             `<title>${escapeHtml(rowLabels[i])} · ${escapeHtml(colLabels[j])}: ${fmtPct(pctOf(v, n))}</title></rect>`;
        if (p1 - p0 > 6)
          s += `<text class="val-label" x="${x + bw / 2}" y="${(y0 + y1) / 2 + 4}" text-anchor="middle" fill="#fff">${fmtPct(pctOf(v, n))}</text>`;
        acc += v;
      });
      s += catLabel(rowLabels[i], G.M.left + band * i + band / 2, G.H - G.M.bottom + 21);
    });
    return s;
  }

  /* ---------- 定量数据 ---------- */
  function hist({ values, binW, pct, yLabel, xLabel, geom, color = 0 }) {
    const G = g(geom);
    const { bins, lo, hi } = histogram(values, binW);
    const n = values.length;
    const ys = bins.map(b => pct ? pctOf(b.n, n) : b.n);
    const ax = axisY(Math.max(...ys), yLabel, G, pct);
    let s = ax.svg + axisX(lo, hi, xLabel, G);
    const bw = (G.W - G.M.right - G.M.left) / bins.length;
    const d = decimalsFor(binW);
    bins.forEach((b, i) => {
      if (!b.n) return;                            // 空组不画：直方图的空隙必须代表「这里没有数据」
      const h = (G.H - G.M.bottom - G.M.top) * (ys[i] / ax.top);
      s += `<rect class="hist-bar" fill="${colorOf(color)}" x="${G.M.left + bw * i}" y="${G.H - G.M.bottom - h}" width="${bw}" height="${h}">` +
           `<title>[${b.lo.toFixed(d)}, ${b.hi.toFixed(d)})　${b.n}　${fmtPct(pctOf(b.n, n))}</title></rect>`;
    });
    return s;
  }

  function dot({ values, binW, yLabel, xLabel, geom }) {
    const G = g(geom);
    const { bins, lo, hi } = histogram(values, binW);
    const maxStack = Math.max(...bins.map(b => b.n));
    const ax = axisY(maxStack, yLabel, G);
    let s = ax.svg + axisX(lo, hi, xLabel, G);
    const bw = (G.W - G.M.right - G.M.left) / bins.length;
    const r = Math.max(1.5, Math.min(bw / 2.6, (G.H - G.M.bottom - G.M.top) / (2.2 * Math.max(maxStack, 1))));
    const d = decimalsFor(binW);
    bins.forEach((b, i) => {
      const cx = G.M.left + bw * i + bw / 2;
      for (let k = 0; k < b.n; k++)
        s += `<circle class="dot" cx="${cx}" cy="${G.H - G.M.bottom - r - k * 2 * r}" r="${r}"/>`;
      if (b.n) s += `<rect x="${G.M.left + bw * i}" y="${G.M.top}" width="${bw}" height="${G.H - G.M.bottom - G.M.top}" fill="transparent">` +
                    `<title>[${b.lo.toFixed(d)}, ${b.hi.toFixed(d)})　${b.n}</title></rect>`;
    });
    return s;
  }

  /* 累积相对频数曲线（肩形图）：点画在每组的右端点上 */
  function ogive({ values, binW, yLabel, xLabel, geom }) {
    const G = g(geom);
    const { bins, lo, hi } = histogram(values, binW);
    const n = values.length;
    const ax = axisY(100, yLabel, G, true);
    let s = ax.svg + axisX(lo, hi, xLabel, G);
    const Y = p => G.M.top + (G.H - G.M.bottom - G.M.top) * (1 - p / ax.top);
    const pts = [[X(lo, lo, hi, G), Y(0)]];
    let acc = 0;
    const d = decimalsFor(binW);
    bins.forEach(b => { acc += b.n; pts.push([X(b.hi, lo, hi, G), Y(pctOf(acc, n))]); });
    s += `<polyline class="ogive-line" fill="none" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
    acc = 0;
    bins.forEach(b => {
      acc += b.n;
      s += `<circle class="ogive-dot" cx="${X(b.hi, lo, hi, G)}" cy="${Y(pctOf(acc, n))}" r="3.5">` +
           `<title>≤ ${b.hi.toFixed(d)}　${acc} / ${n}　${fmtPct(pctOf(acc, n))}</title></circle>`;
    });
    return s;
  }

  /* 箱线图。横轴只标五数概括这五个值；标签挤到一起时自动换行，
     所以高度是算出来的 —— 返回 { svg, h }。 */
  function box({ values, xLabel, geom, color = 0 }) {
    const G = g(geom);
    const f = fiveNumber(values);
    const pad = (f.max - f.min) * 0.05 || 1;
    const lo = f.min - pad, hi = f.max + pad;
    const d = Math.max(1, decimalsFor(Math.abs(f.iqr || 1) / 10));
    const inside = f.sorted.filter(v => v >= f.lowerFence && v <= f.upperFence);
    const wLo = inside.length ? inside[0] : f.q1, wHi = inside.length ? inside[inside.length - 1] : f.q3;
    const outs = f.sorted.filter(v => v < f.lowerFence || v > f.upperFence);

    // 先排一遍刻度看要几行，再据此定高度
    const marks = [f.min, f.q1, f.median, f.q3, f.max].map(v => ({ v, x: X(v, lo, hi, G) })).sort((a, b) => a.x - b.x);
    const edges = [];
    const rows = marks.map(m => {
      const half = m.v.toFixed(d).length * 3.4 + 3;
      let row = edges.findIndex(e => m.x - half > e);
      if (row < 0) { row = edges.length; edges.push(-Infinity); }
      edges[row] = m.x + half;
      return row;
    });
    const H = G.H + (edges.length - 1) * 13;
    const GG = { ...G, H };
    const x = v => X(v, lo, hi, GG);
    const cy = GG.M.top + (G.H - G.M.bottom - G.M.top) / 2;
    const half = 26;

    let s = `<line class="baseline" x1="${GG.M.left}" y1="${H - GG.M.bottom}" x2="${GG.W - GG.M.right}" y2="${H - GG.M.bottom}"/>`;
    marks.forEach((m, i) => {
      s += `<line class="tickmark" x1="${m.x}" y1="${H - GG.M.bottom}" x2="${m.x}" y2="${H - GG.M.bottom + 5}"/>` +
           `<text class="val-label" x="${m.x}" y="${H - GG.M.bottom + 17 + rows[i] * 13}" text-anchor="middle">${m.v.toFixed(d)}</text>`;
    });
    s += `<text class="axis-title" x="${(GG.M.left + GG.W - GG.M.right) / 2}" y="${H - 6}" text-anchor="middle">${escapeHtml(xLabel)}</text>`;
    s += `<line class="box-whisker" x1="${x(wLo)}" y1="${cy}" x2="${x(f.q1)}" y2="${cy}"/>` +
         `<line class="box-whisker" x1="${x(f.q3)}" y1="${cy}" x2="${x(wHi)}" y2="${cy}"/>` +
         `<line class="box-whisker" x1="${x(wLo)}" y1="${cy - 11}" x2="${x(wLo)}" y2="${cy + 11}"/>` +
         `<line class="box-whisker" x1="${x(wHi)}" y1="${cy - 11}" x2="${x(wHi)}" y2="${cy + 11}"/>`;
    s += `<rect class="box-body" fill="${colorOf(color)}" fill-opacity=".25" stroke="${colorOf(color)}" ` +
         `x="${x(f.q1)}" y="${cy - half}" width="${Math.max(1, x(f.q3) - x(f.q1))}" height="${half * 2}">` +
         `<title>Q₁ ${f.q1.toFixed(d)}　M ${f.median.toFixed(d)}　Q₃ ${f.q3.toFixed(d)}　IQR ${f.iqr.toFixed(d)}</title></rect>`;
    s += `<line class="box-median" x1="${x(f.median)}" y1="${cy - half}" x2="${x(f.median)}" y2="${cy + half}"/>`;
    for (const v of outs) s += `<circle class="box-outlier" cx="${x(v)}" cy="${cy}" r="3.5"><title>${v.toFixed(d)}</title></circle>`;
    return { svg: s, h: H, outliers: outs.length };
  }

  /* 并排箱线图：若干组共用一条数轴 */
  function boxGroups({ groups, xLabel, geom }) {
    const G = g(geom);
    const all = groups.flatMap(gr => gr.values);
    const pad = (Math.max(...all) - Math.min(...all)) * 0.05 || 1;
    const lo = Math.min(...all) - pad, hi = Math.max(...all) + pad;
    const d = 1;
    const band = (G.H - G.M.bottom - G.M.top) / groups.length;
    const x = v => X(v, lo, hi, G);
    let s = `<line class="baseline" x1="${G.M.left}" y1="${G.H - G.M.bottom}" x2="${G.W - G.M.right}" y2="${G.H - G.M.bottom}"/>`
          + axisX(lo, hi, xLabel, G);
    groups.forEach((grp, i) => {
      const f = fiveNumber(grp.values);
      const cy = G.M.top + band * i + band / 2 + 7;
      const half = Math.min(22, band / 2 - 15);
      const inside = f.sorted.filter(v => v >= f.lowerFence && v <= f.upperFence);
      const wLo = inside.length ? inside[0] : f.q1, wHi = inside.length ? inside[inside.length - 1] : f.q3;
      s += `<text class="cat-label" x="${G.M.left}" y="${cy - half - 7}">${escapeHtml(grp.label)}</text>`;
      s += `<line class="box-whisker" x1="${x(wLo)}" y1="${cy}" x2="${x(f.q1)}" y2="${cy}"/>` +
           `<line class="box-whisker" x1="${x(f.q3)}" y1="${cy}" x2="${x(wHi)}" y2="${cy}"/>` +
           `<line class="box-whisker" x1="${x(wLo)}" y1="${cy - 9}" x2="${x(wLo)}" y2="${cy + 9}"/>` +
           `<line class="box-whisker" x1="${x(wHi)}" y1="${cy - 9}" x2="${x(wHi)}" y2="${cy + 9}"/>`;
      s += `<rect class="box-body" fill="${colorOf(i)}" fill-opacity=".25" stroke="${colorOf(i)}" ` +
           `x="${x(f.q1)}" y="${cy - half}" width="${Math.max(1, x(f.q3) - x(f.q1))}" height="${half * 2}">` +
           `<title>${escapeHtml(grp.label)}　Q₁ ${f.q1.toFixed(d)}　M ${f.median.toFixed(d)}　Q₃ ${f.q3.toFixed(d)}　IQR ${f.iqr.toFixed(d)}</title></rect>`;
      s += `<line class="box-median" x1="${x(f.median)}" y1="${cy - half}" x2="${x(f.median)}" y2="${cy + half}"/>`;
      for (const v of f.sorted.filter(v => v < f.lowerFence || v > f.upperFence))
        s += `<circle class="box-outlier" cx="${x(v)}" cy="${cy}" r="3.5"><title>${v.toFixed(d)}</title></circle>`;
    });
    return s;
  }

  /* ---------- 茎叶图（返回 HTML，不是 SVG） ---------- */
  /* 所有取位都在整数空间里做 —— 直接用 (x − stem×10)/leaf 会被浮点误差坑到，
     例如 9.2 − 9 = 0.19999… 会算出叶 1 而不是 2。 */
  function dataPrecision(v) {
    let unit = 1;
    while (unit > 1e-4 && !v.every(x => Math.abs(x / unit - Math.round(x / unit)) < 1e-6)) unit /= 10;
    return unit;
  }
  function stemSpec(v) {
    const lo = Math.min(...v), hi = Math.max(...v);
    let leaf = dataPrecision(v);
    for (; leaf <= 1e8; leaf *= 10) {
      const stemSize = leaf * 10;
      const stems = Math.floor(hi / stemSize) - Math.floor(lo / stemSize) + 1;
      if (stems > 25) continue;                    // 茎太多 → 叶单位再放大一级
      const split = stems >= 5 ? 1 : (stems * 2 >= 5 ? 2 : 5);
      return { leaf, stemSize, split };
    }
    return { leaf, stemSize: leaf * 10, split: 1 };
  }
  function stem({ values, readTpl, crowdedNote, negNote }) {
    const all = values, v = values.filter(x => x >= 0);   // 负值无法用茎叶表示
    if (v.length < 2) return '—';
    const { leaf, stemSize, split } = stemSpec(v);
    const per = 10 / split;
    const rows = new Map();
    for (const x of v) {
      const scaled = Math.round(x / leaf), st = Math.floor(scaled / 10), d = scaled - st * 10;
      const key = st * 10 + Math.floor(d / per);
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(d);
    }
    const keys = [...rows.keys()].sort((a, b) => b - a);  // 大的在上，与教材一致
    const width = Math.max(...keys.map(k => String(Math.floor(k / 10)).length));
    const body = keys.map(k => `${String(Math.floor(k / 10)).padStart(width)} | ${rows.get(k).sort((a, b) => a - b).join('')}`).join('\n');
    const d0 = rows.get(keys[0]).slice().sort((a, b) => a - b)[0], st0 = Math.floor(keys[0] / 10);
    const read = (readTpl || '{k} | {d} = {v}').replace('{k}', st0).replace('{d}', d0)
      .replace('{v}', (st0 * stemSize + d0 * leaf).toFixed(decimalsFor(leaf)));
    const dropped = all.length - v.length;
    const crowded = Math.max(...keys.map(k => rows.get(k).length)) > 80;
    return `${body}\n\n${read}`
      + (dropped && negNote ? `\n${negNote.replace('{n}', dropped)}` : '')
      + (crowded && crowdedNote ? `\n\n${crowdedNote}` : '');
  }

  /* 背靠背茎叶图：茎在中间一列，两组的叶向两侧生长。
     用表格而不是 <pre> —— 组名含中文（全角）时等宽字体也对不齐。 */
  function backToBackStem({ groups, stemLabel, readTpl }) {
    const all = groups.flatMap(g => g.values).filter(x => x >= 0);
    if (all.length < 2) return '—';
    const { leaf, stemSize } = stemSpec(all);
    const bucket = vals => {
      const m = new Map();
      for (const x of vals.filter(x => x >= 0)) {
        const sc = Math.round(x / leaf), st = Math.floor(sc / 10);
        if (!m.has(st)) m.set(st, []);
        m.get(st).push(sc - st * 10);
      }
      return m;
    };
    const L = bucket(groups[0].values), R = bucket(groups[1].values);
    const stems = [...new Set([...L.keys(), ...R.keys()])].sort((a, b) => a - b);
    const leftStr = s => (L.get(s) || []).sort((a, b) => b - a).join('');   // 左侧从茎往外读，越外越大
    const rightStr = s => (R.get(s) || []).sort((a, b) => a - b).join('');
    const body = stems.map(st =>
      `<tr><td class="leaf-left">${leftStr(st)}</td><td class="stem-col">${st}</td><td class="leaf-right">${rightStr(st)}</td></tr>`).join('');
    const s0 = [...stems].reverse().find(st => rightStr(st).length) ?? stems[0];
    const d0 = Number((rightStr(s0) || leftStr(s0) || '0')[0]);
    const read = (readTpl || '{k} | {d} = {v}').replace('{k}', s0).replace('{d}', d0)
      .replace('{v}', (s0 * stemSize + d0 * leaf).toFixed(decimalsFor(leaf)));
    return `<table class="stem-table"><thead><tr><th>${escapeHtml(groups[0].label)}</th>` +
      `<th class="stem-col">${escapeHtml(stemLabel)}</th><th>${escapeHtml(groups[1].label)}</th></tr></thead>` +
      `<tbody>${body}</tbody></table><p class="panel-note">${escapeHtml(read)}</p>`;
  }

  return { bar, pie, grouped, segmented, hist, dot, ogive, box, boxGroups, stem, backToBackStem,
           binChoices, defaultBin, histogram, colorOf, decimalsFor, sum, pctOf, fmtPct, DEF };
})();
