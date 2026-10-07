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

  const W = 900, H = 520, M = { left: 84, right: 28, top: 26, bottom: 96 };
  const state = { ds: null, v1: 0, v2: -1, basis: 'count', chart: 'bar' };

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
      <div id="catChartSwitch" class="chart-switch"></div>
      <section class="cat-chart-card">
        <svg id="catChart" class="cat-chart" viewBox="0 0 ${W} ${H}" role="img"></svg>
        <div id="catLegend" class="cat-legend"></div>
      </section>`;

    setOptions($('catDataset'), DATA.order, state.ds, id => DATA.sets[id].name[lang]);
    $('catDataset').addEventListener('change', e => { state.ds = e.target.value; state.v1 = 0; state.v2 = -1; syncVars(); render(); });
    $('catVar1').addEventListener('change', e => { state.v1 = Number(e.target.value); fixBasis(); render(); });
    $('catVar2').addEventListener('change', e => { state.v2 = Number(e.target.value); fixBasis(); render(); });
    $('catBasis').addEventListener('change', e => { state.basis = e.target.value; render(); });
    syncVars();
  }

  /* 变量下拉：变量二多一个「不选」。切换数据集后要重建。 */
  function syncVars() {
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

    const charts = twoVar() ? ['grouped', 'segmented'] : ['bar', 'pie'];
    if (!charts.includes(state.chart)) state.chart = charts[0];
    $('catChartSwitch').innerHTML = charts.map(c =>
      `<button type="button" data-chart="${c}" aria-pressed="${c === state.chart}">${escapeHtml(t['chart_' + c])}</button>`).join('');
    $('catChartSwitch').querySelectorAll('[data-chart]').forEach(b =>
      b.addEventListener('click', () => { state.chart = b.dataset.chart; render(); }));
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

  /* ---------- 图表基础 ---------- */
  const px = (v, lo, hi, a, b) => a + (v - lo) * (b - a) / ((hi - lo) || 1);
  /* 顶端 4px 圆角、底端贴基线的竖条 */
  function barPath(x, y, w, h, r = 4) {
    if (h <= 0.5) return '';
    const rr = Math.min(r, w / 2, h);
    return `M ${x} ${y + h} V ${y + rr} Q ${x} ${y} ${x + rr} ${y} H ${x + w - rr} Q ${x + w} ${y} ${x + w} ${y + rr} V ${y + h} Z`;
  }
  /* 把轴顶取成「好看的整数」，并返回刻度步长 —— 否则会出现 0/17/33/50/67/84 这种读不出来的刻度。 */
  function niceAxis(rawMax, isPct) {
    if (isPct) {                                   // 百分比轴固定走 10 的倍数，上限 100
      const top = Math.min(100, Math.ceil(rawMax / 10) * 10);
      return { top, step: top <= 20 ? 5 : top <= 50 ? 10 : 20 };
    }
    const pow = Math.pow(10, Math.floor(Math.log10(rawMax || 1)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => rawMax / s <= 5) || 10 * pow;
    return { top: Math.ceil(rawMax / step) * step, step };
  }
  function yAxis(maxV, label, isPct) {
    const { top, step } = niceAxis(maxV, isPct);
    let g = '';
    for (let v = 0; v <= top + 1e-9; v += step) {
      const y = px(v, 0, top, H - M.bottom, M.top);
      g += `<line class="grid" x1="${M.left}" y1="${y}" x2="${W - M.right}" y2="${y}"/>` +
           `<text class="val-label" x="${M.left - 10}" y="${y + 4}" text-anchor="end">${Number.isInteger(step) ? v : v.toFixed(1)}${isPct ? '%' : ''}</text>`;
    }
    g += `<line class="baseline" x1="${M.left}" y1="${H - M.bottom}" x2="${W - M.right}" y2="${H - M.bottom}"/>`;
    g += `<text class="axis-title" transform="translate(20 ${(M.top + H - M.bottom) / 2}) rotate(-90)" text-anchor="middle">${escapeHtml(label)}</text>`;
    return { svg: g, top };                        // top = 画条形时要用的同一个轴顶
  }
  /* 类别名太长就断成两行，避免互相叠字 */
  function xLabel(text, cx, y) {
    const s = String(text);
    if (s.length <= 9) return `<text class="cat-label" x="${cx}" y="${y}" text-anchor="middle">${escapeHtml(s)}</text>`;
    const cut = s.lastIndexOf('/') + 1 || Math.ceil(s.length / 2);
    return `<text class="cat-label" x="${cx}" y="${y}" text-anchor="middle">${escapeHtml(s.slice(0, cut))}</text>` +
           `<text class="cat-label" x="${cx}" y="${y + 16}" text-anchor="middle">${escapeHtml(s.slice(cut))}</text>`;
  }
  function legend(labels) {
    $('catLegend').innerHTML = labels.map((l, i) =>
      `<span><i style="background:${colorOf(i)}"></i>${escapeHtml(l)}</span>`).join('');
  }

  /* ---------- 单变量图 ---------- */
  function drawBar(values, labels, axisLabel, unitPct) {
    const ax = yAxis(Math.max(...values), axisLabel, unitPct);
    const band = (W - M.left - M.right) / values.length;
    let g = ax.svg;
    values.forEach((v, i) => {
      // 条形之间留空隙：教材强调分类数据的条形是分开的
      const w = band * 0.58;
      const x = M.left + band * i + (band - w) / 2;
      const y = px(v, 0, ax.top, H - M.bottom, M.top);
      g += `<path class="bar" fill="${colorOf(i)}" d="${barPath(x, y, w, H - M.bottom - y)}">` +
           `<title>${escapeHtml(labels[i])}: ${unitPct ? fmtPct(v) : v}</title></path>`;
      g += `<text class="val-label" x="${M.left + band * i + band / 2}" y="${y - 7}" text-anchor="middle">${unitPct ? fmtPct(v) : v}</text>`;
      g += xLabel(labels[i], M.left + band * i + band / 2, H - M.bottom + 22);
    });
    return g;
  }
  function drawPie(values, labels) {
    const n = sum(values), cx = W / 2, cy = H / 2 - 10, r = Math.min(H, W) / 2 - 60;
    let a0 = -Math.PI / 2, g = '';
    values.forEach((v, i) => {
      const a1 = a0 + (v / n) * Math.PI * 2;
      const big = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      // 整圆（只有一个类别）时 arc 画不出来，改画整圆
      g += values.filter(x => x > 0).length === 1
        ? `<circle class="slice" fill="${colorOf(i)}" cx="${cx}" cy="${cy}" r="${r}"/>`
        : `<path class="slice" fill="${colorOf(i)}" d="M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${big} 1 ${x1} ${y1} Z">` +
          `<title>${escapeHtml(labels[i])}: ${v} (${fmtPct(pct(v, n))})</title></path>`;
      if (v / n > 0.04) {
        const [lx, ly] = p((a0 + a1) / 2);
        g += `<text class="val-label" x="${cx + (lx - cx) * 0.68}" y="${cy + (ly - cy) * 0.68 + 4}" text-anchor="middle">${fmtPct(pct(v, n))}</text>`;
      }
      a0 = a1;
    });
    return g;
  }

  /* ---------- 双变量图 ---------- */
  /* 并排条形图：每个「变量一」类别一组，组内按「变量二」的类别排开 */
  function drawGrouped(T, rowLabels, colLabels, axisLabel, unitPct) {
    const ax = yAxis(Math.max(...T.flat()), axisLabel, unitPct);
    const band = (W - M.left - M.right) / T.length;
    let g = ax.svg;
    T.forEach((row, i) => {
      const inner = band * 0.74 / row.length;
      row.forEach((v, j) => {
        const x = M.left + band * i + band * 0.13 + inner * j;
        const y = px(v, 0, ax.top, H - M.bottom, M.top);
        g += `<path class="bar" fill="${colorOf(j)}" d="${barPath(x, y, inner - 2, H - M.bottom - y)}">` +
             `<title>${escapeHtml(rowLabels[i])} · ${escapeHtml(colLabels[j])}: ${unitPct ? fmtPct(v) : v}</title></path>`;
        if (row.length <= 4) g += `<text class="val-label" x="${x + (inner - 2) / 2}" y="${y - 6}" text-anchor="middle" font-size="11">${unitPct ? fmtPct(v) : v}</text>`;
      });
      g += xLabel(rowLabels[i], M.left + band * i + band / 2, H - M.bottom + 22);
    });
    return g;
  }
  /* 分段条形图：每根条拉到 100%，按「变量二」的条件分布切段 */
  function drawSegmented(T, rowLabels, colLabels) {
    const band = (W - M.left - M.right) / T.length;
    let g = yAxis(100, translations[lang].cat_pct_axis, true).svg;
    T.forEach((row, i) => {
      const n = sum(row), bw = band * 0.52, x = M.left + band * i + (band - bw) / 2;
      let acc = 0;
      row.forEach((v, j) => {
        const p0 = pct(acc, n), p1 = pct(acc + v, n);
        const y1 = px(p1, 0, 100, H - M.bottom, M.top), y0 = px(p0, 0, 100, H - M.bottom, M.top);
        g += `<rect class="bar" fill="${colorOf(j)}" x="${x}" y="${y1}" width="${bw}" height="${Math.max(0, y0 - y1)}">` +
             `<title>${escapeHtml(rowLabels[i])} · ${escapeHtml(colLabels[j])}: ${fmtPct(pct(v, n))}</title></rect>`;
        if (p1 - p0 > 6) g += `<text class="val-label" x="${x + bw / 2}" y="${(y0 + y1) / 2 + 4}" text-anchor="middle" fill="#fff">${fmtPct(pct(v, n))}</text>`;
        acc += v;
      });
      g += xLabel(rowLabels[i], M.left + band * i + band / 2, H - M.bottom + 22);
    });
    return g;
  }

  /* ---------- 渲染 ---------- */
  function render() {
    const t = translations[lang];
    renderTable();
    $('catHint').textContent = twoVar() ? t.cat_hint_2 : t.cat_hint_1;
    let svg = '';
    if (!twoVar()) {
      const c = counts1(state.v1), n = sum(c);
      const asPct = state.basis === 'rel';
      const vals = asPct ? c.map(v => +pct(v, n).toFixed(1)) : c;
      const labels = col(state.v1).levels.map(l => l[lang]);
      const axis = asPct ? t.cat_pct_axis : t.cat_count_axis;
      svg = state.chart === 'pie' ? drawPie(c, labels) : drawBar(vals, labels, axis, asPct);
      legend(labels);
    } else {
      const T = counts2(state.v1, state.v2);
      const rowLabels = col(state.v1).levels.map(l => l[lang]);
      const colLabels = col(state.v2).levels.map(l => l[lang]);
      if (state.chart === 'segmented') {
        svg = drawSegmented(T, rowLabels, colLabels);
      } else {
        const rowTot = T.map(sum), colTot = colLabels.map((_, j) => sum(T.map(r => r[j]))), n = sum(rowTot);
        const asPct = state.basis !== 'count';
        const V = T.map((row, i) => row.map((v, j) => !asPct ? v
          : +pct(v, state.basis === 'row' ? rowTot[i] : state.basis === 'col' ? colTot[j] : n).toFixed(1)));
        svg = drawGrouped(V, rowLabels, colLabels, asPct ? t.cat_pct_axis : t.cat_count_axis, asPct);
      }
      legend(colLabels);
    }
    $('catChart').innerHTML = svg;
    $('catChart').setAttribute('aria-label',
      `${colName(state.v1)}${twoVar() ? ' × ' + colName(state.v2) : ''} — ${t['chart_' + state.chart]}`);
  }

  /* ---------- 启动 ---------- */
  if (!DATA || !DATA.order.length) return;
  state.ds = DATA.order[0];
  buildUI();
  render();
  document.addEventListener('apstats:tool', e => { if (e.detail === 'categorical') render(); });
  document.addEventListener('apstats:language', () => { syncVars(); render(); });
})();
