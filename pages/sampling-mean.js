/* Sampling Distribution for Means — 浏览器版 CLT 演示
 * 对应原 Python 文件 Sampling-Distribution-for-means.py。
 * 不依赖任何外部库；仅使用 SVG + 原生 JS。
 * 与已有工具通过 apstats:tool / apstats:language 事件协作。
 */
(() => {
  /* ---------- i18n ---------- */
  Object.assign(translations.zh, {
    sampling_title: '样本均值的抽样分布',
    sampling_desc: '比较总体分布、单次样本分布与样本均值的抽样分布，直观理解中心极限定理。',
    sampling_population: '(1) 总体分布',
    sampling_sample: '(2) 样本分布',
    sampling_sampling: '(3) 样本均值的抽样分布',
    sampling_ylabel_freq: '频数',
    sampling_ylabel_rel: '相对频数',
    sampling_ylabel_density: '密度（绘制）',
    sampling_xlabel_x: 'x',
    sampling_xlabel_mean: '样本均值',
    sampling_sample_size: '样本量 n',
    sampling_dist_type: '总体类型',
    sampling_custom: '自定义（绘制）',
    sampling_normal: '正态',
    sampling_uniform: '均匀',
    sampling_draw_hint: '在“(1) 总体分布”区域内按住鼠标左键拖动，画出一条曲线；松开后自动生成总体。',
    sampling_draw_hint_active: '正在绘制：拖动鼠标继续；松开后自动生成总体。',
    sampling_click_sample: '点击上方按钮进行抽样。',
    sampling_reset: '重置',
    sampling_reset_samples: '清除样本',
    sampling_pop_params: '总体参数',
    sampling_sample_stats: '样本统计量（最近一次）',
    sampling_sampling_stats: '样本均值的抽样分布',
    sampling_mu: 'μ',
    sampling_sigma2: 'σ²',
    sampling_sigma: 'σ',
    sampling_n_pop: 'N',
    sampling_n_sample: 'n',
    sampling_mean: '均值',
    sampling_var: '方差',
    sampling_sd: '标准差',
    sampling_s2: 's²',
    sampling_s: 's',
    sampling_k: 'k',
    sampling_se_theory: 'SE 理论值',
    sampling_no_data: '暂无数据。',
    sampling_no_sample: '暂无样本。',
    sampling_no_sampling: '暂无抽样。',
    sampling_draw_too_short: '曲线太短，请多拖一些再松开。',
    sampling_draw_invalid: '曲线下面积为零，无法生成总体。',
  });
  Object.assign(translations.en, {
    sampling_title: 'Sampling Distribution for Means',
    sampling_desc: 'Compare the population, a single sample, and the sampling distribution of the mean to see the Central Limit Theorem in action.',
    sampling_population: '(1) Population Distribution',
    sampling_sample: '(2) Sample Distribution',
    sampling_sampling: '(3) Sampling Distribution of the Sample Mean',
    sampling_ylabel_freq: 'Frequency',
    sampling_ylabel_rel: 'Relative Frequency',
    sampling_ylabel_density: 'Density (drawn)',
    sampling_xlabel_x: 'x',
    sampling_xlabel_mean: 'Sample mean',
    sampling_sample_size: 'Sample size n',
    sampling_dist_type: 'Population type',
    sampling_custom: 'Custom (draw)',
    sampling_normal: 'Normal',
    sampling_uniform: 'Uniform',
    sampling_draw_hint: 'Press and drag with the left mouse button inside plot (1) to draw a density curve; release to build the population.',
    sampling_draw_hint_active: 'Drawing… keep dragging; release to build the population.',
    sampling_click_sample: 'Click a sampling button above.',
    sampling_reset: 'Reset',
    sampling_reset_samples: 'Clear samples',
    sampling_pop_params: 'Population Parameters',
    sampling_sample_stats: 'Sample Statistics (latest)',
    sampling_sampling_stats: 'Sampling Distribution for Means',
    sampling_mu: 'mu',
    sampling_sigma2: 'sigma^2',
    sampling_sigma: 'sigma',
    sampling_n_pop: 'N',
    sampling_n_sample: 'n',
    sampling_mean: 'mean',
    sampling_var: 'var',
    sampling_sd: 'std',
    sampling_s2: 's^2',
    sampling_s: 's',
    sampling_k: 'k',
    sampling_se_theory: 'SE th.',
    sampling_no_data: 'No data yet.',
    sampling_no_sample: 'No sample yet.',
    sampling_no_sampling: 'No sampling yet.',
    sampling_draw_too_short: 'The curve is too short; drag farther before releasing.',
    sampling_draw_invalid: 'The area under the curve is zero; cannot build a population.',
  });

  /* ---------- 常量 ---------- */
  const XMIN = 0, XMAX = 10;
  const DRAW_YMIN = 0, DRAW_YMAX = 1;
  const POP_N = 100000;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const COLORS = {
    pop: 'steelblue',
    sample: 'orange',
    sampling: 'mediumseagreen',
    grid: '#dfe6eb',
    axis: '#50606d',
    tick: '#5b6874',
    label: '#263844',
  };

  /* ---------- 状态 ---------- */
  const state = {
    popType: 'normal',
    population: null,
    popX: [],
    popY: [],
    isDrawing: false,
    sampleSize: 30,
    sampleMeans: [],
    lastSample: null,
    sampleCount: 0,
  };

  /* ---------- 工具函数 ---------- */
  const rand = () => Math.random();

  function normalRandom(mu, sigma) {
    // Box–Muller
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function mean(arr) {
    if (!arr.length) return NaN;
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }
  function variance(arr, ddof = 0) {
    if (arr.length <= ddof) return NaN;
    const m = mean(arr);
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += (arr[i] - m) ** 2;
    return s / (arr.length - ddof);
  }
  const sd = (arr, ddof = 0) => Math.sqrt(variance(arr, ddof));
  const fmt = (v, digits = 4) => (Number.isFinite(v) ? v.toFixed(digits) : '—');
  const intFmt = (v) => (Number.isFinite(v) ? v.toLocaleString() : '—');
  const escapeHtml = (v) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  function buildPopulationFromCurve(xs, ys) {
    if (xs.length < 5) return null;
    // 梯形积分
    let area = 0;
    for (let i = 0; i < xs.length - 1; i++) {
      area += (ys[i] + ys[i + 1]) / 2 * (xs[i + 1] - xs[i]);
    }
    if (!(area > 0)) return null;
    const pdf = ys.map(y => y / area);
    const cdf = [0];
    for (let i = 0; i < xs.length - 1; i++) {
      const dx = xs[i + 1] - xs[i];
      const mid = (pdf[i] + pdf[i + 1]) / 2;
      cdf.push(cdf[cdf.length - 1] + mid * dx);
    }
    const total = cdf[cdf.length - 1];
    if (!(total > 0)) return null;
    for (let i = 0; i < cdf.length; i++) cdf[i] /= total;
    // 逆变换采样
    const out = new Float64Array(POP_N);
    for (let i = 0; i < POP_N; i++) {
      const u = rand();
      // 二分查找
      let lo = 0, hi = cdf.length - 1;
      while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (cdf[mid] <= u) lo = mid; else hi = mid;
      }
      const t = (u - cdf[lo]) / (cdf[hi] - cdf[lo] || 1);
      out[i] = xs[lo] + t * (xs[hi] - xs[lo]);
    }
    return out;
  }

  /* ---------- DOM 注入 ---------- */
  function buildUI() {
    const root = document.getElementById('samplingPage');
    root.innerHTML = `
      <div class="page-heading">
        <div><h1 data-i18n="sampling_title">样本均值的抽样分布</h1><p data-i18n="sampling_desc"></p></div>
      </div>
      <section class="controls sampling-controls" data-i18n-aria="controls_aria">
        <label class="sampling-slider">
          <span data-i18n="sampling_sample_size">样本量 n</span>
          <input id="samplingN" type="range" min="2" max="100" step="1" value="30">
          <output id="samplingNValue">30</output>
        </label>
        <fieldset class="sampling-radio">
          <legend data-i18n="sampling_dist_type">总体类型</legend>
          <label><input type="radio" name="samplingPopType" value="custom"> <span data-i18n="sampling_custom">自定义（绘制）</span></label>
          <label><input type="radio" name="samplingPopType" value="normal" checked> <span data-i18n="sampling_normal">正态</span></label>
          <label><input type="radio" name="samplingPopType" value="uniform"> <span data-i18n="sampling_uniform">均匀</span></label>
        </fieldset>
        <div class="sampling-buttons">
          <button type="button" class="secondary-button" data-sample="1">×1</button>
          <button type="button" class="secondary-button" data-sample="10">×10</button>
          <button type="button" class="secondary-button" data-sample="20">×20</button>
          <button type="button" class="secondary-button" data-sample="50">×50</button>
          <button type="button" class="secondary-button" data-sample="100">×100</button>
          <button type="button" class="secondary-button" data-sample="1000">×1000</button>
          <button type="button" class="secondary-button" data-sample="10000">×10000</button>
        </div>
        <button id="samplingResetSamples" class="reset" type="button" data-i18n="sampling_reset_samples">清除样本</button>
        <button id="samplingResetAll" class="reset" type="button" data-i18n="sampling_reset">重置</button>
      </section>
      <p id="samplingHint" class="hint" role="status"></p>
      <div class="sampling-grid">
        <section class="sampling-panel">
          <h2 data-i18n="sampling_population">(1) 总体分布</h2>
          <svg id="samplingPopChart" class="sampling-chart" viewBox="0 0 460 340" role="img"></svg>
          <div id="samplingPopStats" class="sampling-stats"></div>
        </section>
        <section class="sampling-panel">
          <h2 data-i18n="sampling_sample">(2) 样本分布</h2>
          <svg id="samplingSampleChart" class="sampling-chart" viewBox="0 0 460 340" role="img"></svg>
          <div id="samplingSampleStats" class="sampling-stats"></div>
        </section>
        <section class="sampling-panel">
          <h2 data-i18n="sampling_sampling">(3) 样本均值的抽样分布</h2>
          <svg id="samplingSamplingChart" class="sampling-chart" viewBox="0 0 460 340" role="img"></svg>
          <div id="samplingSamplingStats" class="sampling-stats"></div>
        </section>
      </div>
    `;
    // 事件
    document.getElementById('samplingN').addEventListener('input', e => {
      state.sampleSize = Number(e.target.value);
      document.getElementById('samplingNValue').textContent = String(state.sampleSize);
    });
    document.querySelectorAll('input[name="samplingPopType"]').forEach(r => {
      r.addEventListener('change', () => {
        state.popType = r.value;
        if (state.popType === 'custom') {
          if (state.popX.length > 0) {
            state.population = buildPopulationFromCurve(state.popX, state.popY);
          } else {
            state.population = null;
          }
        } else if (state.popType === 'normal') {
          generateNormalPopulation();
        } else if (state.popType === 'uniform') {
          generateUniformPopulation();
        }
        state.lastSample = null;
        state.sampleMeans = [];
        state.sampleCount = 0;
        renderAll();
      });
    });
    document.querySelectorAll('[data-sample]').forEach(btn => {
      btn.addEventListener('click', () => doSampling(Number(btn.dataset.sample)));
    });
    document.getElementById('samplingResetSamples').addEventListener('click', () => {
      state.lastSample = null;
      state.sampleMeans = [];
      state.sampleCount = 0;
      renderAll();
    });
    document.getElementById('samplingResetAll').addEventListener('click', () => {
      state.popX = [];
      state.popY = [];
      state.population = null;
      state.lastSample = null;
      state.sampleMeans = [];
      state.sampleCount = 0;
      if (state.popType === 'normal') generateNormalPopulation();
      else if (state.popType === 'uniform') generateUniformPopulation();
      renderAll();
    });
    // 鼠标绘制
    const popSvg = document.getElementById('samplingPopChart');
    popSvg.addEventListener('pointerdown', onPopPointerDown);
    popSvg.addEventListener('pointermove', onPopPointerMove);
    popSvg.addEventListener('pointerup', onPopPointerUp);
    popSvg.addEventListener('pointercancel', onPopPointerUp);
    popSvg.addEventListener('pointerleave', onPopPointerUp);
  }

  /* ---------- 总体生成 ---------- */
  function generateNormalPopulation() {
    const out = new Float64Array(POP_N);
    for (let i = 0; i < POP_N; i++) {
      let v = normalRandom(5, 1.5);
      while (v < XMIN || v > XMAX) v = normalRandom(5, 1.5);
      out[i] = v;
    }
    state.population = out;
  }
  function generateUniformPopulation() {
    const out = new Float64Array(POP_N);
    for (let i = 0; i < POP_N; i++) out[i] = 1 + rand() * 8;
    state.population = out;
  }

  /* ---------- 坐标映射 ---------- */
  const CHART = { w: 460, h: 340, m: { left: 56, right: 18, top: 14, bottom: 44 } };
  const innerW = () => CHART.w - CHART.m.left - CHART.m.right;
  const innerH = () => CHART.h - CHART.m.top - CHART.m.bottom;
  function makeScale(domain, range) {
    return v => range[0] + (v - domain[0]) * (range[1] - range[0]) / (domain[1] - domain[0] || 1);
  }
  function niceTicks(lo, hi, count = 5) {
    if (!(hi > lo)) return [lo];
    const out = [];
    for (let i = 0; i < count; i++) out.push(lo + (hi - lo) * i / (count - 1));
    return out;
  }

  /* ---------- 绘图原语 ---------- */
  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function clearSvg(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }

  function drawAxes(svg, xDomain, yDomain, opts = {}) {
    const { xlabel, ylabel, xTickCount = 5, yTickCount = 5 } = opts;
    const sx = makeScale(xDomain, [CHART.m.left, CHART.w - CHART.m.right]);
    const sy = makeScale(yDomain, [CHART.h - CHART.m.bottom, CHART.m.top]);
    // 网格
    niceTicks(xDomain[0], xDomain[1], xTickCount).forEach(v => {
      const x = sx(v);
      svg.appendChild(svgEl('line', { class: 'grid', x1: x, y1: CHART.m.top, x2: x, y2: CHART.h - CHART.m.bottom }));
      const t = svgEl('text', { class: 'tick', x, y: CHART.h - CHART.m.bottom + 18, 'text-anchor': 'middle' });
      t.textContent = fmt(v, 1);
      svg.appendChild(t);
    });
    niceTicks(yDomain[0], yDomain[1], yTickCount).forEach(v => {
      const y = sy(v);
      svg.appendChild(svgEl('line', { class: 'grid', x1: CHART.m.left, y1: y, x2: CHART.w - CHART.m.right, y2: y }));
      const t = svgEl('text', { class: 'tick', x: CHART.m.left - 8, y: y + 4, 'text-anchor': 'end' });
      t.textContent = fmt(v, 2);
      svg.appendChild(t);
    });
    // 轴
    svg.appendChild(svgEl('path', {
      class: 'axis', fill: 'none',
      d: `M ${CHART.m.left} ${CHART.m.top} V ${CHART.h - CHART.m.bottom} H ${CHART.w - CHART.m.right}`,
    }));
    if (xlabel) {
      const t = svgEl('text', { class: 'axis-label', x: (CHART.m.left + CHART.w - CHART.m.right) / 2, y: CHART.h - 8, 'text-anchor': 'middle' });
      t.textContent = xlabel;
      svg.appendChild(t);
    }
    if (ylabel) {
      const t = svgEl('text', { class: 'axis-label', transform: `translate(14 ${(CHART.m.top + CHART.h - CHART.m.bottom) / 2}) rotate(-90)`, 'text-anchor': 'middle' });
      t.textContent = ylabel;
      svg.appendChild(t);
    }
    return { sx, sy };
  }

  function drawHistogram(svg, data, xDomain, mode = 'frequency', color = COLORS.pop, bins = 30, yMaxOverride = null) {
    const finite = Array.from(data).filter(Number.isFinite);
    if (!finite.length) return { yMax: 1 };
    const lo = xDomain[0], hi = xDomain[1];
    const binWidth = (hi - lo) / bins;
    const counts = new Array(bins).fill(0);
    for (const v of finite) {
      if (v < lo || v > hi) continue;
      let idx = Math.floor((v - lo) / binWidth);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      counts[idx]++;
    }
    let heights, yMax;
    if (mode === 'relative') {
      const total = counts.reduce((a, b) => a + b, 0) || 1;
      heights = counts.map(c => c / total);
      yMax = Math.max(...heights, 1e-9);
    } else {
      heights = counts;
      yMax = Math.max(...heights, 1);
    }
    if (yMaxOverride) yMax = yMaxOverride;
    const yDomain = [0, yMax * 1.05];
    const { sx, sy } = { sx: makeScale(xDomain, [CHART.m.left, CHART.w - CHART.m.right]), sy: makeScale(yDomain, [CHART.h - CHART.m.bottom, CHART.m.top]) };
    for (let i = 0; i < bins; i++) {
      if (!heights[i]) continue;
      const x0 = lo + i * binWidth, x1 = x0 + binWidth;
      const x = sx(x0), y = sy(heights[i]);
      const w = sx(x1) - x;
      const h = (CHART.h - CHART.m.bottom) - y;
      svg.appendChild(svgEl('rect', { x, y, width: w, height: h, fill: color, 'fill-opacity': 0.72, stroke: '#1d2935', 'stroke-width': 0.4 }));
    }
    return { yMax };
  }

  function drawCurve(svg, xs, ys, color = COLORS.pop) {
    if (!xs.length) return;
    const sx = makeScale([XMIN, XMAX], [CHART.m.left, CHART.w - CHART.m.right]);
    const sy = makeScale([DRAW_YMIN, DRAW_YMAX], [CHART.h - CHART.m.bottom, CHART.m.top]);
    let d = '';
    for (let i = 0; i < xs.length; i++) {
      d += (i ? ' L ' : 'M ') + sx(xs[i]) + ' ' + sy(ys[i]);
    }
    svg.appendChild(svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.4 }));
    // 填充
    let fill = `M ${sx(xs[0])} ${sy(0)}`;
    for (let i = 0; i < xs.length; i++) fill += ' L ' + sx(xs[i]) + ' ' + sy(ys[i]);
    fill += ` L ${sx(xs[xs.length - 1])} ${sy(0)} Z`;
    svg.appendChild(svgEl('path', { d: fill, fill: color, 'fill-opacity': 0.3, stroke: 'none' }));
  }

  /* ---------- 三个面板渲染 ---------- */
  function renderPopulation() {
    const svg = document.getElementById('samplingPopChart');
    clearSvg(svg);
    const t = translations[lang];
    const isCustom = state.popType === 'custom';
    const xDomain = [XMIN, XMAX];
    if (isCustom) {
      const yDomain = [DRAW_YMIN, DRAW_YMAX];
      drawAxes(svg, xDomain, yDomain, {
        xlabel: t.sampling_xlabel_x,
        ylabel: t.sampling_ylabel_density,
        yTickCount: 5,
      });
      if (state.popX.length) drawCurve(svg, state.popX, state.popY);
    } else {
      // 先用一个占位轴，拿到 yMax 后再重画
      const temp = svgEl('g', {});
      svg.appendChild(temp);
      const data = state.population ? Array.from(state.population).filter(v => v >= XMIN && v <= XMAX) : [];
      // 计算 yMax
      const bins = 80;
      const lo = XMIN, hi = XMAX;
      const binWidth = (hi - lo) / bins;
      const counts = new Array(bins).fill(0);
      for (const v of data) {
        let idx = Math.floor((v - lo) / binWidth);
        if (idx >= bins) idx = bins - 1;
        if (idx < 0) idx = 0;
        counts[idx]++;
      }
      const yMax = Math.max(...counts, 1) * 1.05;
      svg.removeChild(temp);
      drawAxes(svg, xDomain, [0, yMax], {
        xlabel: t.sampling_xlabel_x,
        ylabel: t.sampling_ylabel_freq,
        yTickCount: 5,
      });
      if (data.length) drawHistogram(svg, data, xDomain, 'frequency', COLORS.pop, bins, yMax);
    }
    renderPopulationStats();
  }

  function renderSample() {
    const svg = document.getElementById('samplingSampleChart');
    clearSvg(svg);
    const t = translations[lang];
    const xDomain = [XMIN, XMAX];
    drawAxes(svg, xDomain, [0, 1], {
      xlabel: t.sampling_xlabel_x,
      ylabel: t.sampling_ylabel_rel,
      yTickCount: 5,
    });
    if (state.lastSample) {
      // 计算 relative frequency 的 yMax 后重绘
      const bins = 20;
      const lo = XMIN, hi = XMAX;
      const binWidth = (hi - lo) / bins;
      const counts = new Array(bins).fill(0);
      for (const v of state.lastSample) {
        let idx = Math.floor((v - lo) / binWidth);
        if (idx >= bins) idx = bins - 1;
        if (idx < 0) idx = 0;
        counts[idx]++;
      }
      const total = counts.reduce((a, b) => a + b, 0) || 1;
      const yMax = Math.max(...counts.map(c => c / total), 1e-9) * 1.05;
      clearSvg(svg);
      drawAxes(svg, xDomain, [0, yMax], {
        xlabel: t.sampling_xlabel_x,
        ylabel: t.sampling_ylabel_rel,
        yTickCount: 5,
      });
      drawHistogram(svg, state.lastSample, xDomain, 'relative', COLORS.sample, bins, yMax);
    }
    renderSampleStats();
  }

  function renderSampling() {
    const svg = document.getElementById('samplingSamplingChart');
    clearSvg(svg);
    const t = translations[lang];
    let xDomain;
    if (state.population && state.population.length) {
      const mu = mean(state.population);
      const sigma = sd(state.population);
      xDomain = [mu - 4 * sigma, mu + 4 * sigma];
    } else {
      xDomain = [XMIN, XMAX];
    }
    drawAxes(svg, xDomain, [0, 1], {
      xlabel: t.sampling_xlabel_mean,
      ylabel: t.sampling_ylabel_rel,
      yTickCount: 5,
    });
    if (state.sampleMeans.length) {
      const bins = 30;
      const lo = xDomain[0], hi = xDomain[1];
      const binWidth = (hi - lo) / bins;
      const counts = new Array(bins).fill(0);
      for (const v of state.sampleMeans) {
        let idx = Math.floor((v - lo) / binWidth);
        if (idx >= bins) idx = bins - 1;
        if (idx < 0) idx = 0;
        counts[idx]++;
      }
      const total = counts.reduce((a, b) => a + b, 0) || 1;
      const yMax = Math.max(...counts.map(c => c / total), 1e-9) * 1.05;
      clearSvg(svg);
      drawAxes(svg, xDomain, [0, yMax], {
        xlabel: t.sampling_xlabel_mean,
        ylabel: t.sampling_ylabel_rel,
        yTickCount: 5,
      });
      drawHistogram(svg, state.sampleMeans, xDomain, 'relative', COLORS.sampling, bins, yMax);
    }
    renderSamplingStats();
  }

  /* ---------- 统计面板 ---------- */
  function renderPopulationStats() {
    const t = translations[lang];
    const el = document.getElementById('samplingPopStats');
    if (state.population && state.population.length) {
      const mu = mean(state.population);
      const v = variance(state.population);
      const s = Math.sqrt(v);
      el.innerHTML = `
        <div class="sampling-stats-title">${escapeHtml(t.sampling_pop_params)}</div>
        <div>${escapeHtml(t.sampling_mu)} = ${fmt(mu)}</div>
        <div>${escapeHtml(t.sampling_sigma2)} = ${fmt(v)}</div>
        <div>${escapeHtml(t.sampling_sigma)} = ${fmt(s)}</div>
        <div>${escapeHtml(t.sampling_n_pop)} = ${intFmt(state.population.length)}</div>
      `;
    } else {
      el.innerHTML = `<div class="sampling-stats-title">${escapeHtml(t.sampling_pop_params)}</div><div>${escapeHtml(t.sampling_no_data)}</div>`;
    }
  }
  function renderSampleStats() {
    const t = translations[lang];
    const el = document.getElementById('samplingSampleStats');
    if (state.lastSample && state.lastSample.length) {
      const n = state.lastSample.length;
      const m = mean(state.lastSample);
      const s2 = n > 1 ? variance(state.lastSample, 1) : 0;
      const s = Math.sqrt(s2);
      el.innerHTML = `
        <div class="sampling-stats-title">${escapeHtml(t.sampling_sample_stats)}</div>
        <div>${escapeHtml(t.sampling_n_sample)} = ${n}</div>
        <div>${escapeHtml(t.sampling_mean)} = ${fmt(m)}</div>
        <div>${escapeHtml(t.sampling_s2)} = ${fmt(s2)}</div>
        <div>${escapeHtml(t.sampling_s)} = ${fmt(s)}</div>
      `;
    } else {
      el.innerHTML = `<div class="sampling-stats-title">${escapeHtml(t.sampling_sample_stats)}</div><div>${escapeHtml(t.sampling_no_sample)}</div><div>${escapeHtml(t.sampling_click_sample)}</div>`;
    }
  }
  function renderSamplingStats() {
    const t = translations[lang];
    const el = document.getElementById('samplingSamplingStats');
    const k = state.sampleMeans.length;
    if (k > 0) {
      const m = mean(state.sampleMeans);
      const v = k > 1 ? variance(state.sampleMeans, 1) : 0;
      const s = Math.sqrt(v);
      let seTheory = 0;
      if (state.population && state.population.length) {
        seTheory = sd(state.population) / Math.sqrt(state.sampleSize);
      }
      el.innerHTML = `
        <div class="sampling-stats-title">${escapeHtml(t.sampling_sampling_stats)}</div>
        <div>${escapeHtml(t.sampling_k)} = ${intFmt(k)}</div>
        <div>${escapeHtml(t.sampling_mean)} = ${fmt(m)}</div>
        <div>${escapeHtml(t.sampling_var)} = ${fmt(v)}</div>
        <div>${escapeHtml(t.sampling_sd)} = ${fmt(s)}</div>
        <div>${escapeHtml(t.sampling_se_theory)} = ${fmt(seTheory)}</div>
      `;
    } else {
      el.innerHTML = `<div class="sampling-stats-title">${escapeHtml(t.sampling_sampling_stats)}</div><div>${escapeHtml(t.sampling_no_sampling)}</div><div>${escapeHtml(t.sampling_click_sample)}</div>`;
    }
  }

  /* ---------- 抽样 ---------- */
  function doSampling(k) {
    if (!state.population || !state.population.length) return;
    const n = state.sampleSize;
    const N = state.population.length;
    let lastSample = null;
    for (let s = 0; s < k; s++) {
      const sample = new Float64Array(n);
      for (let i = 0; i < n; i++) sample[i] = state.population[(Math.random() * N) | 0];
      state.sampleMeans.push(mean(sample));
      lastSample = sample;
    }
    state.lastSample = lastSample;
    state.sampleCount += k;
    renderAll();
  }

  /* ---------- 鼠标绘制总体 ---------- */
  function clientToSvg(svg, clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) * CHART.w / rect.width;
    const y = (clientY - rect.top) * CHART.h / rect.height;
    return { x, y };
  }
  function svgToData(x, y) {
    const dataX = scale(x, [CHART.m.left, CHART.w - CHART.m.right], XMIN, XMAX);
    const dataY = scale(y, [CHART.h - CHART.m.bottom, CHART.m.top], DRAW_YMIN, DRAW_YMAX);
    return { x: dataX, y: Math.max(DRAW_YMIN, Math.min(DRAW_YMAX, dataY)) };
  }
  function scale(v, d, a, b) { return a + (v - d[0]) * (b - a) / (d[1] - d[0] || 1); }

  let drawingPointerId = null;

  function onPopPointerDown(e) {
    if (state.popType !== 'custom') return;
    if (e.button !== undefined && e.button !== 0) return;
    const svg = e.currentTarget;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    if (x < CHART.m.left || x > CHART.w - CHART.m.right) return;
    if (y < CHART.m.top || y > CHART.h - CHART.m.bottom) return;
    e.preventDefault();
    drawingPointerId = e.pointerId;
    svg.setPointerCapture(e.pointerId);
    state.isDrawing = true;
    const p = svgToData(x, y);
    // 如果点到了已有曲线的左边，就截断
    if (state.popX.length && p.x < state.popX[state.popX.length - 1]) {
      const idx = state.popX.findIndex(v => v > p.x);
      if (idx >= 0) {
        state.popX = state.popX.slice(0, idx);
        state.popY = state.popY.slice(0, idx);
      } else {
        state.popX = [];
        state.popY = [];
      }
    }
    state.popX.push(p.x);
    state.popY.push(p.y);
    updateHint();
    renderPopulation();
  }
  function onPopPointerMove(e) {
    if (!state.isDrawing || e.pointerId !== drawingPointerId) return;
    const svg = e.currentTarget;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    if (x < CHART.m.left || x > CHART.w - CHART.m.right) return;
    const p = svgToData(x, y);
    if (!state.popX.length || p.x <= state.popX[state.popX.length - 1]) return;
    state.popX.push(p.x);
    state.popY.push(p.y);
    renderPopulation();
  }
  function onPopPointerUp(e) {
    if (!state.isDrawing || (e.pointerId !== undefined && e.pointerId !== drawingPointerId)) return;
    const svg = e.currentTarget;
    state.isDrawing = false;
    drawingPointerId = null;
    if (svg.hasPointerCapture && svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    if (state.popX.length < 5) {
      state.population = null;
    } else {
      state.population = buildPopulationFromCurve(state.popX, state.popY);
      if (!state.population) {
        // 面积为零，保留曲线但清空总体
      }
    }
    state.lastSample = null;
    state.sampleMeans = [];
    state.sampleCount = 0;
    updateHint();
    renderAll();
  }

  /* ---------- 统一渲染 ---------- */
  function renderAll() {
    renderPopulation();
    renderSample();
    renderSampling();
  }
  function updateHint() {
    const t = translations[lang];
    const el = document.getElementById('samplingHint');
    if (state.popType === 'custom') {
      el.textContent = state.isDrawing ? t.sampling_draw_hint_active : t.sampling_draw_hint;
    } else {
      el.textContent = t.sampling_click_sample;
    }
  }

  /* ---------- 初始化 ---------- */
  function init() {
    generateNormalPopulation();
    buildUI();
    updateHint();
    renderAll();
  }

  // 与其它工具联动
  document.addEventListener('apstats:tool', e => {
    // 保持与已有工具一致的“切换页面”逻辑；这里只负责在切到本工具时重绘
    if (e.detail === 'sampling') {
      // 页面由 scatterplot.js 的 showTool 控制 hidden 属性
      renderAll();
      updateHint();
    }
  });
  document.addEventListener('apstats:language', () => {
    // 语言切换时刷新提示与统计面板（applyLang 已处理 data-i18n）
    updateHint();
    renderAll();
  });

  init();
})();