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

  /* ---------- 绘图（统一走 core/charts.js） ---------- */
  const GEOM = { W, H, M, yLabelDx: 8 };
  const BOX_GEOM = { W, H: BOX_H, M, yLabelDx: 8 };
  const drawHist = (bins, lo, hi, n, f, ms) =>
    Charts.hist({ values: vals(), binW: state.binW, pct: state.rel,
                  yLabel: state.rel ? translations[lang].quant_relfreq : translations[lang].quant_freq,
                  xLabel: varName(), geom: GEOM }) + markers(lo, hi, f, ms);
  const drawDot = (bins, lo, hi, f, ms) =>
    Charts.dot({ values: vals(), binW: state.binW, yLabel: translations[lang].quant_freq,
                 xLabel: varName(), geom: GEOM }) + markers(lo, hi, f, ms);
  const drawOgive = (bins, lo, hi, n) =>
    Charts.ogive({ values: vals(), binW: state.binW, yLabel: translations[lang].quant_ogive_y,
                   xLabel: varName(), geom: GEOM });
  const drawBox = f => Charts.box({ values: vals(), xLabel: varName(), geom: BOX_GEOM,
                                   outlierLabel: translations[lang].quant_outliers });
  const drawStem = () => Charts.stem({ values: vals(),
    readTpl: translations[lang].quant_stem_note,
    crowdedNote: translations[lang].quant_stem_crowded,
    negNote: lang === 'zh' ? '（已略去 {n} 个负值）' : '({n} negative value(s) omitted)' });

  const X = (v, lo, hi) => M.left + (W - M.right - M.left) * (v - lo) / ((hi - lo) || 1);
  /* 均值与中位数的竖线标记，叠在直方图/点图上 */
  function markers(lo, hi, f, ms) {
    if (!state.markers) return '';
    const t = translations[lang];
    const line = (v, cls, label, dy) =>
      `<line class="${cls}" x1="${X(v, lo, hi)}" y1="${M.top}" x2="${X(v, lo, hi)}" y2="${H - M.bottom}"/>` +
      `<text class="marker-label ${cls}-text" x="${X(v, lo, hi) + 4}" y="${M.top + dy}">${escapeHtml(label)}</text>`;
    return line(f.median, 'marker-median', t.quant_median_label, 12) +
           line(ms.mean, 'marker-mean', t.quant_mean_label, 27);
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
