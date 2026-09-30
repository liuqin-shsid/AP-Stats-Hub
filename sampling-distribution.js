/* Sampling Distribution & Central Limit Theorem demo (SVG, no libraries).
 * Uses the same i18n pattern as other tools. */
(() => {
  Object.assign(translations.zh, {
    sampling_title: '抽样分布',
    sampling_desc: '从总体分布出发，观察样本分布与样本均值的抽样分布如何随样本量变化；演示中心极限定理。',
    sampling_custom: '自定义绘制',
    sampling_normal: '正态分布',
    sampling_uniform: '均匀分布',
    sampling_size: '样本量 n',
    sampling_draw_hint: '提示：选择“自定义绘制”后，在左侧总体分布图上按住鼠标左键拖动即可描绘分布曲线。',
    sampling_draw_hint_active: '正在绘制：松开鼠标完成本次编辑；再次按住可继续修改。',
    sampling_pop_title: '(1) 总体分布 Population Distribution',
    sampling_pop_ylabel: 'Frequency',
    sampling_pop_ylabel_draw: 'Density (drawn)',
    sampling_samp_title: '(2) 样本分布 Sample Distribution',
    sampling_mean_title: '(3) 样本均值的抽样分布 Sampling Distribution of the Sample Mean',
    sampling_rel_freq: 'Relative Frequency',
    sampling_sample_mean: 'Sample mean',
    sampling_pop_stats: 'Population Parameters',
    sampling_sample_stats: 'Sample Statistics (latest)',
    sampling_sampling_stats: 'Sampling Distribution for Means',
    sampling_mu: '均值 μ',
    sampling_sigma2: '方差 σ²',
    sampling_sigma: '标准差 σ',
    sampling_N: '总体大小 N',
    sampling_n: '样本量 n',
    sampling_mean: '样本均值 x̄',
    sampling_var: '样本方差 s²',
    sampling_std: '样本标准差 s',
    sampling_k: '抽样次数 k',
    sampling_mean_of_mean: 'x̄ 的均值',
    sampling_var_of_mean: 'x̄ 的方差',
    sampling_std_of_mean: 'x̄ 的标准差',
    sampling_SE: '理论标准误 σ/√n',
    sampling_no_data: '暂无数据。',
    sampling_no_sample: '尚未抽样。',
    sampling_reset: '重置',
    sampling_chart_aria: '总体、样本与抽样分布演示',
  });
  Object.assign(translations.en, {
    sampling_title: 'Sampling Distribution',
    sampling_desc: 'Start from a population distribution and watch how the sample distribution and the sampling distribution of the mean evolve, illustrating the Central Limit Theorem.',
    sampling_custom: 'Custom (draw)',
    sampling_normal: 'Normal',
    sampling_uniform: 'Uniform',
    sampling_size: 'Sample size n',
    sampling_draw_hint: 'Tip: choose "Custom (draw)" and hold the left mouse button on the population plot to sketch a distribution.',
    sampling_draw_hint_active: 'Drawing… release to finish this stroke; press again to continue editing.',
    sampling_pop_title: '(1) Population Distribution',
    sampling_pop_ylabel: 'Frequency',
    sampling_pop_ylabel_draw: 'Density (drawn)',
    sampling_samp_title: '(2) Sample Distribution',
    sampling_mean_title: '(3) Sampling Distribution of the Sample Mean',
    sampling_rel_freq: 'Relative Frequency',
    sampling_sample_mean: 'Sample mean',
    sampling_pop_stats: 'Population Parameters',
    sampling_sample_stats: 'Sample Statistics (latest)',
    sampling_sampling_stats: 'Sampling Distribution for Means',
    sampling_mu: 'Mean μ',
    sampling_sigma2: 'Variance σ²',
    sampling_sigma: 'Std dev σ',
    sampling_N: 'Population size N',
    sampling_n: 'Sample size n',
    sampling_mean: 'Sample mean x̄',
    sampling_var: 'Sample variance s²',
    sampling_std: 'Sample std s',
    sampling_k: '# samples k',
    sampling_mean_of_mean: 'Mean of x̄',
    sampling_var_of_mean: 'Var of x̄',
    sampling_std_of_mean: 'Std of x̄',
    sampling_SE: 'Theory SE σ/√n',
    sampling_no_data: 'No data yet.',
    sampling_no_sample: 'No sample yet.',
    sampling_reset: 'Reset',
    sampling_chart_aria: 'Population, sample, and sampling distribution demo',
  });

  const page = document.getElementById('samplingPage');
  if (!page) return;
  const $id = (id) => document.getElementById(id);

  const svgPop  = $id('samplingPopChart');
  const svgSamp = $id('samplingSampChart');
  const svgMean = $id('samplingMeanChart');
  const radioCustom  = $id('samplingRadioCustom');
  const radioNormal  = $id('samplingRadioNormal');
  const radioUniform = $id('samplingRadioUniform');
  const sliderN = $id('samplingSliderN');
  const sliderNValue = $id('samplingSliderNValue');
  const hintEl = $id('samplingHint');
  const txtPop = $id('samplingPopStats');
  const txtSamp = $id('samplingSampStats');
  const txtMean = $id('samplingMeanStats');
  const btnReset = $id('samplingReset');
  const btns = {
    1:     $id('samplingBtn1'),
    10:    $id('samplingBtn10'),
    20:    $id('samplingBtn20'),
    50:    $id('samplingBtn50'),
    100:   $id('samplingBtn100'),
    1000:  $id('samplingBtn1000'),
    10000: $id('samplingBtn10000'),
  };

  const chartPop  = { w: 340, h: 260, m: { left: 42, right: 12, top: 22, bottom: 34 } };
  const chartSamp = { w: 340, h: 260, m: { left: 42, right: 12, top: 22, bottom: 34 } };
  const chartMean = { w: 720, h: 260, m: { left: 46, right: 12, top: 22, bottom: 34 } };

  const XMIN = 0, XMAX = 10;
  const POP_BINS = 60, SAMP_BINS = 20, MEAN_BINS = 30;

  let popType = 'normal';
  let population = null;
  let popCurveX = [], popCurveY = [];
  let isDrawing = false;
  let sampleMeans = [];
  let lastSample = null;

  const mean = (arr) => { let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i]; return arr.length ? s / arr.length : 0; };
  const variance = (arr, ddof = 0) => {
    if (!arr || arr.length <= ddof) return 0;
    const m = mean(arr); let s = 0;
    for (let i = 0; i < arr.length; i++) s += (arr[i] - m) ** 2;
    return s / (arr.length - ddof);
  };
  const std = (arr, ddof = 0) => Math.sqrt(variance(arr, ddof));
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function generatePopulation() {
    const n = 100000;
    const out = new Float64Array(n);
    if (popType === 'normal') {
      for (let i = 0; i < n; i++) out[i] = 5 + 1.5 * randn();
    } else if (popType === 'uniform') {
      for (let i = 0; i < n; i++) out[i] = 1 + 9 * Math.random();
    } else {
      population = null; return;
    }
    population = out;
  }

  function rebuildPopulationFromCurve() {
    if (popCurveX.length < 5) { population = null; return; }
    let area = 0;
    for (let i = 1; i < popCurveX.length; i++)
      area += 0.5 * (popCurveY[i] + popCurveY[i - 1]) * (popCurveX[i] - popCurveX[i - 1]);
    if (!(area > 0)) { population = null; return; }
    const pdf = popCurveY.map(v => v / area);
    const cdf = new Float64Array(popCurveX.length);
    cdf[0] = 0;
    for (let i = 1; i < popCurveX.length; i++)
      cdf[i] = cdf[i - 1] + 0.5 * (pdf[i] + pdf[i - 1]) * (popCurveX[i] - popCurveX[i - 1]);
    const last = cdf[cdf.length - 1] || 1;
    for (let i = 0; i < cdf.length; i++) cdf[i] /= last;
    const n = 100000;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const u = Math.random();
      let lo = 0, hi = cdf.length - 1;
      while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (cdf[mid] <= u) lo = mid; else hi = mid;
      }
      const t = (u - cdf[lo]) / ((cdf[hi] - cdf[lo]) || 1);
      out[i] = popCurveX[lo] + t * (popCurveX[hi] - popCurveX[lo]);
    }
    population = out;
  }

  function histogram(data, bins, lo, hi) {
    const counts = new Float64Array(bins);
    const binW = (hi - lo) / bins;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (v < lo || v > hi) continue;
      let idx = Math.floor((v - lo) / binW);
      if (idx < 0) idx = 0;
      if (idx >= bins) idx = bins - 1;
      counts[idx]++;
    }
    return { counts, binW };
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  function clearSVG(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function mk(tag, attrs = {}) {
    const el = document.createElementNS(svgNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  const scale = (v, d0, d1, a, b) => a + (v - d0) * (b - a) / ((d1 - d0) || 1);
  const fmtShort = (v) => {
    const a = Math.abs(v);
    if (a >= 1000) return v.toFixed(0);
    if (a >= 10) return v.toFixed(2);
    if (a >= 1) return v.toFixed(2);
    return v.toFixed(3);
  };

  function drawAxes(svg, chart, xLo, xHi, yLo, yHi, xLabel, yLabel) {
    clearSVG(svg);
    const { w, h, m } = chart;
    const xTicks = 6;
    for (let i = 0; i < xTicks; i++) {
      const xv = xLo + (xHi - xLo) * i / (xTicks - 1);
      const px = scale(xv, xLo, xHi, m.left, w - m.right);
      svg.appendChild(mk('line', { x1: px, y1: m.top, x2: px, y2: h - m.bottom, class: 'grid' }));
      svg.appendChild(mk('text', { x: px, y: h - m.bottom + 16, 'text-anchor': 'middle', class: 'tick' })).textContent = fmtShort(xv);
    }
    const yTicks = 5;
    for (let i = 0; i < yTicks; i++) {
      const yv = yLo + (yHi - yLo) * i / (yTicks - 1);
      const py = scale(yv, yLo, yHi, h - m.bottom, m.top);
      svg.appendChild(mk('line', { x1: m.left, y1: py, x2: w - m.right, y2: py, class: 'grid' }));
      svg.appendChild(mk('text', { x: m.left - 6, y: py + 4, 'text-anchor': 'end', class: 'tick' })).textContent = fmtShort(yv);
    }
    svg.appendChild(mk('line', { x1: m.left, y1: h - m.bottom, x2: w - m.right, y2: h - m.bottom, class: 'axis' }));
    svg.appendChild(mk('line', { x1: m.left, y1: m.top, x2: m.left, y2: h - m.bottom, class: 'axis' }));
    svg.appendChild(mk('text', { x: (m.left + w - m.right) / 2, y: h - 4, 'text-anchor': 'middle', class: 'axis-label' })).textContent = xLabel;
    const yLab = mk('text', { x: -((m.top + h - m.bottom) / 2), y: 12, 'text-anchor': 'middle', class: 'axis-label', transform: 'rotate(-90)' });
    yLab.textContent = yLabel;
    svg.appendChild(yLab);
  }

  function drawPopulation() {
    if (popType === 'custom' && popCurveX.length > 0) {
      drawAxes(svgPop, chartPop, XMIN, XMAX, 0, 1.0, 'x', translations[lang].sampling_pop_ylabel_draw);
      const { w, h, m } = chartPop;
      const path = popCurveX.map((xv, i) => {
        const px = scale(xv, XMIN, XMAX, m.left, w - m.right);
        const py = scale(popCurveY[i], 0, 1.0, h - m.bottom, m.top);
        return `${i === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`;
      }).join(' ');
      svgPop.appendChild(mk('path', { d: path, fill: 'rgba(40,120,184,0.25)', stroke: 'steelblue', 'stroke-width': 2 }));
      return;
    }
    if (!population) {
      drawAxes(svgPop, chartPop, XMIN, XMAX, 0, 1.0, 'x', translations[lang].sampling_pop_ylabel);
      svgPop.appendChild(mk('text', { x: chartPop.w / 2, y: chartPop.h / 2, 'text-anchor': 'middle', class: 'axis-label' })).textContent = translations[lang].sampling_no_data;
      return;
    }
    const { counts, binW } = histogram(population, POP_BINS, XMIN, XMAX);
    const maxCount = Math.max(1, ...counts);
    drawAxes(svgPop, chartPop, XMIN, XMAX, 0, maxCount * 1.05, 'x', translations[lang].sampling_pop_ylabel);
    const { w, h, m } = chartPop;
    for (let i = 0; i < counts.length; i++) {
      if (!counts[i]) continue;
      const xL = XMIN + i * binW, xR = xL + binW;
      const pxL = scale(xL, XMIN, XMAX, m.left, w - m.right);
      const pxR = scale(xR, XMIN, XMAX, m.left, w - m.right);
      const pyT = scale(counts[i], 0, maxCount * 1.05, h - m.bottom, m.top);
      svg