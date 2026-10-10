/* Z-Score Explorer（标准化 / z 分数）
   放在「线性回归教学」分组下。
   用 Burger King 的脂肪 / 蛋白质数据，展示：
   - 原始数据散点图（浅色大点）
   - 标准化后的散点图（z 分数，深色实心点）
   - 每个点的 z 分数、均值、标准差
   依赖：data/regression.js（window.APSTATS_DATA.regression.burgerKing） */
(() => {
  /* ---------- i18n ---------- */
  Object.assign(translations.zh, {
    zscore_title: 'Z 分数（标准化）',
    zscore_desc: '把原始变量转换成 z 分数：z = (x − 均值) / 标准差。观察中心与离散程度如何被统一到均值为 0、标准差为 1 的尺度上。',
    zscore_dataset: '选择数据集',
    zscore_x: 'X 变量',
    zscore_y: 'Y 变量',
    zscore_show_raw: '显示原始数据点',
    zscore_show_std: '显示标准化数据点',
    zscore_show_axes: '显示 z = 0 参考线',
    zscore_show_grid: '显示网格',
    zscore_raw: '原始数据',
    zscore_std: '标准化数据',
    zscore_mean: '均值',
    zscore_sd: '标准差',
    zscore_n: '样本数 n',
    zscore_corr: '相关系数 r',
    zscore_point: '点',
    zscore_hover_raw: '原始',
    zscore_hover_std: '标准化',
    zscore_hint: '本页只做标准化演示，不会改动数据。开启「显示原始数据点」可以看到原始点与标准化点的位置关系。',
    zscore_loading: '正在读取数据…',
    zscore_load_error: '无法读取 data/regression.js。请执行 npm run build:data 重新生成。',
    zscore_aria: 'Z 分数标准化散点图',
    zscore_formula: 'z = (x − x̄) / s',
  });
  Object.assign(translations.en, {
    zscore_title: 'Z-Scores (Standardization)',
    zscore_desc: 'Convert raw variables into z-scores: z = (x − mean) / SD. Watch how center and spread get unified to mean 0 and SD 1.',
    zscore_dataset: 'Dataset',
    zscore_x: 'X variable',
    zscore_y: 'Y variable',
    zscore_show_raw: 'Show raw points',
    zscore_show_std: 'Show standardized points',
    zscore_show_axes: 'Show z = 0 reference lines',
    zscore_show_grid: 'Show grid',
    zscore_raw: 'Raw data',
    zscore_std: 'Standardized data',
    zscore_mean: 'Mean',
    zscore_sd: 'Standard deviation',
    zscore_n: 'n',
    zscore_corr: 'Correlation r',
    zscore_point: 'Point',
    zscore_hover_raw: 'Raw',
    zscore_hover_std: 'Std',
    zscore_hint: 'This page only demonstrates standardization; it does not modify the data. Turn on "Show raw points" to see how raw and standardized points relate.',
    zscore_loading: 'Loading data…',
    zscore_load_error: 'Could not read data/regression.js. Run "npm run build:data" to regenerate it.',
    zscore_aria: 'Z-score standardized scatterplot',
    zscore_formula: 'z = (x − x̄) / s',
  });

  /* ---------- 常量 ---------- */
  const W = 620, H = 500, M = { left: 78, right: 24, top: 24, bottom: 66 };
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* ---------- 状态 ---------- */
  const state = {
    sheet: '',
    xKey: '',
    yKey: '',
    raw: true,
    std: true,
    axes: true,
    grid: true,
    loaded: false,
    error: false,
  };

  /* ---------- 工具 ---------- */
  const compact = (v) => {
    if (!Number.isFinite(v)) return '—';
    return Number(v.toPrecision(6)).toString();
  };
  function mean(arr) {
    if (!arr.length) return NaN;
    let s = 0;
    for (const v of arr) s += v;
    return s / arr.length;
  }
  function sampleSd(arr) {
    const n = arr.length;
    if (n < 2) return NaN;
    const m = mean(arr);
    let s = 0;
    for (const v of arr) s += (v - m) ** 2;
    return Math.sqrt(s / (n - 1));
  }
  function makeScale(domain, range) {
    return (v) => range[0] + (v - domain[0]) * (range[1] - range[0]) / ((domain[1] - domain[0]) || 1);
  }
  function safeDomain(values) {
    let lo = Math.min.apply(null, values);
    let hi = Math.max.apply(null, values);
    if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.1;
    return [lo - pad, hi + pad];
  }
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function titleEl(str) {
    const el = document.createElementNS(SVG_NS, 'title');
    el.textContent = str;
    return el;
  }
  function ticks(lo, hi, count) {
    const out = [];
    for (let i = 0; i < count; i++) out.push(lo + (hi - lo) * i / (count - 1));
    return out;
  }

  /* ---------- 数据读取 ---------- */
  function availableSheets() {
    const bk = (window.APSTATS_DATA || {}).regression && window.APSTATS_DATA.regression.burgerKing;
    if (bk && bk.sheetNames && bk.sheetNames.length) {
      return bk.sheetNames.map(function (n) {
        return { key: n, label: n, rows: bk.sheets[n] };
      });
    }
    const lr = (window.APSTATS_DATA || {}).regression && window.APSTATS_DATA.regression.linearRegression;
    if (lr && lr.sheetNames && lr.sheetNames.length) {
      return lr.sheetNames.map(function (n) {
        return { key: n, label: displaySheetName ? displaySheetName(n) : n, rows: lr.sheets[n] };
      });
    }
    return [];
  }
  function numericKeys(rows) {
    if (!rows || !rows.length) return [];
    const keys = Object.keys(rows[0]);
    return keys.filter(function (k) {
      return rows.some(function (r) { return Number.isFinite(Number(r[k])); });
    });
  }

  /* ---------- UI ---------- */
  function buildUI() {
    const t = translations[lang];
    $('zscorePage').innerHTML = `
      <div class="page-heading">
        <div>
          <h1 data-i18n="zscore_title">${escapeHtml(t.zscore_title)}</h1>
          <p data-i18n="zscore_desc">${escapeHtml(t.zscore_desc)}</p>
        </div>
      </div>
      <section class="controls" data-i18n-aria="controls_aria">
        <label><span data-i18n="zscore_dataset">${escapeHtml(t.zscore_dataset)}</span>
          <select id="zscoreSheet" disabled><option data-i18n="zscore_loading">${escapeHtml(t.zscore_loading)}</option></select>
        </label>
        <label><span data-i18n="zscore_x">${escapeHtml(t.zscore_x)}</span>
          <select id="zscoreX" disabled></select>
        </label>
        <label><span data-i18n="zscore_y">${escapeHtml(t.zscore_y)}</span>
          <select id="zscoreY" disabled></select>
        </label>
        <label class="check"><input id="zscoreRaw" type="checkbox" checked> <span data-i18n="zscore_show_raw">${escapeHtml(t.zscore_show_raw)}</span></label>
        <label class="check"><input id="zscoreStd" type="checkbox" checked> <span data-i18n="zscore_show_std">${escapeHtml(t.zscore_show_std)}</span></label>
        <label class="check"><input id="zscoreAxes" type="checkbox" checked> <span data-i18n="zscore_show_axes">${escapeHtml(t.zscore_show_axes)}</span></label>
        <label class="check"><input id="zscoreGrid" type="checkbox" checked> <span data-i18n="zscore_show_grid">${escapeHtml(t.zscore_show_grid)}</span></label>
      </section>
      <p id="zscoreHint" class="hint" role="status"></p>
      <section id="zscoreStats" class="quant-stats" aria-live="polite"></section>
      <section class="chart-panel" style="margin-top:16px">
        <h2 data-i18n="zscore_title">${escapeHtml(t.zscore_title)}</h2>
        <svg id="zscoreChart" class="cat-chart" viewBox="0 0 ${W} ${H}" role="img"
             data-i18n-aria="zscore_aria" aria-label="${escapeHtml(t.zscore_aria)}"></svg>
        <p class="panel-note">${escapeHtml(t.zscore_formula)}</p>
      </section>
    `;

    $('zscoreRaw').addEventListener('change', function (e) { state.raw = e.target.checked; render(); });
    $('zscoreStd').addEventListener('change', function (e) { state.std = e.target.checked; render(); });
    $('zscoreAxes').addEventListener('change', function (e) { state.axes = e.target.checked; render(); });
    $('zscoreGrid').addEventListener('change', function (e) { state.grid = e.target.checked; render(); });
    $('zscoreSheet').addEventListener('change', function (e) { state.sheet = e.target.value; syncVars(); render(); });
    $('zscoreX').addEventListener('change', function (e) { state.xKey = e.target.value; render(); });
    $('zscoreY').addEventListener('change', function (e) { state.yKey = e.target.value; render(); });
  }

  function syncSheets() {
    const sheets = availableSheets();
    if (!sheets.length) return;
    setOptions($('zscoreSheet'), sheets.map(function (s) { return s.key; }), state.sheet, function (k) {
      const found = sheets.find(function (s) { return s.key === k; });
      return found ? found.label : k;
    });
    $('zscoreSheet').disabled = false;
    syncVars();
  }

  function syncVars() {
    const sheets = availableSheets();
    const current = sheets.find(function (s) { return s.key === state.sheet; }) || sheets[0];
    if (!current) return;
    const keys = numericKeys(current.rows);
    if (!keys.length) return;
    if (keys.indexOf(state.xKey) === -1) state.xKey = keys[0];
    if (keys.indexOf(state.yKey) === -1) state.yKey = keys[1] || keys[0];
    setOptions($('zscoreX'), keys, state.xKey, displayVariableName);
    setOptions($('zscoreY'), keys, state.yKey, displayVariableName);
    $('zscoreX').value = state.xKey;
    $('zscoreY').value = state.yKey;
    $('zscoreX').disabled = false;
    $('zscoreY').disabled = false;
  }

  /* ---------- 数据加工 ---------- */
  function getPoints() {
    const sheets = availableSheets();
    const current = sheets.find(function (s) { return s.key === state.sheet; }) || sheets[0];
    if (!current) return [];
    const xk = state.xKey, yk = state.yKey;
    return current.rows
      .map(function (r, i) {
        return { i: i, x: Number(r[xk]), y: Number(r[yk]) };
      })
      .filter(function (p) { return Number.isFinite(p.x) && Number.isFinite(p.y); });
  }

  /* ---------- 渲染 ---------- */
  function render() {
    const t = translations[lang];
    const hint = $('zscoreHint');
    const statsEl = $('zscoreStats');
    const svg = $('zscoreChart');

    if (state.error) {
      hint.className = 'hint danger';
      hint.textContent = t.zscore_load_error;
      clear(svg);
      svg.appendChild(textNode(W / 2, H / 2, t.zscore_load_error, 'outlier-empty'));
      statsEl.innerHTML = '';
      return;
    }
    if (!state.loaded) {
      hint.className = 'hint';
      hint.textContent = t.zscore_loading;
      return;
    }

    const points = getPoints();
    if (points.length < 2) {
      hint.className = 'hint danger';
      hint.textContent = t.metrics_need_points;
      clear(svg);
      statsEl.innerHTML = '';
      return;
    }

    hint.className = 'hint';
    hint.textContent = t.zscore_hint;

    const xs = points.map(function (p) { return p.x; });
    const ys = points.map(function (p) { return p.y; });
    const mx = mean(xs), sx = sampleSd(xs);
    const my = mean(ys), sy = sampleSd(ys);

    const std = points.map(function (p) {
      return {
        i: p.i,
        zx: sx ? (p.x - mx) / sx : 0,
        zy: sy ? (p.y - my) / sy : 0,
      };
    });

    const n = points.length;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const dx = points[i].x - mx, dy = points[i].y - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }
    const r = (sxx && syy) ? sxy / Math.sqrt(sxx * syy) : NaN;

    statsEl.innerHTML =
      cell(t.zscore_n, String(n)) +
      cell(t.zscore_raw + ' · ' + t.zscore_mean + ' x̄', compact(mx)) +
      cell(t.zscore_raw + ' · ' + t.zscore_sd + ' sₓ', compact(sx)) +
      cell(t.zscore_raw + ' · ' + t.zscore_mean + ' ȳ', compact(my)) +
      cell(t.zscore_raw + ' · ' + t.zscore_sd + ' sᵧ', compact(sy)) +
      cell(t.zscore_corr, compact(r));

    const rawX = safeDomain(xs);
    const rawY = safeDomain(ys);
    const stdX = safeDomain(std.map(function (p) { return p.zx; }).concat(0));
    const stdY = safeDomain(std.map(function (p) { return p.zy; }).concat(0));

    clear(svg);
    drawChart(svg, {
      points: points, std: std,
      rawX: rawX, rawY: rawY, stdX: stdX, stdY: stdY,
    });
  }

  function cell(label, value) {
    return '<div><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
  }

  function textNode(x, y, str, cls) {
    const t = svgEl('text', { x: x, y: y, 'text-anchor': 'middle', class: cls });
    t.textContent = str;
    return t;
  }

  function drawChart(svg, ctx) {
    const t = translations[lang];
    const points = ctx.points;
    const std = ctx.std;

    svg.appendChild(svgEl('rect', {
      x: M.left, y: M.top,
      width: W - M.left - M.right,
      height: H - M.top - M.bottom,
      fill: '#fbfdfe', stroke: '#e4e9ee',
    }));

    const sxScale = makeScale(ctx.stdX, [M.left, W - M.right]);
    const syScale = makeScale(ctx.stdY, [H - M.bottom, M.top]);

    if (state.grid) {
      const gx = ticks(ctx.stdX[0], ctx.stdX[1], 7);
      const gy = ticks(ctx.stdY[0], ctx.stdY[1], 7);
      for (let i = 0; i < gx.length; i++) {
        const x = sxScale(gx[i]);
        svg.appendChild(svgEl('line', { class: 'grid', x1: x, y1: M.top, x2: x, y2: H - M.bottom }));
      }
      for (let i = 0; i < gy.length; i++) {
        const y = syScale(gy[i]);
        svg.appendChild(svgEl('line', { class: 'grid', x1: M.left, y1: y, x2: W - M.right, y2: y }));
      }
    }

    if (state.axes) {
      const x0 = sxScale(0), y0 = syScale(0);
      svg.appendChild(svgEl('line', { class: 'zero-resid-line', x1: x0, y1: M.top, x2: x0, y2: H - M.bottom }));
      svg.appendChild(svgEl('line', { class: 'zero-resid-line', x1: M.left, y1: y0, x2: W - M.right, y2: y0 }));
    }

    if (state.raw) {
      const rawXScale = makeScale(ctx.rawX, [M.left, W - M.right]);
      const rawYScale = makeScale(ctx.rawY, [H - M.bottom, M.top]);
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const c = svgEl('circle', {
          class: 'point',
          cx: rawXScale(p.x), cy: rawYScale(p.y),
          r: 7, fill: '#2878b8', 'fill-opacity': 0.18,
          stroke: '#2878b8', 'stroke-opacity': 0.45,
        });
        c.appendChild(titleEl(
          t.zscore_point + ' ' + (i + 1) + ' · ' + t.zscore_hover_raw +
          ': (' + compact(p.x) + ', ' + compact(p.y) + ')'
        ));
        svg.appendChild(c);
      }
    }

    if (state.std) {
      for (let i = 0; i < std.length; i++) {
        const p = std[i];
        const c = svgEl('circle', {
          class: 'point adjusted-point',
          cx: sxScale(p.zx), cy: syScale(p.zy),
          r: 5, fill: '#c17b23', stroke: '#fff', 'stroke-width': 1.5,
        });
        c.appendChild(titleEl(
          t.zscore_point + ' ' + (i + 1) + ' · ' + t.zscore_hover_std +
          ': (zₓ=' + compact(p.zx) + ', zᵧ=' + compact(p.zy) + ')'
        ));
        svg.appendChild(c);
      }
    }

    svg.appendChild(svgEl('line', {
      class: 'axis',
      x1: M.left, y1: H - M.bottom, x2: W - M.right, y2: H - M.bottom,
    }));
    svg.appendChild(svgEl('line', {
      class: 'axis',
      x1: M.left, y1: M.top, x2: M.left, y2: H - M.bottom,
    }));

    const gx = ticks(ctx.stdX[0], ctx.stdX[1], 6);
    const gy = ticks(ctx.stdY[0], ctx.stdY[1], 6);
    for (let i = 0; i < gx.length; i++) {
      const x = sxScale(gx[i]);
      svg.appendChild(svgEl('line', { class: 'tickmark', x1: x, y1: H - M.bottom, x2: x, y2: H - M.bottom + 5 }));
      const tx = svgEl('text', { class: 'tick', x: x, y: H - M.bottom + 20, 'text-anchor': 'middle' });
      tx.textContent = Number(gx[i].toFixed(2)).toString();
      svg.appendChild(tx);
    }
    for (let i = 0; i < gy.length; i++) {
      const y = syScale(gy[i]);
      svg.appendChild(svgEl('line', { class: 'tickmark', x1: M.left - 5, y1: y, x2: M.left, y2: y }));
      const ty = svgEl('text', { class: 'tick', x: M.left - 10, y: y + 4, 'text-anchor': 'end' });
      ty.textContent = Number(gy[i].toFixed(2)).toString();
      svg.appendChild(ty);
    }

    const xLab = svgEl('text', {
      class: 'axis-label',
      x: (M.left + W - M.right) / 2,
      y: H - 16,
      'text-anchor': 'middle',
    });
    xLab.textContent = 'z(' + displayVariableName(state.xKey) + ')';
    svg.appendChild(xLab);

    const yLab = svgEl('text', {
      class: 'axis-label',
      transform: 'translate(20 ' + ((M.top + H - M.bottom) / 2) + ') rotate(-90)',
      'text-anchor': 'middle',
    });
    yLab.textContent = 'z(' + displayVariableName(state.yKey) + ')';
    svg.appendChild(yLab);
  }

  /* ---------- 启动 ---------- */
  function init() {
    buildUI();
    try {
      const sheets = availableSheets();
      if (!sheets.length) throw new Error('No sheets');
      state.sheet = sheets[0].key;
      const keys = numericKeys(sheets[0].rows);
      state.xKey = keys[0];
      state.yKey = keys[1] || keys[0];
      state.loaded = true;
    } catch (e) {
      state.error = true;
    }
    if (state.loaded) syncSheets();
    render();
    document.addEventListener('apstats:tool', function (e) { if (e.detail === 'zscore') render(); });
    document.addEventListener('apstats:language', function () { syncSheets(); render(); });
  }

  init();
})();