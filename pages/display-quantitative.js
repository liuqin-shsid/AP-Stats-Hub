/* 定量数据的展示（教材 Ch4）
   频数表 / 相对频数表 + 直方图（组距可调）、点图、茎叶图、累积频率曲线、箱线图。
   每份数据展示哪几种图由 displays 决定（见 tools/datasets.quantitative.js）—— 点图和
   茎叶图只适合小数据量，所以不是每份数据都给。所有图直接显示，不需要点击切换。 */
(() => {
  Object.assign(translations.zh, {
    quant_title: '定量数据的展示',
    quant_desc: '拖动组距滑杆，看同一份数据如何讲出不同的故事；并用中心与离散程度概括它。',
    quant_dataset: '选择数据集', quant_show: '数值显示',
    quant_freq: '频数', quant_relfreq: '相对频数 (%)',
    quant_binwidth: '组距', quant_bins: '组数',
    chart_hist: '直方图', chart_dot: '点图', chart_stem: '茎叶图',
    chart_ogive: '累积频率曲线（肩形图）', chart_box: '箱线图',
    quant_markers: '标出均值与中位数',
    quant_n: '个数 n', quant_mean: '均值 x̄', quant_median: '中位数 M', quant_sd: '样本标准差 s',
    quant_min: '最小值', quant_q1: 'Q₁', quant_q3: 'Q₃', quant_max: '最大值',
    quant_range: '全距', quant_iqr: '四分位距 IQR',
    quant_hint: '组距决定了直方图的样子：太宽会抹平细节，太窄会被随机波动淹没。教材提醒——选组距需要练习，多试几个再下结论。',
    quant_stem_note: '读法：{k} | {d} 表示 {v}',
    quant_mean_label: '均值', quant_median_label: '中位数',
    quant_stem_crowded: '提示：某一行的叶太多，这张茎叶图已经读不出形状了。教材说茎叶图适合「几百个以内」的数据——这种规模改看直方图更合适。',
    quant_ogive_y: '累积相对频数 (%)',
    quant_box_note: '须线只画到围栏以内最远的数据点；围栏本身（Q₁ − 1.5×IQR 与 Q₃ + 1.5×IQR）不画出来，超出围栏的点单独标出。',
    quant_outliers: '离群点',
  });
  Object.assign(translations.en, {
    quant_title: 'Displaying Quantitative Data',
    quant_desc: 'Drag the bin-width slider to see how one batch of data can tell different stories; then summarize its center and spread.',
    quant_dataset: 'Dataset', quant_show: 'Show as',
    quant_freq: 'Count', quant_relfreq: 'Relative frequency (%)',
    quant_binwidth: 'Bin width', quant_bins: 'Bins',
    chart_hist: 'Histogram', chart_dot: 'Dotplot', chart_stem: 'Stem-and-leaf',
    chart_ogive: 'Ogive (cumulative relative frequency)', chart_box: 'Boxplot',
    quant_markers: 'Mark mean and median',
    quant_n: 'Count n', quant_mean: 'Mean x̄', quant_median: 'Median M', quant_sd: 'Sample SD s',
    quant_min: 'Min', quant_q1: 'Q₁', quant_q3: 'Q₃', quant_max: 'Max',
    quant_range: 'Range', quant_iqr: 'IQR',
    quant_hint: 'The bin width decides what the histogram looks like: too wide hides the detail, too narrow drowns it in noise. As the text says — choosing a bin width takes practice, so try several before drawing conclusions.',
    quant_stem_note: 'Read as: {k} | {d} means {v}',
    quant_mean_label: 'Mean', quant_median_label: 'Median',
    quant_stem_crowded: 'Note: one line carries too many leaves for the shape to be readable. The text recommends stem-and-leaf for batches of fewer than a few hundred values — at this size, use the histogram instead.',
    quant_ogive_y: 'Cumulative relative frequency (%)',
    quant_box_note: 'Whiskers reach only the most extreme values inside the fences. The fences themselves (Q₁ − 1.5×IQR and Q₃ + 1.5×IQR) are not drawn; points beyond them are shown individually.',
    quant_outliers: 'Outliers',
  });

  const DATA = (window.APSTATS_DATA || {}).display?.quantitative;
  const W = 560, H = 320, M = { left: 58, right: 20, top: 18, bottom: 54 };
  const BOX_H = 200;   // 基准高度；刻度标签换行时会自动加高                                  // 箱线图矮一些
  const state = { ds: null, rel: false, binW: null, markers: true };

  const set = () => DATA.sets[state.ds];
  const vals = () => set().values;
  const varName = () => set().variable[lang];
  const range = () => Math.max(...vals()) - Math.min(...vals());

  const decimalsFor = step => step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step)));
  const fmtN = (v, d) => Number.isFinite(v) ? v.toFixed(d) : '—';

  /* ---------- 组距与分箱 ---------- */
  function binChoices(r) {
    const out = [];
    for (let k = -3; k <= 6; k++)
      for (const m of [1, 2, 2.5, 5]) out.push(+(m * Math.pow(10, k)).toPrecision(4));
    return out.filter(w => r / w >= 2 && r / w <= 60).sort((a, b) => a - b);
  }
  const defaultBin = (choices, r) =>
    choices.reduce((best, w) => Math.abs(r / w - 12) < Math.abs(r / best - 12) ? w : best, choices[0]);

  function histogram(values, w) {
    const lo = Math.floor(Math.min(...values) / w) * w;
    const hi = Math.ceil(Math.max(...values) / w) * w;
    const k = Math.max(1, Math.round((hi - lo) / w));
    const bins = Array.from({ length: k }, (_, i) => ({ lo: lo + i * w, hi: lo + (i + 1) * w, n: 0 }));
    for (const v of values) {
      let i = Math.floor((v - lo) / w);
      if (i >= k) i = k - 1;                          // 最大值落在右端点上
      if (i < 0) i = 0;
      bins[i].n++;
    }
    return { bins, lo, hi };
  }

  /* ---------- 界面 ---------- */
  function buildUI() {
    const t = translations[lang];
    $('quantPage').innerHTML = `
      <div class="page-heading"><div>
        <h1 data-i18n="quant_title">${escapeHtml(t.quant_title)}</h1>
        <p data-i18n="quant_desc">${escapeHtml(t.quant_desc)}</p>
      </div></div>
      <section class="controls" data-i18n-aria="controls_aria">
        <label><span data-i18n="quant_dataset">${escapeHtml(t.quant_dataset)}</span><select id="quantDataset"></select></label>
        <label><span data-i18n="quant_show">${escapeHtml(t.quant_show)}</span><select id="quantShow"></select></label>
        <label class="check"><input id="quantMarkers" type="checkbox" ${state.markers ? 'checked' : ''}>
          <span data-i18n="quant_markers">${escapeHtml(t.quant_markers)}</span></label>
      </section>
      <p id="quantNote" class="hint"></p>
      <section class="bin-control">
        <label for="quantBin" data-i18n="quant_binwidth">${escapeHtml(t.quant_binwidth)}</label>
        <input id="quantBin" type="range" min="0" max="1" step="1" value="0">
        <output id="quantBinOut"></output>
      </section>
      <section id="quantStats" class="quant-stats" aria-live="polite"></section>
      <div id="quantCharts" class="chart-pair"></div>
      <p id="quantHint" class="hint"></p>`;

    syncDataset();
    $('quantDataset').addEventListener('change', e => { state.ds = e.target.value; state.binW = null; syncBin(); render(); });
    $('quantShow').addEventListener('change', e => { state.rel = e.target.value === 'rel'; render(); });
    $('quantMarkers').addEventListener('change', e => { state.markers = e.target.checked; render(); });
    $('quantBin').addEventListener('input', e => { state.binW = binChoices(range())[Number(e.target.value)]; render(); });
    syncShow();
    syncBin();
  }
  /* 下拉文字要跟着语言重新标注，否则切英文后还是中文 */
  function syncDataset() {
    setOptions($('quantDataset'), DATA.order, state.ds, id => DATA.sets[id].name[lang]);
    $('quantDataset').value = state.ds;
  }
  function syncShow() {
    const t = translations[lang];
    $('quantShow').innerHTML = `<option value="freq">${escapeHtml(t.quant_freq)}</option><option value="rel">${escapeHtml(t.quant_relfreq)}</option>`;
    $('quantShow').value = state.rel ? 'rel' : 'freq';
  }
  function syncBin() {
    const choices = binChoices(range());
    if (state.binW === null || !choices.includes(state.binW)) state.binW = defaultBin(choices, range());
    $('quantBin').max = String(choices.length - 1);
    $('quantBin').value = String(choices.indexOf(state.binW));
  }

  /* ---------- 概括统计量 ---------- */
  function renderStats(f, ms) {
    const t = translations[lang];
    const d = Math.max(decimalsFor(state.binW), range() < 10 ? 1 : 0);
    const cell = (k, val) => `<div><span>${escapeHtml(t[k])}</span><strong>${val}</strong></div>`;
    $('quantStats').innerHTML =
      cell('quant_n', f.n) + cell('quant_mean', fmtN(ms.mean, d + 2)) +
      cell('quant_median', fmtN(f.median, d + 1)) + cell('quant_sd', fmtN(ms.sd, d + 2)) +
      cell('quant_range', fmtN(f.max - f.min, d + 1)) + cell('quant_iqr', fmtN(f.iqr, d + 1)) +
      cell('quant_min', fmtN(f.min, d + 1)) + cell('quant_q1', fmtN(f.q1, d + 1)) +
      cell('quant_q3', fmtN(f.q3, d + 1)) + cell('quant_max', fmtN(f.max, d + 1));
  }

  /* ---------- 坐标轴 ---------- */
  const niceStep = rawMax => {
    const pow = Math.pow(10, Math.floor(Math.log10(rawMax || 1)));
    return [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => rawMax / s <= 5) || 10 * pow;
  };
  const X = (v, lo, hi) => M.left + (W - M.right - M.left) * (v - lo) / ((hi - lo) || 1);

  function xTicks(xLo, xHi, h) {
    const xs = niceStep((xHi - xLo) / 5), d = decimalsFor(xs);
    let g = '';
    for (let x = Math.ceil(xLo / xs) * xs; x <= xHi + 1e-9; x += xs) {
      const pxv = X(x, xLo, xHi);
      g += `<line class="tickmark" x1="${pxv}" y1="${h - M.bottom}" x2="${pxv}" y2="${h - M.bottom + 5}"/>` +
           `<text class="val-label" x="${pxv}" y="${h - M.bottom + 19}" text-anchor="middle">${x.toFixed(d)}</text>`;
    }
    return g;
  }
  function axes(xLo, xHi, yMax, yLabel, pctY = false) {
    const step = pctY ? 25 : niceStep(yMax), top = pctY ? 100 : Math.ceil(yMax / step) * step;
    let g = '';
    for (let y = 0; y <= top + 1e-9; y += step) {
      const py = M.top + (H - M.bottom - M.top) * (1 - y / top);
      g += `<line class="grid" x1="${M.left}" y1="${py}" x2="${W - M.right}" y2="${py}"/>` +
           `<text class="val-label" x="${M.left - 8}" y="${py + 4}" text-anchor="end">${Number.isInteger(step) ? y : y.toFixed(1)}${pctY ? '%' : ''}</text>`;
    }
    g += `<line class="baseline" x1="${M.left}" y1="${H - M.bottom}" x2="${W - M.right}" y2="${H - M.bottom}"/>`;
    g += xTicks(xLo, xHi, H);
    g += `<text class="axis-title" x="${(M.left + W - M.right) / 2}" y="${H - 10}" text-anchor="middle">${escapeHtml(varName())}</text>`;
    g += `<text class="axis-title" transform="translate(13 ${(M.top + H - M.bottom) / 2}) rotate(-90)" text-anchor="middle">${escapeHtml(yLabel)}</text>`;
    return { svg: g, top };
  }
  function markers(xLo, xHi, f, ms) {
    if (!state.markers) return '';
    const t = translations[lang];
    const line = (v, cls, label, dy) =>
      `<line class="${cls}" x1="${X(v, xLo, xHi)}" y1="${M.top}" x2="${X(v, xLo, xHi)}" y2="${H - M.bottom}"/>` +
      `<text class="marker-label ${cls}-text" x="${X(v, xLo, xHi) + 4}" y="${M.top + dy}">${escapeHtml(label)}</text>`;
    return line(f.median, 'marker-median', t.quant_median_label, 12) +
           line(ms.mean, 'marker-mean', t.quant_mean_label, 27);
  }

  /* ---------- 各种图 ---------- */
  function drawHist(bins, lo, hi, n, f, ms) {
    const t = translations[lang];
    const ys = bins.map(b => state.rel ? (b.n / n) * 100 : b.n);
    const ax = axes(lo, hi, Math.max(...ys), state.rel ? t.quant_relfreq : t.quant_freq);
    const bw = (W - M.right - M.left) / bins.length, d = decimalsFor(state.binW);
    let g = ax.svg;
    bins.forEach((b, i) => {
      if (!b.n) return;                               // 空组不画 —— 直方图的空隙必须代表「这里没有数据」
      const hgt = (H - M.bottom - M.top) * (ys[i] / ax.top);
      g += `<rect class="hist-bar" x="${M.left + bw * i}" y="${H - M.bottom - hgt}" width="${bw}" height="${hgt}">` +
           `<title>[${b.lo.toFixed(d)}, ${b.hi.toFixed(d)})　${b.n}　${((b.n / n) * 100).toFixed(1)}%</title></rect>`;
    });
    return g + markers(lo, hi, f, ms);
  }

  function drawDot(bins, lo, hi, f, ms) {
    const t = translations[lang];
    const maxStack = Math.max(...bins.map(b => b.n));
    const ax = axes(lo, hi, maxStack, t.quant_freq);
    const bw = (W - M.right - M.left) / bins.length;
    const r = Math.max(1.5, Math.min(bw / 2.6, (H - M.bottom - M.top) / (2.2 * Math.max(maxStack, 1))));
    const d = decimalsFor(state.binW);
    let g = ax.svg;
    bins.forEach((b, i) => {
      const cx = M.left + bw * i + bw / 2;
      for (let k = 0; k < b.n; k++)
        g += `<circle class="dot" cx="${cx}" cy="${H - M.bottom - r - k * 2 * r}" r="${r}"/>`;
      if (b.n) g += `<rect x="${M.left + bw * i}" y="${M.top}" width="${bw}" height="${H - M.bottom - M.top}" fill="transparent">` +
                    `<title>[${b.lo.toFixed(d)}, ${b.hi.toFixed(d)})　${b.n}</title></rect>`;
    });
    return g + markers(lo, hi, f, ms);
  }

  /* 累积频率曲线：点画在每组右端点上（「到这里为止累计了多少」），折线相连 */
  function drawOgive(bins, lo, hi, n) {
    const t = translations[lang];
    const ax = axes(lo, hi, 100, t.quant_ogive_y, true);
    const Y = p => M.top + (H - M.bottom - M.top) * (1 - p / 100);
    const d = decimalsFor(state.binW);
    let acc = 0;
    const pts = [[lo, 0]];
    for (const b of bins) { acc += b.n; pts.push([b.hi, (acc / n) * 100]); }
    let g = ax.svg;
    g += `<polyline class="ogive-line" points="${pts.map(([x, p]) => `${X(x, lo, hi)},${Y(p)}`).join(' ')}"/>`;
    for (const [x, p] of pts)
      g += `<circle class="ogive-dot" cx="${X(x, lo, hi)}" cy="${Y(p)}" r="3"><title>≤ ${x.toFixed(d)}　${p.toFixed(1)}%</title></circle>`;
    return g;
  }

  /* 箱线图的横轴只标五数概括这五个值——常规等距刻度在这里只会让图变乱。
     两个标签靠得太近时，后一个挪到第二行，避免叠字。 */
  function fiveNumberTicks(f, lo, hi, h, d) {
    const marks = [f.min, f.q1, f.median, f.q3, f.max]
      .map(v => ({ v, x: X(v, lo, hi) }))
      .sort((a, b) => a.x - b.x);
    // 每行各自记住上一个标签的右边界，挑第一个放得下的行。
    // 只在两行之间交替是不够的：连续三个标签都挤时，第三个会转回第一行撞上第一个。
    // 行数按需增加（最多 5 行＝每个标签各占一行），画布高度随之自适应。
    const rightEdge = [];
    let g = '';
    for (const m of marks) {
      const label = m.v.toFixed(d);
      const halfW = label.length * 3.4 + 3;          // 估算标签半宽
      let row = rightEdge.findIndex(e => m.x - halfW > e);
      if (row < 0) { row = rightEdge.length; rightEdge.push(-Infinity); }
      rightEdge[row] = m.x + halfW;
      g += `<line class="tickmark" x1="${m.x}" y1="${h - M.bottom}" x2="${m.x}" y2="${h - M.bottom + 5}"/>` +
           `<text class="val-label" x="${m.x}" y="${h - M.bottom + 17 + row * 13}" text-anchor="middle">${label}</text>`;
    }
    return { svg: g, rows: Math.max(1, rightEdge.length) };
  }

  /* 箱线图（教材 Ch5 的画法）：
     盒子 Q₁–Q₃、中位数一条线；围栏 Q₁−1.5×IQR 与 Q₃+1.5×IQR 只用于判定、不画出来；
     须线延伸到围栏以内最远的数据点；超出围栏的点单独画出。 */
  function drawBox(f) {
    const t = translations[lang];
    const pad = (f.max - f.min) * 0.04 || 1;
    const lo = f.min - pad, hi = f.max + pad;
    const inside = f.sorted.filter(v => v >= f.lowerFence && v <= f.upperFence);
    const whiskLo = inside.length ? inside[0] : f.q1;
    const whiskHi = inside.length ? inside[inside.length - 1] : f.q3;
    const outliers = f.sorted.filter(v => v < f.lowerFence || v > f.upperFence);
    const d = Math.max(decimalsFor(state.binW), 1);
    const x = v => X(v, lo, hi);
    // 先排一遍刻度看要几行，再据此定高度 —— 强偏的数据五个数会挤在一起，要换行
    const rows = fiveNumberTicks(f, lo, hi, BOX_H, d).rows;
    const h = BOX_H + (rows - 1) * 13;
    const ticks = fiveNumberTicks(f, lo, hi, h, d);
    const cy = M.top + (h - M.bottom - (rows - 1) * 13 - M.top) / 2, half = 30;
    let g = `<line class="baseline" x1="${M.left}" y1="${h - M.bottom}" x2="${W - M.right}" y2="${h - M.bottom}"/>`;
    g += ticks.svg;
    g += `<text class="axis-title" x="${(M.left + W - M.right) / 2}" y="${h - 4}" text-anchor="middle">${escapeHtml(varName())}</text>`;
    g += `<line class="box-whisker" x1="${x(whiskLo)}" y1="${cy}" x2="${x(f.q1)}" y2="${cy}"/>` +
         `<line class="box-whisker" x1="${x(f.q3)}" y1="${cy}" x2="${x(whiskHi)}" y2="${cy}"/>` +
         `<line class="box-whisker" x1="${x(whiskLo)}" y1="${cy - 11}" x2="${x(whiskLo)}" y2="${cy + 11}"/>` +
         `<line class="box-whisker" x1="${x(whiskHi)}" y1="${cy - 11}" x2="${x(whiskHi)}" y2="${cy + 11}"/>`;
    g += `<rect class="box-body" x="${x(f.q1)}" y="${cy - half}" width="${Math.max(1, x(f.q3) - x(f.q1))}" height="${half * 2}">` +
         `<title>Q₁ ${f.q1.toFixed(d)}　M ${f.median.toFixed(d)}　Q₃ ${f.q3.toFixed(d)}　IQR ${f.iqr.toFixed(d)}</title></rect>`;
    g += `<line class="box-median" x1="${x(f.median)}" y1="${cy - half}" x2="${x(f.median)}" y2="${cy + half}"/>`;
    for (const v of outliers)
      g += `<circle class="box-outlier" cx="${x(v)}" cy="${cy}" r="3.5"><title>${escapeHtml(t.quant_outliers)}: ${v.toFixed(d)}</title></circle>`;
    if (outliers.length)
      g += `<text class="val-label" x="${W - M.right}" y="${M.top + 12}" text-anchor="end">${escapeHtml(t.quant_outliers)}: ${outliers.length}</text>`;
    return { svg: g, h };
  }

  /* ---------- 茎叶图 ---------- */
  function stemSpec(v) {
    const lo = Math.min(...v), hi = Math.max(...v);
    let unit = 1;
    while (unit > 1e-4 && !v.every(x => Math.abs(x / unit - Math.round(x / unit)) < 1e-6)) unit /= 10;
    for (let leaf = unit; leaf <= 1e8; leaf *= 10) {
      const stemSize = leaf * 10;
      const stems = Math.floor(hi / stemSize) - Math.floor(lo / stemSize) + 1;
      if (stems > 25) continue;
      return { leaf, stemSize, split: stems >= 5 ? 1 : (stems * 2 >= 5 ? 2 : 5) };
    }
    return { leaf: unit, stemSize: unit * 10, split: 1 };
  }
  function drawStem() {
    const t = translations[lang];
    const all = vals(), v = all.filter(x => x >= 0);
    if (v.length < 2) return '—';
    const { leaf, stemSize, split } = stemSpec(v);
    const per = 10 / split;
    const rows = new Map();
    for (const x of v) {
      const scaled = Math.round(x / leaf);            // 整数空间取位，避开浮点误差
      const stem = Math.floor(scaled / 10), dg = scaled - stem * 10;
      const key = stem * 10 + Math.floor(dg / per);
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(dg);
    }
    const keys = [...rows.keys()].sort((a, b) => b - a);
    const width = Math.max(...keys.map(k => String(Math.floor(k / 10)).length));
    const body = keys.map(k =>
      `${String(Math.floor(k / 10)).padStart(width)} | ${rows.get(k).sort((a, b) => a - b).join('')}`).join('\n');
    const d0 = rows.get(keys[0]).slice().sort((a, b) => a - b)[0], stem0 = Math.floor(keys[0] / 10);
    const note = t.quant_stem_note.replace('{k}', stem0).replace('{d}', d0)
      .replace('{v}', (stem0 * stemSize + d0 * leaf).toFixed(decimalsFor(leaf)));
    const dropped = all.length - v.length;
    const crowded = Math.max(...keys.map(k => rows.get(k).length)) > 80;
    return `${body}\n\n${note}`
      + (dropped ? `\n${lang === 'zh' ? `（已略去 ${dropped} 个负值）` : `(${dropped} negative value(s) omitted)`}` : '')
      + (crowded ? `\n\n${t.quant_stem_crowded}` : '');
  }

  /* ---------- 渲染 ---------- */
  function render() {
    const t = translations[lang], v = vals(), n = v.length;
    const f = fiveNumber(v), ms = meanSd(v);
    const { bins, lo, hi } = histogram(v, state.binW);
    const d = decimalsFor(state.binW);

    $('quantNote').textContent = set().note[lang];
    $('quantHint').textContent = t.quant_hint;
    $('quantBinOut').textContent = `${state.binW.toFixed(d)}　(${t.quant_bins} ${bins.length})`;
    renderStats(f, ms);

    const panel = (title, inner, extra = '') =>
      `<section class="chart-panel"><h2>${escapeHtml(title)}</h2>${inner}${extra}</section>`;
    const svgOf = (key, body, h = H) =>
      `<svg class="cat-chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="${escapeHtml(varName() + ' — ' + t['chart_' + key])}">${body}</svg>`;

    $('quantCharts').innerHTML = (set().displays || ['hist']).map(kind => {
      switch (kind) {
        case 'hist':  return panel(t.chart_hist,  svgOf('hist', drawHist(bins, lo, hi, n, f, ms)));
        case 'dot':   return panel(t.chart_dot,   svgOf('dot', drawDot(bins, lo, hi, f, ms)));
        case 'ogive': return panel(t.chart_ogive, svgOf('ogive', drawOgive(bins, lo, hi, n)));
        case 'box': { const b = drawBox(f);
                      return panel(t.chart_box, svgOf('box', b.svg, b.h),
                                   `<p class="panel-note">${escapeHtml(t.quant_box_note)}</p>`); }
        case 'stem':  return panel(t.chart_stem,  `<pre class="stem-plot">${escapeHtml(drawStem())}</pre>`);
        default:      return '';
      }
    }).join('');
  }

  /* ---------- 启动 ---------- */
  if (!DATA || !DATA.order.length) return;
  state.ds = DATA.order[0];
  buildUI();
  render();
  document.addEventListener('apstats:tool', e => { if (e.detail === 'quantitative') render(); });
  document.addEventListener('apstats:language', () => { syncDataset(); syncShow(); render(); });
})();
