/* 定量数据的展示（教材 Ch4）
   直方图（组距可调）、点图、茎叶图，配形状 / 中心 / 离散程度的概括统计量。 */
(() => {
  Object.assign(translations.zh, {
    quant_title: '定量数据的展示',
    quant_desc: '拖动组距滑杆，看同一份数据如何讲出不同的故事；并用中心与离散程度概括它。',
    quant_dataset: '选择数据集', quant_show: '纵轴显示',
    quant_freq: '频数', quant_relfreq: '相对频数 (%)',
    quant_binwidth: '组距', quant_bins: '组数',
    chart_hist: '直方图', chart_dot: '点图', chart_stem: '茎叶图',
    quant_markers: '标出均值与中位数',
    quant_n: '个数 n', quant_mean: '均值 x̄', quant_median: '中位数 M', quant_sd: '样本标准差 s',
    quant_min: '最小值', quant_q1: 'Q₁', quant_q3: 'Q₃', quant_max: '最大值',
    quant_range: '全距', quant_iqr: '四分位距 IQR',
    quant_five: '五数概括', quant_center: '中心', quant_spread: '离散程度',
    quant_hint: '组距决定了直方图的样子：太宽会抹平细节，太窄会被随机波动淹没。教材提醒——选组距需要练习，多试几个再下结论。',
    quant_stem_note: '读法：{k} | {d} 表示 {v}',
    quant_mean_label: '均值', quant_median_label: '中位数',
    quant_dot_dense: '数据点较多，点图已按组距归并后堆叠。',
    quant_stem_crowded: '提示：某一行的叶太多，这张茎叶图已经读不出形状了。教材说茎叶图适合「几百个以内」的数据——这种规模改看直方图更合适。',
    quant_quartile_note: '四分位数按教材与 TI-83/84 的算法：用中位数把数据劈成两半（n 为奇数时两半都排除中位数），再各取中位数。这与 Excel 的 QUARTILE 不同。',
  });
  Object.assign(translations.en, {
    quant_title: 'Displaying Quantitative Data',
    quant_desc: 'Drag the bin-width slider to see how one batch of data can tell different stories; then summarize its center and spread.',
    quant_dataset: 'Dataset', quant_show: 'Vertical axis',
    quant_freq: 'Count', quant_relfreq: 'Relative frequency (%)',
    quant_binwidth: 'Bin width', quant_bins: 'Bins',
    chart_hist: 'Histogram', chart_dot: 'Dotplot', chart_stem: 'Stem-and-leaf',
    quant_markers: 'Mark mean and median',
    quant_n: 'Count n', quant_mean: 'Mean x̄', quant_median: 'Median M', quant_sd: 'Sample SD s',
    quant_min: 'Min', quant_q1: 'Q₁', quant_q3: 'Q₃', quant_max: 'Max',
    quant_range: 'Range', quant_iqr: 'IQR',
    quant_five: '5-number summary', quant_center: 'Center', quant_spread: 'Spread',
    quant_hint: 'The bin width decides what the histogram looks like: too wide hides the detail, too narrow drowns it in noise. As the text says — choosing a bin width takes practice, so try several before drawing conclusions.',
    quant_stem_note: 'Read as: {k} | {d} means {v}',
    quant_mean_label: 'Mean', quant_median_label: 'Median',
    quant_dot_dense: 'With this many values the dots are stacked after grouping by the bin width.',
    quant_stem_crowded: 'Note: one line carries too many leaves for the shape to be readable. The text recommends stem-and-leaf for batches of fewer than a few hundred values — at this size, use the histogram instead.',
    quant_quartile_note: 'Quartiles use the textbook / TI-83-84 rule: split the batch at the median (omitting it from both halves when n is odd), then take the median of each half. This differs from Excel’s QUARTILE.',
  });

  const DATA = (window.APSTATS_DATA || {}).display?.quantitative;
  const W = 900, H = 460, M = { left: 76, right: 28, top: 26, bottom: 64 };
  const state = { ds: null, chart: 'hist', rel: false, binW: null, markers: true };

  const set = () => DATA.sets[state.ds];
  const vals = () => set().values;
  const varName = () => set().variable[lang];

  /* 小数位数：按组距的量级决定，避免 6.6000000001 这种显示 */
  function decimalsFor(step) {
    if (step >= 1) return 0;
    return Math.min(4, Math.ceil(-Math.log10(step)));
  }
  const fmtN = (v, d) => Number.isFinite(v) ? v.toFixed(d) : '—';

  /* ---------- 组距 ---------- */
  /* 候选组距取 1/2/2.5/5 × 10^k，这样刻度永远是好读的整数 */
  function binChoices(range) {
    const out = [];
    for (let k = -3; k <= 6; k++)
      for (const m of [1, 2, 2.5, 5])
        out.push(+(m * Math.pow(10, k)).toPrecision(4));
    // 保留能分出 2–60 组的那些
    return out.filter(w => range / w >= 2 && range / w <= 60).sort((a, b) => a - b);
  }
  function defaultBin(choices, range) {
    // 默认取最接近 12 组的那个
    return choices.reduce((best, w) =>
      Math.abs(range / w - 12) < Math.abs(range / best - 12) ? w : best, choices[0]);
  }
  /* 直方图分箱：起点对齐到组距的整数倍，和 TI 的 Xmin/Xscl 习惯一致 */
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
      <section id="quantBinWrap" class="bin-control">
        <label for="quantBin" data-i18n="quant_binwidth">${escapeHtml(t.quant_binwidth)}</label>
        <input id="quantBin" type="range" min="0" max="1" step="1" value="0">
        <output id="quantBinOut"></output>
      </section>
      <section id="quantStats" class="quant-stats" aria-live="polite"></section>
      <div id="quantSwitch" class="chart-switch"></div>
      <section class="cat-chart-card">
        <svg id="quantChart" class="cat-chart" viewBox="0 0 ${W} ${H}" role="img"></svg>
        <pre id="quantStem" class="stem-plot" hidden></pre>
      </section>
      <p id="quantHint" class="hint"></p>`;

    setOptions($('quantDataset'), DATA.order, state.ds, id => DATA.sets[id].name[lang]);
    $('quantDataset').addEventListener('change', e => { state.ds = e.target.value; state.binW = null; syncBin(); render(); });
    $('quantShow').addEventListener('change', e => { state.rel = e.target.value === 'rel'; render(); });
    $('quantMarkers').addEventListener('change', e => { state.markers = e.target.checked; render(); });
    $('quantBin').addEventListener('input', e => {
      state.binW = binChoices(range())[Number(e.target.value)];
      render();
    });
    syncShow();
    syncChartSwitch();
    syncBin();
  }
  const range = () => Math.max(...vals()) - Math.min(...vals());

  function syncShow() {
    const t = translations[lang];
    $('quantShow').innerHTML = `<option value="freq">${escapeHtml(t.quant_freq)}</option><option value="rel">${escapeHtml(t.quant_relfreq)}</option>`;
    $('quantShow').value = state.rel ? 'rel' : 'freq';
  }
  function syncChartSwitch() {
    const t = translations[lang];
    $('quantSwitch').innerHTML = ['hist', 'dot', 'stem'].map(c =>
      `<button type="button" data-chart="${c}" aria-pressed="${c === state.chart}">${escapeHtml(t['chart_' + c])}</button>`).join('');
    $('quantSwitch').querySelectorAll('[data-chart]').forEach(b =>
      b.addEventListener('click', () => { state.chart = b.dataset.chart; render(); }));
  }
  function syncBin() {
    const choices = binChoices(range());
    if (state.binW === null || !choices.includes(state.binW)) state.binW = defaultBin(choices, range());
    $('quantBin').max = String(choices.length - 1);
    $('quantBin').value = String(choices.indexOf(state.binW));
  }

  /* ---------- 概括统计量 ---------- */
  function renderStats() {
    const t = translations[lang], v = vals();
    const f = fiveNumber(v), ms = meanSd(v);
    const d = Math.max(decimalsFor(state.binW), range() < 10 ? 1 : 0);
    const cell = (k, val) => `<div><span>${escapeHtml(t[k])}</span><strong>${val}</strong></div>`;
    $('quantStats').innerHTML =
      cell('quant_n', f.n) +
      cell('quant_mean', fmtN(ms.mean, d + 2)) +
      cell('quant_median', fmtN(f.median, d + 1)) +
      cell('quant_sd', fmtN(ms.sd, d + 2)) +
      cell('quant_range', fmtN(f.max - f.min, d + 1)) +
      cell('quant_iqr', fmtN(f.iqr, d + 1)) +
      cell('quant_min', fmtN(f.min, d + 1)) +
      cell('quant_q1', fmtN(f.q1, d + 1)) +
      cell('quant_q3', fmtN(f.q3, d + 1)) +
      cell('quant_max', fmtN(f.max, d + 1));
    return f;
  }

  /* ---------- 坐标轴 ---------- */
  function niceStep(rawMax) {
    const pow = Math.pow(10, Math.floor(Math.log10(rawMax || 1)));
    return [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => rawMax / s <= 5) || 10 * pow;
  }
  function axes(xLo, xHi, yMax, yLabel, xLabel) {
    const step = niceStep(yMax), top = Math.ceil(yMax / step) * step;
    let g = '';
    for (let y = 0; y <= top + 1e-9; y += step) {
      const py = M.top + (H - M.bottom - M.top) * (1 - y / top);
      g += `<line class="grid" x1="${M.left}" y1="${py}" x2="${W - M.right}" y2="${py}"/>` +
           `<text class="val-label" x="${M.left - 10}" y="${py + 4}" text-anchor="end">${Number.isInteger(step) ? y : y.toFixed(1)}</text>`;
    }
    g += `<line class="baseline" x1="${M.left}" y1="${H - M.bottom}" x2="${W - M.right}" y2="${H - M.bottom}"/>`;
    // x 轴刻度放在组的边界上，读数直接对应区间端点
    const xs = niceStep((xHi - xLo) / 6);
    const d = decimalsFor(xs);
    for (let x = Math.ceil(xLo / xs) * xs; x <= xHi + 1e-9; x += xs) {
      const pxv = M.left + (W - M.right - M.left) * (x - xLo) / ((xHi - xLo) || 1);
      g += `<line class="tickmark" x1="${pxv}" y1="${H - M.bottom}" x2="${pxv}" y2="${H - M.bottom + 5}"/>` +
           `<text class="val-label" x="${pxv}" y="${H - M.bottom + 20}" text-anchor="middle">${x.toFixed(d)}</text>`;
    }
    g += `<text class="axis-title" x="${(M.left + W - M.right) / 2}" y="${H - 12}" text-anchor="middle">${escapeHtml(xLabel)}</text>`;
    g += `<text class="axis-title" transform="translate(18 ${(M.top + H - M.bottom) / 2}) rotate(-90)" text-anchor="middle">${escapeHtml(yLabel)}</text>`;
    return { svg: g, top };
  }
  /* 均值与中位数的竖线标记 */
  function markers(xLo, xHi, f, ms) {
    if (!state.markers) return '';
    const t = translations[lang];
    const X = v => M.left + (W - M.right - M.left) * (v - xLo) / ((xHi - xLo) || 1);
    const line = (v, cls, label, dy) =>
      `<line class="${cls}" x1="${X(v)}" y1="${M.top}" x2="${X(v)}" y2="${H - M.bottom}"/>` +
      `<text class="marker-label ${cls}-text" x="${X(v) + 5}" y="${M.top + dy}">${escapeHtml(label)}</text>`;
    return line(f.median, 'marker-median', t.quant_median_label, 14) +
           line(ms.mean, 'marker-mean', t.quant_mean_label, 30);
  }

  /* ---------- 三种图 ---------- */
  function drawHist(f, ms) {
    const t = translations[lang], v = vals(), n = v.length;
    const { bins, lo, hi } = histogram(v, state.binW);
    const ys = bins.map(b => state.rel ? (b.n / n) * 100 : b.n);
    const ax = axes(lo, hi, Math.max(...ys), state.rel ? t.quant_relfreq : t.quant_freq, varName());
    const bw = (W - M.right - M.left) / bins.length;
    const d = decimalsFor(state.binW);
    let g = ax.svg;
    bins.forEach((b, i) => {
      if (!b.n) return;                            // 空组不画 —— 直方图里的空隙必须是真实的「这里没有数据」
      const h = (H - M.bottom - M.top) * (ys[i] / ax.top);
      // 相邻的条必须严丝合缝（宽度正好是一个组距），所以用深色描边而不是留白来分隔
      g += `<rect class="hist-bar" x="${M.left + bw * i}" y="${H - M.bottom - h}" width="${bw}" height="${h}">` +
           `<title>[${b.lo.toFixed(d)}, ${b.hi.toFixed(d)})　${b.n}　${((b.n / n) * 100).toFixed(1)}%</title></rect>`;
    });
    return g + markers(lo, hi, f, ms);
  }

  function drawDot(f, ms) {
    const t = translations[lang], v = vals();
    const { bins, lo, hi } = histogram(v, state.binW);
    const maxStack = Math.max(...bins.map(b => b.n));
    const ax = axes(lo, hi, maxStack, t.quant_freq, varName());
    const bw = (W - M.right - M.left) / bins.length;
    // 点的半径同时受列宽和最高堆叠限制，保证不溢出画布
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

  /* 茎叶图。
     叶单位从数据自身的精度起步（整数数据的叶就是个位），太宽就逐级放大 10 倍；
     茎太少时按教材的办法「分裂茎」，把 0–9 拆成两行或五行。
     所有取位都在整数空间里做 —— 直接用 (x - stem*10) / leaf 会被浮点误差坑到，
     例如 9.2 − 9 = 0.19999999… 会算出叶 1 而不是 2。 */
  function stemSpec(v) {
    const lo = Math.min(...v), hi = Math.max(...v);
    let unit = 1;                                   // 数据精度：能让所有值都是整数倍的最大 10 的幂
    while (unit > 1e-4 && !v.every(x => Math.abs(x / unit - Math.round(x / unit)) < 1e-6)) unit /= 10;
    for (let leaf = unit; leaf <= 1e8; leaf *= 10) {
      const stemSize = leaf * 10;
      const stems = Math.floor(hi / stemSize) - Math.floor(lo / stemSize) + 1;
      if (stems > 25) continue;                     // 茎太多 → 叶单位再放大一级
      const split = stems >= 5 ? 1 : (stems * 2 >= 5 ? 2 : 5);
      return { leaf, stemSize, split };
    }
    return { leaf: unit, stemSize: unit * 10, split: 1 };
  }
  function drawStem() {
    const t = translations[lang];
    const all = vals(), v = all.filter(x => x >= 0);   // 负值无法用茎叶表示
    if (v.length < 2) return '—';
    const { leaf, stemSize, split } = stemSpec(v);
    const per = 10 / split;                            // 每行容纳几个叶值

    const rows = new Map();                            // key: 茎*10 + 行号
    for (const x of v) {
      const scaled = Math.round(x / leaf);              // 整数空间，避免浮点误差
      const stem = Math.floor(scaled / 10);
      const d = scaled - stem * 10;
      const key = stem * 10 + Math.floor(d / per);
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(d);
    }
    const keys = [...rows.keys()].sort((a, b) => b - a);   // 大的在上，与教材一致
    const width = Math.max(...keys.map(k => String(Math.floor(k / 10)).length));
    const body = keys.map(k =>
      `${String(Math.floor(k / 10)).padStart(width)} | ${rows.get(k).sort((a, b) => a - b).join('')}`).join('\n');

    const d0 = rows.get(keys[0]).slice().sort((a, b) => a - b)[0];
    const stem0 = Math.floor(keys[0] / 10);
    const dec = decimalsFor(leaf);
    const note = t.quant_stem_note
      .replace('{k}', stem0).replace('{d}', d0)
      .replace('{v}', (stem0 * stemSize + d0 * leaf).toFixed(dec));
    const dropped = all.length - v.length;
    const crowded = Math.max(...keys.map(k => rows.get(k).length)) > 80;
    return `${body}\n\n${note}`
      + (dropped ? `\n${lang === 'zh' ? `（已略去 ${dropped} 个负值）` : `(${dropped} negative value(s) omitted)`}` : '')
      + (crowded ? `\n\n${t.quant_stem_crowded}` : '');
  }

  /* ---------- 渲染 ---------- */
  function render() {
    const t = translations[lang];
    const f = renderStats(), ms = meanSd(vals());
    const isStem = state.chart === 'stem';
    $('quantBinWrap').hidden = isStem;
    $('quantChart').hidden = isStem;
    $('quantStem').hidden = !isStem;
    $('quantNote').textContent = set().note[lang];
    $('quantHint').textContent = isStem ? t.quant_quartile_note : t.quant_hint;

    if (isStem) { $('quantStem').textContent = drawStem(); return; }

    const d = decimalsFor(state.binW);
    const { bins } = histogram(vals(), state.binW);
    $('quantBinOut').textContent = `${state.binW.toFixed(d)}　(${t.quant_bins} ${bins.length})`;
    $('quantChart').innerHTML = state.chart === 'dot' ? drawDot(f, ms) : drawHist(f, ms);
    $('quantChart').setAttribute('aria-label', `${varName()} — ${t['chart_' + state.chart]}`);
  }

  /* ---------- 启动 ---------- */
  if (!DATA || !DATA.order.length) return;
  state.ds = DATA.order[0];
  buildUI();
  render();
  document.addEventListener('apstats:tool', e => { if (e.detail === 'quantitative') render(); });
  document.addEventListener('apstats:language', () => { syncShow(); syncChartSwitch(); render(); });
})();
