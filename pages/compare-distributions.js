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
      <div id="cmpStats" class="freq-table-wrap"></div>
      <div id="cmpBox" class="chart-pair"></div>
      <!-- 滑杆紧挨着它控制的直方图；放在不参与重绘的容器里，拖动才不会被打断 -->
      <section class="bin-control">
        <label for="cmpBin" data-i18n="cmp_binwidth">${escapeHtml(t.cmp_binwidth)}</label>
        <input id="cmpBin" type="range" min="0" max="1" step="1" value="0">
        <output id="cmpBinOut"></output>
      </section>
      <div id="cmpHists" class="chart-pair"></div>
      <div id="cmpStem" class="chart-pair"></div>`;
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

  /* ---------- 绘图（统一走 core/charts.js） ---------- */
  const GEOM = { W, H, M, yLabelDx: 8 };
  const BOX_GEOM = { W: BOX_W, H: BOX_H, M };
  const drawBoxes = () =>
    Charts.boxGroups({ groups: groups().map(g => ({ label: gLabel(g), values: g.values })),
                       xLabel: varName(), geom: BOX_GEOM,
                       outlierLabel: translations[lang].cmp_outliers });
  /* 两组共用同一套分箱边界与同一个纵轴上限，否则两张直方图没法直接比较 */
  const drawHist = (ci, bins, yTop) =>
    Charts.hist({ values: groups()[ci].values, binW: state.binW,
                  yLabel: '',                              // 原本就没有纵轴标题，只有刻度数字
                  xLabel: varName(), geom: GEOM, color: ci,
                  binsOverride: { bins: bins.edges, lo: bins.lo, hi: bins.hi, counts: bins.counts[ci] },
                  yTopOverride: yTop, showPct: false });   // 原本提示里不带百分比
  const drawBackToBack = () =>
    Charts.backToBackStem({ groups: groups().map(g => ({ label: gLabel(g), values: g.values })),
                            stemLabel: lang === 'zh' ? '茎' : 'Stem',
                            readTpl: translations[lang].cmp_stem_read });

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

    $('cmpBox').innerHTML =
      panel(t.cmp_box, svg(drawBoxes(stats), BOX_H, varName() + ' — ' + t.cmp_box, BOX_W), t.cmp_box_note, true);
    $('cmpHists').innerHTML = groups().map((g, i) =>
      panel(`${t.cmp_hist} · ${gLabel(g)}`, svg(drawHist(i, bins, yTop), H, gLabel(g) + ' — ' + t.cmp_hist),
            i === 0 ? t.cmp_hist_note : '')).join('');
    $('cmpStem').innerHTML = panel(t.cmp_stem, drawBackToBack(), t.cmp_stem_note_1, true);
  }

  /* ---------- 启动 ---------- */
  if (!DATA || !DATA.order.length) return;
  state.ds = DATA.order[0];
  buildUI();
  render();
  document.addEventListener('apstats:tool', e => { if (e.detail === 'compare') render(); });
  document.addEventListener('apstats:language', () => { render(); });
})();
