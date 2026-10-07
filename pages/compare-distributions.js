/* 比较分布（教材 Ch5）
   同一份数据、同一对分组，用三种方式对比：
   并排箱线图 / 两张同刻度的直方图 / 背靠背茎叶图。
   所有图直接显示，不需要点击切换。 */
(() => {
  Object.assign(translations.zh, {
    cmp_title: '比较分布',
    cmp_desc: '同一份数据、同样两组，换三种画法对比——看中心、离散程度、形状和离群点分别怎么显现出来。',
    cmp_binwidth: '组距', cmp_bins: '组数',
    cmp_box: '并排箱线图', cmp_hist: '同刻度直方图对比', cmp_stem: '背靠背茎叶图',
    cmp_stat_group: '组', cmp_n: 'n', cmp_mean: '均值 x̄', cmp_median: '中位数 M', cmp_sd: '样本标准差 s',
    cmp_min: '最小值', cmp_q1: 'Q₁', cmp_q3: 'Q₃', cmp_max: '最大值', cmp_iqr: 'IQR', cmp_range: '全距',
    cmp_box_note: '两个盒子画在同一条数轴上，中心、四分位距与离群点一眼可比。须线只到围栏（Q₁ − 1.5×IQR 与 Q₃ + 1.5×IQR）以内最远的点，围栏本身不画；超出围栏的点单独标出。',
    cmp_hist_note: '两张图使用完全相同的横轴与纵轴刻度——这是教材强调的前提，刻度不同就没法直接比。',
    cmp_stem_note_1: '茎在中间一列，两组的叶分别往两边长。左边那组从茎往外读（越往左越大）。',
    cmp_stem_read: '读法：茎 {k}、叶 {d} 表示 {v}',
    cmp_outliers: '离群点',
  });
  Object.assign(translations.en, {
    cmp_title: 'Comparing Distributions',
    cmp_desc: 'One batch of data, the same two groups, shown three ways — see how center, spread, shape and outliers each come through.',
    cmp_binwidth: 'Bin width', cmp_bins: 'Bins',
    cmp_box: 'Side-by-side boxplots', cmp_hist: 'Histograms on one scale', cmp_stem: 'Back-to-back stem-and-leaf',
    cmp_stat_group: 'Group', cmp_n: 'n', cmp_mean: 'Mean x̄', cmp_median: 'Median M', cmp_sd: 'Sample SD s',
    cmp_min: 'Min', cmp_q1: 'Q₁', cmp_q3: 'Q₃', cmp_max: 'Max', cmp_iqr: 'IQR', cmp_range: 'Range',
    cmp_box_note: 'Both boxes share one axis, so centers, IQRs and outliers compare at a glance. Whiskers reach only the most extreme values inside the fences (Q₁ − 1.5×IQR and Q₃ + 1.5×IQR); the fences are not drawn, and points beyond them are shown individually.',
    cmp_hist_note: 'Both histograms use exactly the same horizontal and vertical scales — the text insists on this, because histograms on different scales cannot be compared.',
    cmp_stem_note_1: 'The stems run down the middle and each group’s leaves grow outward. Read the left group outward from the stem (values increase leftward).',
    cmp_stem_read: 'Read as: stem {k}, leaf {d} means {v}',
    cmp_outliers: 'Outliers',
  });

  const DATA = (window.APSTATS_DATA || {}).display?.grouped;
  const W = 560, H = 300, M = { left: 54, right: 20, top: 18, bottom: 54 };
  /* 并排箱线图占满整行，画布同比加宽，让它按约 1:1 渲染而不是被放大两倍 */
  const BOX_W = 1120, BOX_H = 250;
  const state = { ds: null, binW: null };

  const set = () => DATA.sets[state.ds];
  const groups = () => set().groups;
  const gLabel = g => g[lang];
  const varName = () => set().variable[lang];
  const allValues = () => groups().flatMap(g => g.values);
  const range = () => Math.max(...allValues()) - Math.min(...allValues());

  const decimalsFor = step => step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step)));
  const fmtN = (v, d) => Number.isFinite(v) ? v.toFixed(d) : '—';
  const colorOf = i => `var(--cat-${i + 1})`;

  /* ---------- 组距与分箱 ---------- */
  function binChoices(r) {
    const out = [];
    for (let k = -3; k <= 6; k++)
      for (const m of [1, 2, 2.5, 5]) out.push(+(m * Math.pow(10, k)).toPrecision(4));
    return out.filter(w => r / w >= 2 && r / w <= 40).sort((a, b) => a - b);
  }
  const defaultBin = (choices, r) =>
    choices.reduce((best, w) => Math.abs(r / w - 10) < Math.abs(r / best - 10) ? w : best, choices[0]);

  /* 两组共用同一套分箱边界，否则两张直方图无法直接比较 */
  function sharedBins(w) {
    const all = allValues();
    const lo = Math.floor(Math.min(...all) / w) * w;
    const hi = Math.ceil(Math.max(...all) / w) * w;
    const k = Math.max(1, Math.round((hi - lo) / w));
    const counts = groups().map(g => {
      const c = new Array(k).fill(0);
      for (const v of g.values) {
        let i = Math.floor((v - lo) / w);
        if (i >= k) i = k - 1;
        if (i < 0) i = 0;
        c[i]++;
      }
      return c;
    });
    const edges = Array.from({ length: k }, (_, i) => ({ lo: lo + i * w, hi: lo + (i + 1) * w }));
    return { edges, counts, lo, hi, k };
  }

  /* ---------- 界面 ---------- */
  function buildUI() {
    const t = translations[lang];
    $('cmpPage').innerHTML = `
      <div class="page-heading"><div>
        <h1 data-i18n="cmp_title">${escapeHtml(t.cmp_title)}</h1>
        <p data-i18n="cmp_desc">${escapeHtml(t.cmp_desc)}</p>
      </div></div>
      <p id="cmpNote" class="hint"></p>
      <section class="bin-control">
        <label for="cmpBin" data-i18n="cmp_binwidth">${escapeHtml(t.cmp_binwidth)}</label>
        <input id="cmpBin" type="range" min="0" max="1" step="1" value="0">
        <output id="cmpBinOut"></output>
      </section>
      <div id="cmpStats" class="freq-table-wrap"></div>
      <div id="cmpCharts" class="chart-pair"></div>`;
    $('cmpBin').addEventListener('input', e => { state.binW = binChoices(range())[Number(e.target.value)]; render(); });
    syncBin();
  }
  function syncBin() {
    const choices = binChoices(range());
    if (state.binW === null || !choices.includes(state.binW)) state.binW = defaultBin(choices, range());
    $('cmpBin').max = String(choices.length - 1);
    $('cmpBin').value = String(choices.indexOf(state.binW));
  }

  /* ---------- 概括统计量对照表 ---------- */
  function renderStats(stats) {
    const t = translations[lang], d = range() < 10 ? 2 : 1;
    const cols = ['cmp_n', 'cmp_mean', 'cmp_median', 'cmp_sd', 'cmp_min', 'cmp_q1', 'cmp_q3', 'cmp_max', 'cmp_iqr', 'cmp_range'];
    const head = cols.map(c => `<th>${escapeHtml(t[c])}</th>`).join('');
    const body = groups().map((g, i) => {
      const { f, ms } = stats[i];
      return `<tr><th><span class="swatch" style="background:${colorOf(i)}"></span>${escapeHtml(gLabel(g))}</th>` +
        `<td>${f.n}</td><td>${fmtN(ms.mean, d)}</td><td>${fmtN(f.median, d)}</td><td>${fmtN(ms.sd, d)}</td>` +
        `<td>${fmtN(f.min, d)}</td><td>${fmtN(f.q1, d)}</td><td>${fmtN(f.q3, d)}</td><td>${fmtN(f.max, d)}</td>` +
        `<td>${fmtN(f.iqr, d)}</td><td>${fmtN(f.max - f.min, d)}</td></tr>`;
    }).join('');
    $('cmpStats').innerHTML =
      `<p class="freq-caption">${escapeHtml(varName())} · ${escapeHtml(set().groupName[lang])}</p>` +
      `<table class="freq-table"><thead><tr><th class="corner">${escapeHtml(t.cmp_stat_group)}</th>${head}</tr></thead>` +
      `<tbody>${body}</tbody></table>`;
  }

  /* ---------- 画图基础 ---------- */
  const niceStep = rawMax => {
    const pow = Math.pow(10, Math.floor(Math.log10(rawMax || 1)));
    return [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => rawMax / s <= 5) || 10 * pow;
  };
  const X = (v, lo, hi, w = W) => M.left + (w - M.right - M.left) * (v - lo) / ((hi - lo) || 1);
  function xTicks(lo, hi, h, w = W) {
    const xs = niceStep((hi - lo) / (w > 800 ? 8 : 5)), d = decimalsFor(xs);
    let g = '';
    for (let x = Math.ceil(lo / xs) * xs; x <= hi + 1e-9; x += xs) {
      const p = X(x, lo, hi, w);
      g += `<line class="tickmark" x1="${p}" y1="${h - M.bottom}" x2="${p}" y2="${h - M.bottom + 5}"/>` +
           `<text class="val-label" x="${p}" y="${h - M.bottom + 19}" text-anchor="middle">${x.toFixed(d)}</text>`;
    }
    g += `<text class="axis-title" x="${(M.left + w - M.right) / 2}" y="${h - 10}" text-anchor="middle">${escapeHtml(varName())}</text>`;
    return g;
  }

  /* 并排箱线图：两组画在同一条数轴上 */
  function drawBoxes(stats) {
    const t = translations[lang], h = BOX_H;
    const all = allValues();
    const pad = (Math.max(...all) - Math.min(...all)) * 0.04 || 1;
    const lo = Math.min(...all) - pad, hi = Math.max(...all) + pad;
    const d = range() < 10 ? 2 : 1;
    const band = (h - M.bottom - M.top) / groups().length;
    let g = `<line class="baseline" x1="${M.left}" y1="${h - M.bottom}" x2="${BOX_W - M.right}" y2="${h - M.bottom}"/>` + xTicks(lo, hi, h, BOX_W);
    groups().forEach((grp, i) => {
      const f = stats[i].f;
      const cy = M.top + band * i + band / 2 + 7, half = Math.min(22, band / 2 - 15);
      const inside = f.sorted.filter(v => v >= f.lowerFence && v <= f.upperFence);
      const wLo = inside.length ? inside[0] : f.q1, wHi = inside.length ? inside[inside.length - 1] : f.q3;
      const outs = f.sorted.filter(v => v < f.lowerFence || v > f.upperFence);
      const x = v => X(v, lo, hi, BOX_W);
      // 组名标在盒子正上方：左边距放不下中文组名，标在外侧会被截断
      g += `<text class="cat-label" x="${M.left}" y="${cy - half - 7}">${escapeHtml(gLabel(grp))}</text>`;
      g += `<line class="box-whisker" x1="${x(wLo)}" y1="${cy}" x2="${x(f.q1)}" y2="${cy}"/>` +
           `<line class="box-whisker" x1="${x(f.q3)}" y1="${cy}" x2="${x(wHi)}" y2="${cy}"/>` +
           `<line class="box-whisker" x1="${x(wLo)}" y1="${cy - 9}" x2="${x(wLo)}" y2="${cy + 9}"/>` +
           `<line class="box-whisker" x1="${x(wHi)}" y1="${cy - 9}" x2="${x(wHi)}" y2="${cy + 9}"/>`;
      g += `<rect class="box-body" fill="${colorOf(i)}" fill-opacity=".25" stroke="${colorOf(i)}" ` +
           `x="${x(f.q1)}" y="${cy - half}" width="${Math.max(1, x(f.q3) - x(f.q1))}" height="${half * 2}">` +
           `<title>${escapeHtml(gLabel(grp))}　Q₁ ${f.q1.toFixed(d)}　M ${f.median.toFixed(d)}　Q₃ ${f.q3.toFixed(d)}　IQR ${f.iqr.toFixed(d)}</title></rect>`;
      g += `<line class="box-median" x1="${x(f.median)}" y1="${cy - half}" x2="${x(f.median)}" y2="${cy + half}"/>`;
      for (const v of outs)
        g += `<circle class="box-outlier" cx="${x(v)}" cy="${cy}" r="3.5"><title>${escapeHtml(t.cmp_outliers)}: ${v.toFixed(d)}</title></circle>`;
    });
    return g;
  }

  /* 同刻度直方图：两张图共用分箱边界与纵轴上限 */
  function drawHist(ci, bins, yTop) {
    const counts = bins.counts[ci];
    const step = niceStep(yTop), top = Math.ceil(yTop / step) * step;
    let g = '';
    for (let y = 0; y <= top + 1e-9; y += step) {
      const py = M.top + (H - M.bottom - M.top) * (1 - y / top);
      g += `<line class="grid" x1="${M.left}" y1="${py}" x2="${W - M.right}" y2="${py}"/>` +
           `<text class="val-label" x="${M.left - 8}" y="${py + 4}" text-anchor="end">${y}</text>`;
    }
    g += `<line class="baseline" x1="${M.left}" y1="${H - M.bottom}" x2="${W - M.right}" y2="${H - M.bottom}"/>`;
    g += xTicks(bins.lo, bins.hi, H);
    const bw = (W - M.right - M.left) / bins.k;
    const d = decimalsFor(state.binW);
    counts.forEach((n, i) => {
      if (!n) return;                                 // 空组不画 —— 空隙必须代表「这里没有数据」
      const hgt = (H - M.bottom - M.top) * (n / top);
      g += `<rect class="hist-bar" fill="${colorOf(ci)}" stroke="#fff" stroke-width=".6" ` +
           `x="${M.left + bw * i}" y="${H - M.bottom - hgt}" width="${bw}" height="${hgt}">` +
           `<title>[${bins.edges[i].lo.toFixed(d)}, ${bins.edges[i].hi.toFixed(d)})　${n}</title></rect>`;
    });
    return g;
  }

  /* 背靠背茎叶图：茎在中间，两组的叶向两侧生长 */
  function drawBackToBack() {
    const t = translations[lang], gs = groups();
    const all = allValues();
    const lo = Math.min(...all), hi = Math.max(...all);
    // 叶单位从数据精度起步，太宽就放大一级；整数空间取位，避开浮点误差
    let unit = 1;
    while (unit > 1e-4 && !all.every(x => Math.abs(x / unit - Math.round(x / unit)) < 1e-6)) unit /= 10;
    let leaf = unit, stemSize = leaf * 10;
    while (Math.floor(hi / stemSize) - Math.floor(lo / stemSize) + 1 > 25) { leaf *= 10; stemSize = leaf * 10; }

    const stemsOf = v => {
      const m = new Map();
      for (const x of v) {
        const sc = Math.round(x / leaf), st = Math.floor(sc / 10);
        if (!m.has(st)) m.set(st, []);
        m.get(st).push(sc - st * 10);
      }
      return m;
    };
    const L = stemsOf(gs[0].values), R = stemsOf(gs[1].values);
    const stems = [...new Set([...L.keys(), ...R.keys()])].sort((a, b) => a - b);
    const leftStr  = s => (L.get(s) || []).sort((a, b) => b - a).join('');  // 左侧从茎往外读，越外越大
    const rightStr = s => (R.get(s) || []).sort((a, b) => a - b).join('');

    // 用表格而不是 <pre>：组名含中文（全角）时，等宽字体也对不齐
    const rows = stems.map(st =>
      `<tr><td class="leaf-left">${leftStr(st)}</td>` +
      `<td class="stem-col">${st}</td>` +
      `<td class="leaf-right">${rightStr(st)}</td></tr>`).join('');
    const s0 = [...stems].reverse().find(st => rightStr(st).length) ?? stems[0];
    const d0 = Number(rightStr(s0)[0]);
    const read = t.cmp_stem_read.replace('{k}', s0).replace('{d}', d0)
      .replace('{v}', (s0 * stemSize + d0 * leaf).toFixed(decimalsFor(leaf)));
    return `<table class="stem-table"><thead><tr>` +
      `<th>${escapeHtml(gLabel(gs[0]))}</th><th class="stem-col">${escapeHtml(lang === 'zh' ? '茎' : 'Stem')}</th>` +
      `<th>${escapeHtml(gLabel(gs[1]))}</th></tr></thead><tbody>${rows}</tbody></table>` +
      `<p class="panel-note">${escapeHtml(read)}</p>`;
  }

  /* ---------- 渲染 ---------- */
  function render() {
    const t = translations[lang];
    const stats = groups().map(g => ({ f: fiveNumber(g.values), ms: meanSd(g.values) }));
    const bins = sharedBins(state.binW);
    const yTop = Math.max(...bins.counts.flat());
    const d = decimalsFor(state.binW);

    $('cmpNote').textContent = set().note[lang];
    $('cmpBinOut').textContent = `${state.binW.toFixed(d)}　(${t.cmp_bins} ${bins.k})`;
    renderStats(stats);

    const panel = (title, inner, note, span) =>
      `<section class="chart-panel${span ? ' span-2' : ''}"><h2>${escapeHtml(title)}</h2>${inner}` +
      (note ? `<p class="panel-note">${escapeHtml(note)}</p>` : '') + `</section>`;
    const svg = (body, h, label, w = W) =>
      `<svg class="cat-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(label)}">${body}</svg>`;

    $('cmpCharts').innerHTML =
      panel(t.cmp_box, svg(drawBoxes(stats), BOX_H, varName() + ' — ' + t.cmp_box, BOX_W), t.cmp_box_note, true) +
      groups().map((g, i) =>
        panel(`${t.cmp_hist} · ${gLabel(g)}`, svg(drawHist(i, bins, yTop), H, gLabel(g) + ' — ' + t.cmp_hist),
              i === 0 ? t.cmp_hist_note : '')).join('') +
      panel(t.cmp_stem, drawBackToBack(), t.cmp_stem_note_1, true);
  }

  /* ---------- 启动 ---------- */
  if (!DATA || !DATA.order.length) return;
  state.ds = DATA.order[0];
  buildUI();
  render();
  document.addEventListener('apstats:tool', e => { if (e.detail === 'compare') render(); });
  document.addEventListener('apstats:language', () => { render(); });
})();
