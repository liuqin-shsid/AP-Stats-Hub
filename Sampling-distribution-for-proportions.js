/* Sampling Distribution for Proportions — 浏览器版
 * 对应原 Python 文件 sampling-distribution-for-proportions.py。
 * 不依赖任何外部库；使用 SVG + 原生 JS。
 * 通过 apstats:tool / apstats:language 事件与现有工具协作。
 * 注意：此脚本自行处理 proportionPage 的显隐，因此无需修改 scatterplot.js。
 */
(() => {
  /* ---------- i18n ---------- */
  Object.assign(translations.zh, {
    proportion_title: '样本比例的抽样分布',
    proportion_desc: '改变总体比例 p 与样本量 n，观察单次样本与样本比例 p̂ 的累积抽样分布。',
    proportion_population: '(1) 总体分布',
    proportion_sample: '(2) 单次样本分布',
    proportion_sampling: '(3) 样本比例 p̂ 的累积抽样分布',
    proportion_pop_title: '总体 p = {p}（红 {success} / 蓝 {failure}）',
    proportion_sample_title: '样本分布（单次抽样）',
    proportion_sampling_title: '样本比例 p̂ 的抽样分布（累积）',
    proportion_sample_size: '样本量 n',
    proportion_population_p: '总体比例 p',
    proportion_batch: '每次模拟次数',
    proportion_simulations: '模拟次数',
    proportion_reset: '重置',
    proportion_sample_n: 'n = {n}，p̂ = {phat}',
    proportion_accum_n: 'n = {n}，累计模拟次数 = {total}',
    proportion_count: '频数',
    proportion_sample_proportion: '样本比例 p̂',
    proportion_success: '成功 (1)',
    proportion_failure: '失败 (0)',
    proportion_stats: '统计量',
    proportion_pop_p: '总体比例 p',
    proportion_sample_size_label: '样本量 n',
    proportion_batch_size: '批量大小',
    proportion_accum_total: '累计总数',
    proportion_mean_phat: 'p̂ 的均值',
    proportion_theory_mean: '理论 E[p̂]',
    proportion_std_phat: 'p̂ 的标准差',
    proportion_theory_se: '理论 SE',
    proportion_invalid_p: 'p 必须是 0 到 1 之间的数。',
    proportion_invalid_n: 'n 必须是正整数。',
    proportion_click_btn: '点击上方数字按钮自动添加一批样本。',
    proportion_draw_ball: '小球',
  });
  Object.assign(translations.en, {
    proportion_title: 'Sampling Distribution for Proportions',
    proportion_desc: 'Change the population proportion p and sample size n to compare a single sample with the accumulated sampling distribution of p̂.',
    proportion_population: '(1) Population Distribution',
    proportion_sample: '(2) Single-Sample Distribution',
    proportion_sampling: '(3) Sampling Distribution of p̂ (accumulated)',
    proportion_pop_title: 'Population p = {p} (red {success} / blue {failure})',
    proportion_sample_title: 'Sample Distribution (one sample)',
    proportion_sampling_title: 'Sampling Distribution of p̂ (accumulated)',
    proportion_sample_size: 'Sample size n',
    proportion_population_p: 'Population p',
    proportion_batch: 'Batch size',
    proportion_simulations: 'Number of simulations',
    proportion_reset: 'Reset',
    proportion_sample_n: 'n = {n}, p̂ = {phat}',
    proportion_accum_n: 'n = {n}, total simulations = {total}',
    proportion_count: 'Count',
    proportion_sample_proportion: 'Sample proportion p̂',
    proportion_success: 'Success (1)',
    proportion_failure: 'Failure (0)',
    proportion_stats: 'Statistics',
    proportion_pop_p: 'Population p',
    proportion_sample_size_label: 'Sample size n',
    proportion_batch_size: 'Batch size',
    proportion_accum_total: 'Accumulated total',
    proportion_mean_phat: 'Mean of p̂',
    proportion_theory_mean: 'Theory E[p̂]',
    proportion_std_phat: 'Std of p̂',
    proportion_theory_se: 'Theory SE',
    proportion_invalid_p: 'p must be a number between 0 and 1.',
    proportion_invalid_n: 'n must be a positive integer.',
    proportion_click_btn: 'Click a number button above to add a batch of samples.',
    proportion_draw_ball: 'Ball',
  });

  /* ---------- 常量 ---------- */
  const TOTAL_BALLS = 1000;
  const BALL_COLS = 40;
  const SIM_OPTIONS = [1, 5, 10, 100, 500, 1000];
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const COLORS = {
    success: '#cf493c',
    failure: '#2878b8',
    sampling: '#22a06b',
    p: '#c73932',
    mean: '#c17b23',
  };

  /* ---------- 状态 ---------- */
  const state = {
    p: 0.2,
    n: 20,
    batch: 5,
    accumulated: [],
  };

  /* ---------- 工具函数 ---------- */
  const fmt = (v, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : '—');
  const escapeHtml = (v) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const binomial = (n, p) => { let s = 0; for (let i = 0; i < n; i++) if (Math.random() < p) s++; return s; };
  const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
  const variance = (a, ddof = 0) => {
    if (a.length <= ddof) return NaN;
    const m = mean(a);
    return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - ddof);
  };
  const sd = (a, ddof = 0) => Math.sqrt(variance(a, ddof));

  /* ---------- DOM 注入 ---------- */
  function buildUI() {
    const root = document.getElementById('proportionPage');
    root.innerHTML = `
      <div class="page-heading">
        <div><h1 data-i18n="proportion_title"></h1><p data-i18n="proportion_desc"></p></div>
      </div>
      <section class="controls prop-controls">
        <label class="prop-text-label">
          <span data-i18n="proportion_population_p"></span>
          <input id="propP" type="number" min="0" max="1" step="0.01" value="0.2">
        </label>
        <label class="prop-text-label">
          <span data-i18n="proportion_sample_size"></span>
          <input id="propN" type="number" min="1" step="1" value="20">
        </label>
        <div class="prop-sim-row">
          <span class="prop-sim-label" data-i18n="proportion_simulations"></span>
          <div class="prop-buttons">
            ${SIM_OPTIONS.map(v => `<button type="button" class="secondary-button prop-sim-btn" data-batch="${v}">${v}</button>`).join('')}
          </div>
        </div>
        <button id="propReset" class="reset" type="button" data-i18n="proportion_reset"></button>
      </section>
      <p id="propHint" class="hint" role="status"></p>
      <div class="prop-charts">
        <section class="prop-chart-card">
          <h2 data-i18n="proportion_population"></h2>
          <svg id="propPopChart" class="prop-chart" viewBox="0 0 460 340" role="img"></svg>
        </section>
        <section class="prop-chart-card">
          <h2 data-i18n="proportion_sample"></h2>
          <svg id="propSampleChart" class="prop-chart" viewBox="0 0 460 340" role="img"></svg>
        </section>
        <section class="prop-chart-card prop-chart-wide">
          <h2 data-i18n="proportion_sampling"></h2>
          <svg id="propSamplingChart" class="prop-chart" viewBox="0 0 620 340" role="img"></svg>
        </section>
      </div>
      <section class="prop-stats">
        <div id="propStatsText" class="prop-stats-text"></div>
      </section>
    `;
    // 事件
    document.getElementById('propP').addEventListener('change', e => {
      const v = Number(e.target.value);
      if (!Number.isFinite(v) || v < 0 || v > 1) { alert(translations[lang].proportion_invalid_p); return; }
      state.p = v; state.accumulated = []; renderAll();
    });
    document.getElementById('propN').addEventListener('change', e => {
      const v = parseInt(e.target.value, 10);
      if (!Number.isFinite(v) || v < 1) { alert(translations[lang].proportion_invalid_n); return; }
      state.n = v; state.accumulated = []; renderAll();
    });
    document.querySelectorAll('.prop-sim-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = Number(btn.dataset.batch);
        state.batch = k;
        // 立即添加一批 p̂
        for (let i = 0; i < k; i++) {
          state.accumulated.push(binomial(state.n, state.p) / state.n);
        }
        renderAll();
      });
    });
    document.getElementById('propReset').addEventListener('click', () => {
      state.accumulated = []; renderAll();
    });
  }

  /* ---------- 绘图原语 ---------- */
  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function clearSvg(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function makeScale(domain, range) {
    return v => range[0] + (v - domain[0]) * (range[1] - range[0]) / (domain[1] - domain[0] || 1);
  }
  const SIZE = { w: 460, h: 340, m: { left: 56, right: 18, top: 18, bottom: 48 } };
  const SIZE_WIDE = { w: 620, h: 340, m: { left: 56, right: 18, top: 18, bottom: 48 } };
  function drawAxes(svg, sz, xDomain, yDomain, opts = {}) {
    const { xlabel, ylabel, xTicks = 5, yTicks = 5 } = opts;
    const sx = makeScale(xDomain, [sz.m.left, sz.w - sz.m.right]);
    const sy = makeScale(yDomain, [sz.h - sz.m.bottom, sz.m.top]);
    for (let i = 0; i < xTicks; i++) {
      const v = xDomain[0] + (xDomain[1] - xDomain[0]) * i / (xTicks - 1);
      const x = sx(v);
      svg.appendChild(svgEl('line', { class: 'grid', x1: x, y1: sz.m.top, x2: x, y2: sz.h - sz.m.bottom }));
      const t = svgEl('text', { class: 'tick', x, y: sz.h - sz.m.bottom + 18, 'text-anchor': 'middle' });
      t.textContent = fmt(v, 1);
      svg.appendChild(t);
    }
    for (let i = 0; i < yTicks; i++) {
      const v = yDomain[0] + (yDomain[1] - yDomain[0]) * i / (yTicks - 1);
      const y = sy(v);
      svg.appendChild(svgEl('line', { class: 'grid', x1: sz.m.left, y1: y, x2: sz.w - sz.m.right, y2: y }));
      const t = svgEl('text', { class: 'tick', x: sz.m.left - 8, y: y + 4, 'text-anchor': 'end' });
      t.textContent = fmt(v, 1);
      svg.appendChild(t);
    }
    svg.appendChild(svgEl('path', {
      class: 'axis', fill: 'none',
      d: `M ${sz.m.left} ${sz.m.top} V ${sz.h - sz.m.bottom} H ${sz.w - sz.m.right}`,
    }));
    if (xlabel) {
      const t = svgEl('text', { class: 'axis-label', x: (sz.m.left + sz.w - sz.m.right) / 2, y: sz.h - 8, 'text-anchor': 'middle' });
      t.textContent = xlabel;
      svg.appendChild(t);
    }
    if (ylabel) {
      const t = svgEl('text', { class: 'axis-label', transform: `translate(14 ${(sz.m.top + sz.h - sz.m.bottom) / 2}) rotate(-90)`, 'text-anchor': 'middle' });
      t.textContent = ylabel;
      svg.appendChild(t);
    }
  }

  /* ---------- 三个面板渲染 ---------- */
  // (1) 总体分布：彩色小球阵列
  function renderPopulation() {
    const svg = document.getElementById('propPopChart');
    clearSvg(svg);
    const success = Math.round(state.p * TOTAL_BALLS);
    const failure = TOTAL_BALLS - success;
    // 生成顺序并打乱
    const colors = [];
    for (let i = 0; i < success; i++) colors.push('success');
    for (let i = 0; i < failure; i++) colors.push('failure');
    for (let i = colors.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    const spacing = 1.0, radius = 0.38;
    const rows = Math.ceil(TOTAL_BALLS / BALL_COLS);
    const cols = BALL_COLS;
    // 视口按 viewBox 460x340
    const vbW = 460, vbH = 340;
    const padX = 6, padY = 26, padBottom = 8;
    const availW = vbW - padX * 2, availH = vbH - padY - padBottom;
    const cellW = availW / cols, cellH = availH / rows;
    for (let i = 0; i < colors.length; i++) {
      const r = (i / cols) | 0, c = i % cols;
      const cx = padX + (c + 0.5) * cellW;
      const cy = padY + (r + 0.5) * cellH;
      const rr = Math.min(cellW, cellH) * 0.44;
      svg.appendChild(svgEl('circle', {
        cx, cy, r: rr,
        fill: colors[i] === 'success' ? COLORS.success : COLORS.failure,
        stroke: '#000', 'stroke-width': 0.2,
      }));
    }
    // 标题
    const title = svgEl('text', {
      x: vbW / 2, y: 16, 'text-anchor': 'middle',
      fill: '#17324d', 'font-size': 13, 'font-weight': 700,
    });
    title.textContent = translations[lang].proportion_pop_title
      .replace('{p}', state.p.toFixed(2))
      .replace('{success}', String(success))
      .replace('{failure}', String(failure));
    svg.appendChild(title);
  }

  // (2) 单次样本分布：柱状图
  function renderSample() {
    const svg = document.getElementById('propSampleChart');
    clearSvg(svg);
    const sz = SIZE;
    const n = state.n;
    const success = binomial(n, state.p);
    const failure = n - success;
    const counts = [success, failure];
    const labels = [translations[lang].proportion_success, translations[lang].proportion_failure];
    const maxC = Math.max(success, failure, 1);
    const yDomain = [0, maxC * 1.18];
    const xDomain = [0, 2];
    drawAxes(svg, sz, xDomain, yDomain, {
      xlabel: '', ylabel: translations[lang].proportion_count,
      xTicks: 3, yTicks: 5,
    });
    const sx = makeScale(xDomain, [sz.m.left, sz.w - sz.m.right]);
    const sy = makeScale(yDomain, [sz.h - sz.m.bottom, sz.m.top]);
    const barW = (sz.w - sz.m.left - sz.m.right) / 3;
    for (let i = 0; i < 2; i++) {
      const x = sx(i + 0.5) - barW / 2;
      const y = sy(counts[i]);
      const h = (sz.h - sz.m.bottom) - y;
      svg.appendChild(svgEl('rect', {
        x, y, width: barW, height: h,
        fill: i === 0 ? COLORS.success : COLORS.failure,
        stroke: '#000', 'stroke-width': 0.6, 'fill-opacity': 0.85,
      }));
      const t = svgEl('text', {
        x: sx(i + 0.5), y: y - 4, 'text-anchor': 'middle',
        fill: '#17324d', 'font-size': 12, 'font-weight': 700,
      });
      t.textContent = String(counts[i]);
      svg.appendChild(t);
      const lb = svgEl('text', {
        x: sx(i + 0.5), y: sz.h - sz.m.bottom + 18, 'text-anchor': 'middle',
        fill: '#263844', 'font-size': 11,
      });
      lb.textContent = labels[i];
      svg.appendChild(lb);
    }
    const phat = success / n;
    const title = svgEl('text', {
      x: sz.w / 2, y: 16, 'text-anchor': 'middle',
      fill: '#17324d', 'font-size': 12, 'font-weight': 700,
    });
    title.textContent = translations[lang].proportion_sample_n
      .replace('{n}', String(n))
      .replace('{phat}', phat.toFixed(4));
    svg.appendChild(title);
  }

  // (3) 累积抽样分布：直方图 + p、均值参考线
  function renderSampling() {
    const svg = document.getElementById('propSamplingChart');
    clearSvg(svg);
    const sz = SIZE_WIDE;
    const data = state.accumulated;
    const xDomain = [0, 1];
    if (data.length === 0) {
      drawAxes(svg, sz, xDomain, [0, 1], {
        xlabel: translations[lang].proportion_sample_proportion,
        ylabel: translations[lang].proportion_count,
        xTicks: 6, yTicks: 5,
      });
      const title = svgEl('text', {
        x: sz.w / 2, y: 16, 'text-anchor': 'middle',
        fill: '#17324d', 'font-size': 12, 'font-weight': 700,
      });
      title.textContent = translations[lang].proportion_accum_n
        .replace('{n}', String(state.n)).replace('{total}', '0');
      svg.appendChild(title);
      return;
    }
    // 分箱
    const bins = Math.min(50, Math.max(5, Math.floor(data.length / 5) + 5));
    const binW = 1 / bins;
    const counts = new Array(bins).fill(0);
    for (const v of data) {
      let idx = Math.floor(v / binW);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      counts[idx]++;
    }
    const yMax = Math.max(...counts, 1) * 1.05;
    drawAxes(svg, sz, xDomain, [0, yMax], {
      xlabel: translations[lang].proportion_sample_proportion,
      ylabel: translations[lang].proportion_count,
      xTicks: 6, yTicks: 5,
    });
    const sx = makeScale(xDomain, [sz.m.left, sz.w - sz.m.right]);
    const sy = makeScale([0, yMax], [sz.h - sz.m.bottom, sz.m.top]);
    for (let i = 0; i < bins; i++) {
      if (!counts[i]) continue;
      const x = sx(i * binW);
      const w = sx((i + 1) * binW) - x;
      const y = sy(counts[i]);
      const h = (sz.h - sz.m.bottom) - y;
      svg.appendChild(svgEl('rect', {
        x, y, width: w, height: h,
        fill: COLORS.sampling, stroke: '#000', 'stroke-width': 0.3, 'fill-opacity': 0.8,
      }));
    }
    // 参考线
    svg.appendChild(svgEl('line', {
      x1: sx(state.p), x2: sx(state.p),
      y1: sz.m.top, y2: sz.h - sz.m.bottom,
      stroke: COLORS.p, 'stroke-width': 2, 'stroke-dasharray': '6 4',
    }));
    const m = mean(data);
    svg.appendChild(svgEl('line', {
      x1: sx(m), x2: sx(m),
      y1: sz.m.top, y2: sz.h - sz.m.bottom,
      stroke: COLORS.mean, 'stroke-width': 2, 'stroke-dasharray': '2 4',
    }));
    const title = svgEl('text', {
      x: sz.w / 2, y: 16, 'text-anchor': 'middle',
      fill: '#17324d', 'font-size': 12, 'font-weight': 700,
    });
    title.textContent = translations[lang].proportion_accum_n
      .replace('{n}', String(state.n)).replace('{total}', String(data.length));
    svg.appendChild(title);
    // 图例
    const legend = svgEl('text', {
      x: sz.w - sz.m.right - 4, y: 16, 'text-anchor': 'end',
      fill: '#263844', 'font-size': 11,
    });
    legend.textContent = `p = ${state.p.toFixed(2)}　mean p̂ = ${m.toFixed(4)}`;
    svg.appendChild(legend);
  }

  /* ---------- 统计面板 ---------- */
  function renderStats() {
    const el = document.getElementById('propStatsText');
    const t = translations[lang];
    const total = state.accumulated.length;
    const m = total ? mean(state.accumulated) : NaN;
    const s = total > 1 ? sd(state.accumulated, 1) : NaN;
    const se = Math.sqrt(state.p * (1 - state.p) / state.n);
    el.innerHTML = `
      <div class="prop-stats-title">${escapeHtml(t.proportion_stats)}</div>
      <div class="prop-stats-grid">
        <div><span>${escapeHtml(t.proportion_pop_p)}</span><b>${state.p.toFixed(4)}</b></div>
        <div><span>${escapeHtml(t.proportion_sample_size_label)}</span><b>${state.n}</b></div>
        <div><span>${escapeHtml(t.proportion_batch_size)}</span><b>${state.batch}</b></div>
        <div><span>${escapeHtml(t.proportion_accum_total)}</span><b>${total}</b></div>
        <div><span>${escapeHtml(t.proportion_mean_phat)}</span><b>${fmt(m)}</b></div>
        <div><span>${escapeHtml(t.proportion_theory_mean)}</span><b>${state.p.toFixed(4)}</b></div>
        <div><span>${escapeHtml(t.proportion_std_phat)}</span><b>${fmt(s)}</b></div>
        <div><span>${escapeHtml(t.proportion_theory_se)}</span><b>${fmt(se)}</b></div>
      </div>
    `;
  }

  function renderHint() {
    const el = document.getElementById('propHint');
    el.textContent = translations[lang].proportion_click_btn;
  }

  /* ---------- 统一渲染 ---------- */
  function renderAll() {
    renderPopulation();
    renderSample();
    renderSampling();
    renderStats();
    renderHint();
  }

  /* ---------- 页面显隐：补充 scatterplot.js 未覆盖的 proportion 工具 ---------- */
  function showProportionPage(show) {
    const myPage = document.getElementById('proportionPage');
    if (!myPage) return;
    if (show) {
      // 隐藏其它工具页面
      ['correlationPage', 'scatterPage', 'outlierPage', 'linearPage', 'samplingPage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
      });
      myPage.hidden = false;
      document.querySelectorAll('[data-tool]').forEach(btn => {
        const active = btn.dataset.tool === 'proportion';
        btn.classList.toggle('active', active);
        if (active) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
      });
      document.title = `AP Stats Hub · ${translations[lang].proportion_title}`;
      renderAll();
    }
  }

  /* ---------- 初始化 ---------- */
  function init() {
    buildUI();
    renderAll();
    // 监听导航按钮（在 scatterplot.js 的 showTool 之后执行，覆盖它的隐藏逻辑）
    const nav = document.getElementById('proportionNav');
    if (nav) {
      nav.addEventListener('click', () => {
        // 用 setTimeout 让 scatterplot.js 的 showTool 先跑完，再覆盖
        setTimeout(() => showProportionPage(true), 0);
      });
    }
    // 切到其它工具时，隐藏本页
    document.addEventListener('apstats:tool', e => {
      if (e.detail !== 'proportion') {
        const myPage = document.getElementById('proportionPage');
        if (myPage) myPage.hidden = true;
      } else {
        showProportionPage(true);
      }
    });
    // 语言切换时刷新文本与统计面板
    document.addEventListener('apstats:language', () => {
      // applyLang 已处理 data-i18n；这里刷新 JS 生成的文本
      renderAll();
    });
  }

  init();
})();