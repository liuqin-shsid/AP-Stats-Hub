/* 分类数据的展示（教材 Ch3）
   单变量：频数表 / 相对频数表 + 条形图、横向条形图、饼图，以及「面积原理」反例。
   双变量：列联表（计数 / 行% / 列% / 总%）+ 并排条形图、分段条形图。 */
(() => {
  Object.assign(translations.zh, {
    nav_display: '数据的展示',
    cat_title: '分类数据的展示',
    cat_desc: '用频数表、条形图、饼图描述一个分类变量；用列联表与条件分布比较两个分类变量。',
    cat_dataset: '选择数据集', cat_var1: '变量一', cat_var2: '变量二', cat_none: '—（只看一个变量）',
    cat_basis: '数值显示', cat_count: '计数', cat_row: '行百分比', cat_col: '列百分比', cat_total: '总百分比',
    cat_rel: '相对频数',
    chart_bar: '条形图', chart_pie: '饼图',
    chart_grouped: '并排条形图', chart_segmented: '分段条形图',
    cat_freq_title: '频数表', cat_ctab_title: '列联表',
    cat_category: '类别', cat_freq: '频数', cat_total_label: '合计',
    cat_hint_1: '只选了一个变量：下面是它的分布。切换「数值显示」可在计数与相对频数之间切换。',
    cat_hint_2: '选了两个变量：表格四周的合计就是各自的边际分布。把「数值显示」切到行或列百分比，看到的就是条件分布——若各行（或各列）的分布基本相同，说明两个变量相互独立。',
    cat_marginal: '边际分布', cat_of_row: '占本行', cat_of_col: '占本列', cat_of_all: '占总数',
    cat_pct_axis: '百分比 (%)', cat_count_axis: '频数',
    cat_same_var: '请为变量一和变量二选择不同的变量。',
  });
  Object.assign(translations.en, {
    nav_display: 'Displaying Data',
    cat_title: 'Displaying Categorical Data',
    cat_desc: 'Describe one categorical variable with frequency tables, bar charts and pie charts; compare two with contingency tables and conditional distributions.',
    cat_dataset: 'Dataset', cat_var1: 'Variable 1', cat_var2: 'Variable 2', cat_none: '— (one variable only)',
    cat_basis: 'Show as', cat_count: 'Counts', cat_row: 'Row %', cat_col: 'Column %', cat_total: 'Table %',
    cat_rel: 'Relative frequency',
    chart_bar: 'Bar chart', chart_pie: 'Pie chart',
    chart_grouped: 'Side-by-side bar', chart_segmented: 'Segmented bar',
    cat_freq_title: 'Frequency table', cat_ctab_title: 'Contingency table',
    cat_category: 'Category', cat_freq: 'Count', cat_total_label: 'Total',
    cat_hint_1: 'One variable selected: below is its distribution. Use "Show as" to switch between counts and relative frequency.',
    cat_hint_2: 'Two variables selected: the totals around the edges are the marginal distributions. Switch "Show as" to row or column percentages to see the conditional distributions — if every row (or column) has about the same distribution, the two variables are independent.',
    cat_marginal: 'Marginal distribution', cat_of_row: 'of row', cat_of_col: 'of column', cat_of_all: 'of total',
    cat_pct_axis: 'Percent (%)', cat_count_axis: 'Count',
    cat_same_var: 'Please choose two different variables.',
  });

  const DATA = (window.APSTATS_DATA || {}).display?.categorical;
  const PALETTE = ['var(--cat-1)','var(--cat-2)','var(--cat-3)','var(--cat-4)','var(--cat-5)'];
  const colorOf = i => i < PALETTE.length ? PALETTE[i] : 'var(--cat-other)';

  const W = 560, H = 400, M = { left: 62, right: 20, top: 22, bottom: 78 };
  const state = { ds: null, v1: 0, v2: -1, basis: 'count' };

  /* ---------- 取数 ---------- */
  const set = () => DATA.sets[state.ds];
  const col = i => set().columns[i];
  const levelLabel = (ci, li) => col(ci).levels[li][lang];
  const colName = ci => col(ci).name[lang];
  const twoVar = () => state.v2 >= 0 && state.v2 !== state.v1;

  /* 单变量频数 */
  function counts1(ci) {
    const out = col(ci).levels.map(() => 0);
    set().rows.forEach(r => out[r[ci]]++);
    return out;
  }
  /* 双变量列联表：T[i][j] = 变量一第 i 类 且 变量二第 j 类 的个数 */
  function counts2(ci, cj) {
    const T = col(ci).levels.map(() => col(cj).levels.map(() => 0));
    set().rows.forEach(r => T[r[ci]][r[cj]]++);
    return T;
  }
  const sum = a => a.reduce((s, v) => s + v, 0);
  const pct = (x, base) => base ? (x / base) * 100 : 0;
  const fmtPct = v => v.toFixed(1) + '%';

  /* ---------- 界面 ---------- */
  function buildUI() {
    const t = translations[lang];
    $('catPage').innerHTML = `
      <div class="page-heading"><div>
        <h1 data-i18n="cat_title">${escapeHtml(t.cat_title)}</h1>
        <p data-i18n="cat_desc">${escapeHtml(t.cat_desc)}</p>
      </div></div>
      <section class="controls" data-i18n-aria="controls_aria">
        <label><span data-i18n="cat_dataset">${escapeHtml(t.cat_dataset)}</span><select id="catDataset"></select></label>
        <label><span data-i18n="cat_var1">${escapeHtml(t.cat_var1)}</span><select id="catVar1"></select></label>
        <label><span data-i18n="cat_var2">${escapeHtml(t.cat_var2)}</span><select id="catVar2"></select></label>
        <label><span data-i18n="cat_basis">${escapeHtml(t.cat_basis)}</span><select id="catBasis"></select></label>
      </section>
      <p id="catHint" class="hint" role="status"></p>
      <div id="catTable" class="freq-table-wrap"></div>
      <div class="chart-pair">
        <section class="chart-panel"><h2 id="catTitleA"></h2>
          <svg id="catChartA" class="cat-chart" viewBox="0 0 ${W} ${H}" role="img"></svg></section>
        <section class="chart-panel"><h2 id="catTitleB"></h2>
          <svg id="catChartB" class="cat-chart" viewBox="0 0 ${W} ${H}" role="img"></svg></section>
      </div>
      <div id="catLegend" class="cat-legend"></div>`;

    setOptions($('catDataset'), DATA.order, state.ds, id => DATA.sets[id].name[lang]);
    $('catDataset').addEventListener('change', e => { state.ds = e.target.value; state.v1 = 0; state.v2 = -1; syncVars(); render(); });
    $('catVar1').addEventListener('change', e => { state.v1 = Number(e.target.value); fixBasis(); render(); });
    $('catVar2').addEventListener('change', e => { state.v2 = Number(e.target.value); fixBasis(); render(); });
    $('catBasis').addEventListener('change', e => { state.basis = e.target.value; render(); });
    syncVars();
  }

  /* 变量下拉：变量二多一个「不选」。切换数据集后要重建。 */
  function syncVars() {
    // 数据集下拉也要跟着语言重新标注，否则切英文后这里还是中文
    setOptions($('catDataset'), DATA.order, state.ds, id => DATA.sets[id].name[lang]);
    const cols = set().columns.map((c, i) => i);
    setOptions($('catVar1'), cols, state.v1, i => colName(i));
    setOptions($('catVar2'), [-1, ...cols], state.v2, i => i < 0 ? translations[lang].cat_none : colName(i));
    $('catVar1').value = String(state.v1);
    $('catVar2').value = String(state.v2);
    fixBasis();
  }

  /* 单变量只有「计数 / 相对频数」，双变量有四种百分比基准 */
  function fixBasis() {
    const t = translations[lang];
    const opts = twoVar() ? [['count', t.cat_count], ['row', t.cat_row], ['col', t.cat_col], ['total', t.cat_total]]
                          : [['count', t.cat_count], ['rel', t.cat_rel]];
    if (!opts.some(o => o[0] === state.basis)) state.basis = 'count';
    $('catBasis').innerHTML = opts.map(([v, l]) => `<option value="${v}">${escapeHtml(l)}</option>`).join('');
    $('catBasis').value = state.basis;
  }

  /* ---------- 表格 ---------- */
  function renderTable() {
    const t = translations[lang];
    if (!twoVar()) {
      const c = counts1(state.v1), n = sum(c);
      const rows = col(state.v1).levels.map((l, i) =>
        `<tr><th><span class="swatch" style="background:${colorOf(i)}"></span>${escapeHtml(l[lang])}</th>` +
        `<td>${c[i]}</td><td>${fmtPct(pct(c[i], n))}</td></tr>`).join('');
      $('catTable').innerHTML =
        `<p class="freq-caption">${escapeHtml(t.cat_freq_title)} · ${escapeHtml(colName(state.v1))} （n = ${n}）</p>` +
        `<table class="freq-table"><thead><tr><th class="corner">${escapeHtml(t.cat_category)}</th>` +
        `<th>${escapeHtml(t.cat_freq)}</th><th>${escapeHtml(t.cat_rel)}</th></tr></thead>` +
        `<tbody>${rows}<tr class="margin"><th>${escapeHtml(t.cat_total_label)}</th><td>${n}</td><td>100.0%</td></tr></tbody></table>`;
      return;
    }
    const T = counts2(state.v1, state.v2);
    const rowTot = T.map(sum), colTot = col(state.v2).levels.map((_, j) => sum(T.map(r => r[j]))), n = sum(rowTot);
    const show = (v, i, j) => state.basis === 'count' ? String(v)
      : state.basis === 'row' ? fmtPct(pct(v, rowTot[i]))
      : state.basis === 'col' ? fmtPct(pct(v, colTot[j]))
      : fmtPct(pct(v, n));
    const head = col(state.v2).levels.map((l, j) =>
      `<th><span class="swatch" style="background:${colorOf(j)}"></span>${escapeHtml(l[lang])}</th>`).join('');
    const body = T.map((row, i) =>
      `<tr><th>${escapeHtml(levelLabel(state.v1, i))}</th>` +
      row.map((v, j) => `<td>${show(v, i, j)}</td>`).join('') +
      `<td class="margin">${state.basis === 'row' ? '100.0%' : state.basis === 'count' ? rowTot[i] : fmtPct(pct(rowTot[i], n))}</td></tr>`).join('');
    const foot = `<tr class="margin"><th>${escapeHtml(t.cat_total_label)}</th>` +
      colTot.map(v => `<td>${state.basis === 'col' ? '100.0%' : state.basis === 'count' ? v : fmtPct(pct(v, n))}</td>`).join('') +
      `<td>${state.basis === 'count' ? n : '100.0%'}</td></tr>`;
    $('catTable').innerHTML =
      `<p class="freq-caption">${escapeHtml(t.cat_ctab_title)} · ${escapeHtml(colName(state.v1))} × ${escapeHtml(colName(state.v2))} （n = ${n}）` +
      ` — ${escapeHtml(t.cat_marginal)}${escapeHtml(lang === 'zh' ? '在合计行与合计列' : ' is the Total row and column')}</p>` +
      `<table class="freq-table"><thead><tr><th class="corner">${escapeHtml(colName(state.v1))} \\ ${escapeHtml(colName(state.v2))}</th>` +
      `${head}<th class="margin">${escapeHtml(t.cat_total_label)}</th></tr></thead><tbody>${body}${foot}</tbody></table>`;
  }

  /* ---------- 绘图（统一走 core/charts.js） ---------- */
  const GEOM = { W, H, M, titleX: 20, yLabelDx: 10 };   // 与迁移前的常数一致
  const drawBar = (values, labels, axisLabel, unitPct) =>
    Charts.bar({ values, labels, axisLabel, pct: unitPct, geom: GEOM });
  const drawPie = (values, labels) =>
    Charts.pie({ values, labels, geom: GEOM });
  const drawGrouped = (T, rowLabels, colLabels, axisLabel, unitPct) =>
    Charts.grouped({ matrix: T, rowLabels, colLabels, axisLabel, pct: unitPct, geom: GEOM });
  const drawSegmented = (T, rowLabels, colLabels) =>
    Charts.segmented({ matrix: T, rowLabels, colLabels, pctAxisLabel: translations[lang].cat_pct_axis, geom: GEOM });

  function legend(labels) {
    $('catLegend').innerHTML = labels.map((l, i) =>
      `<span><i style="background:${Charts.colorOf(i)}"></i>${escapeHtml(l)}</span>`).join('');
  }

  /* ---------- 渲染 ---------- */
  function render() {
    const t = translations[lang];
    renderTable();
    $('catHint').textContent = twoVar() ? t.cat_hint_2 : t.cat_hint_1;
    const put = (slot, title, svg) => {
      $('catTitle' + slot).textContent = title;
      $('catChart' + slot).innerHTML = svg;
      $('catChart' + slot).setAttribute('aria-label',
        `${colName(state.v1)}${twoVar() ? ' × ' + colName(state.v2) : ''} — ${title}`);
    };

    if (!twoVar()) {
      const c = counts1(state.v1), n = sum(c);
      const asPct = state.basis === 'rel';
      const values = asPct ? c.map(v => +pct(v, n).toFixed(1)) : c;
      const labels = col(state.v1).levels.map(l => l[lang]);
      put('A', t.chart_bar, drawBar(values, labels, asPct ? t.cat_pct_axis : t.cat_count_axis, asPct));
      put('B', t.chart_pie, drawPie(c, labels));
      legend(labels);
    } else {
      const T = counts2(state.v1, state.v2);
      const rowLabels = col(state.v1).levels.map(l => l[lang]);
      const colLabels = col(state.v2).levels.map(l => l[lang]);
      const rowTot = T.map(sum), colTot = colLabels.map((_, j) => sum(T.map(r => r[j]))), n = sum(rowTot);
      const asPct = state.basis !== 'count';
      const V = T.map((row, i) => row.map((v, j) => !asPct ? v
        : +pct(v, state.basis === 'row' ? rowTot[i] : state.basis === 'col' ? colTot[j] : n).toFixed(1)));
      put('A', t.chart_grouped, drawGrouped(V, rowLabels, colLabels, asPct ? t.cat_pct_axis : t.cat_count_axis, asPct));
      put('B', t.chart_segmented, drawSegmented(T, rowLabels, colLabels));
      legend(colLabels);
    }
  }

  /* ---------- 启动 ---------- */
  if (!DATA || !DATA.order.length) return;
  state.ds = DATA.order[0];
  buildUI();
  render();
  document.addEventListener('apstats:tool', e => { if (e.detail === 'categorical') render(); });
  document.addEventListener('apstats:language', () => { syncVars(); render(); });
})();
