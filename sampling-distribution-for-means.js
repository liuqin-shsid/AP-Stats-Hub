/* Sampling Distribution：浏览器版。
   把 Python/matplotlib 版本改成纯前端 SVG + 伪随机抽样。
   依赖 app.js 中的 translations、$、escapeHtml、scale、ticks、fmt 等全局函数。 */
(() => {
  /* ---------- 1. 翻译必须在 applyLang 之前注册 ---------- */
  Object.assign(translations.zh, {
    sampling_title:'抽样分布',
    sampling_desc:'从总体中反复抽样，观察样本均值的抽样分布如何趋近正态。',
    sampling_population:'总体分布',
    sampling_normal:'正态分布',
    sampling_uniform:'均匀分布',
    sampling_custom:'自定义（手绘）',
    sampling_sample_size:'样本量 n',
    sampling_draws:'每次抽样次数',
    sampling_run:'开始抽样',
    sampling_reset:'重置',
    sampling_pop_title:'(1) 总体分布',
    sampling_sample_title:'(2) 最近一次样本',
    sampling_means_title:'(3) 样本均值的抽样分布',
    sampling_pop_aria:'总体分布直方图',
    sampling_sample_aria:'最近一次样本的直方图',
    sampling_means_aria:'样本均值的抽样分布直方图',
    sampling_hint_normal:'当前总体为正态分布。点击“开始抽样”，观察样本均值的分布。',
    sampling_hint_uniform:'当前总体为均匀分布。样本量越大，样本均值的抽样分布越接近正态。',
    sampling_hint_custom:'请在上方总体图中按住鼠标手绘一条密度曲线，松开后生成总体。',
    sampling_hint_custom_ready:'自定义总体已生成。点击“开始抽样”查看样本均值分布。',
    sampling_hint_custom_empty:'手绘曲线太短，请重新绘制。',
    sampling_pop_stats:'总体：μ = {mu}，σ = {sigma}，N = {n}',
    sampling_sample_stats:'样本：n = {n}，x̄ = {mean}，s = {sd}',
    sampling_means_stats:'抽样：k = {k}，均值 = {mean}，标准差 = {sd}，理论 SE = {se}',
    sampling_no_sample:'尚未抽样。',
    sampling_no_means:'尚未抽样。',
    sampling_no_pop:'尚未生成总体。',
  });
  Object.assign(translations.en, {
    sampling_title:'Sampling Distribution',
    sampling_desc:'Draw repeated samples and watch the sampling distribution of the sample mean approach normality.',
    sampling_population:'Population',
    sampling_normal:'Normal',
    sampling_uniform:'Uniform',
    sampling_custom:'Custom (draw)',
    sampling_sample_size:'Sample size n',
    sampling_draws:'Draws per click',
    sampling_run:'Sample',
    sampling_reset:'Reset',
    sampling_pop_title:'(1) Population Distribution',
    sampling_sample_title:'(2) Latest Sample',
    sampling_means_title:'(3) Sampling Distribution of the Sample Mean',
    sampling_pop_aria:'Population distribution histogram',
    sampling_sample_aria:'Latest sample histogram',
    sampling_means_aria:'Sampling distribution of the sample mean histogram',
    sampling_hint_normal:'The population is normal. Click “Sample” to see the sampling distribution.',
    sampling_hint_uniform:'The population is uniform. Larger n makes the sampling distribution closer to normal.',
    sampling_hint_custom:'Draw a density curve in the population plot above; release to build the population.',
    sampling_hint_custom_ready:'Custom population ready. Click “Sample” to see the sampling distribution.',
    sampling_hint_custom_empty:'The drawn curve is too short. Please draw again.',
    sampling_pop_stats:'Population: μ = {mu}, σ = {sigma}, N = {n}',
    sampling_sample_stats:'Sample: n = {n}, x̄ = {mean}, s = {sd}',
    sampling_means_stats:'Sampling: k = {k}, mean = {mean}, SD = {sd}, theoretical SE = {se}',
    sampling_no_sample:'No sample yet.',
    sampling_no_means:'No sampling yet.',
    sampling_no_pop:'No population yet.',
  });

  /* ---------- 2. 常量与状态 ---------- */
  const XMIN = 0, XMAX = 10;
  const POP_N = 100000;
  const svgPop = $('samplingPopChart');
  const svgSample = $('samplingSampleChart');
  const svgMeans = $('samplingMeansChart');
  const chartSize = { w: 620, h: 420, m: { left: 70, right: 20, top: 24, bottom: 62 } };

  let population = null;
  let sampleMeans = [];
  let lastSample = null;
  let popType = 'normal';
  let customX = [], customY = [];
  let drawing = false;

  /* ---------- 3. 伪随机 ---------- */
  let seed = 123456789;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ---------- 4. 总体生成 ---------- */
  function generatePopulation() {
    if (popType === 'normal') {
      population = new Float64Array(POP_N);
      for (let i = 0; i < POP_N; i++) population[i] = 5 + 1.5 * randn();
    } else if (popType === 'uniform') {
      population = new Float64Array(POP_N);
      for (let i = 0; i < POP_N; i++) population[i] = 1 + 8 * rand();
    } else {
      population = null;
    }
  }

  function rebuildPopulationFromCurve() {
    if (customX.length < 5) { population = null; return; }
    const x = customX, y = customY;
    let area = 0;
    for (let i = 1; i < x.length; i++) area += (y[i] + y[i - 1]) / 2 * (x[i] - x[i - 1]);
    if (area <= 0) { population = null; return; }
    const yn = y.map(v => v / area);
    const cdf = [0];
    for (let i = 1; i < x.length; i++) {
      cdf.push(cdf[i - 1] + (yn[i] + yn[i - 1]) / 2 * (x[i] - x[i - 1]));
    }
    const total = cdf[cdf.length - 1];
    for (let i = 0; i < cdf.length; i++) cdf[i] /= total;
    population = new Float64Array(POP_N);
    for (let i = 0; i < POP_N; i++) {
      const u = rand();
      let lo = 0, hi = cdf.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (cdf[mid] <= u) lo = mid; else hi = mid;
      }
      population[i] = x[lo];
    }
  }

  /* ---------- 5. 统计 ---------- */
  function mean(arr) {
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }
  function sd(arr, ddof = 0) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += (arr[i] - m) ** 2;
    return Math.sqrt(s / (arr.length - ddof));
  }
  function popStats() {
    if (!population || !population.length) return null;
    let s = 0;
    for (let i = 0; i < population.length; i++) s += population[i];
    const mu = s / population.length;
    let v2 = 0;
    for (let i = 0; i < population.length; i++) v2 += (population[i] - mu) ** 2;
    return { mu, sigma: Math.sqrt(v2 / population.length), n: population.length };
  }

  /* ---------- 6. 画图 ---------- */
  function drawHistogram(svg, data, opts) {
    const { w, h, m } = chartSize;
    const { bins = 40, color = '#2878b8', xRange, yMax, mode = 'frequency' } = opts || {};
    const t = translations[lang];
    if (!data || !data.length) {
      svg.innerHTML = `<text class="axis-label" x="${w / 2}" y="${h / 2}" text-anchor="middle">${escapeHtml(t.sampling_no_pop)}</text>`;
      return;
    }
    let lo = xRange ? xRange[0] : Math.min(...data);
    let hi = xRange ? xRange[1] : Math.max(...data);
    if (lo === hi) { lo -= 0.5; hi += 0.5; }
    const edges = [];
    for (let i = 0; i <= bins; i++) edges.push(lo + (hi - lo) * i / bins);
    const counts = new Array(bins).fill(0);
    for (let i = 0; i < data.length; i++) {
      let idx = Math.floor((data[i] - lo) / (hi - lo) * bins);
      if (idx < 0) idx = 0;
      if (idx >= bins) idx = bins - 1;
      counts[idx]++;
    }
    const total = counts.reduce((a, b) => a + b, 0);
    const heights = mode === 'relative' ? counts.map(c => c / total) : counts;
    const maxH = yMax || Math.max(...heights) || 1;
    const sx = v => scale(v, [lo, hi], m.left, w - m.right);
    const sy = v => scale(v, [0, maxH], h - m.bottom, m.top);

    let html = '';
    for (let i = 0; i < bins; i++) {
      const x0 = sx(edges[i]), x1 = sx(edges[i + 1]);
      const y0 = sy(heights[i]);
      html += `<rect x="${x0}" y="${y0}" width="${Math.max(0, x1 - x0 - 0.5)}" height="${h - m.bottom - y0}" fill="${color}" opacity="0.72" stroke="#333" stroke-width="0.3"><title>${fmt(edges[i])} – ${fmt(edges[i + 1])}: ${heights[i].toFixed(mode === 'relative' ? 4 : 0)}</title></rect>`;
    }
    html += `<line class="axis" x1="${m.left}" y1="${h - m.bottom}" x2="${w - m.right}" y2="${h - m.bottom}"/><line class="axis" x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${h - m.bottom}"/>`;
    ticks(lo, hi, 6).forEach(v => {
      const x = sx(v);
      html += `<text class="tick" x="${x}" y="${h - m.bottom + 18}" text-anchor="middle">${fmt(v)}</text>`;
    });
    ticks(0, maxH, 5).forEach(v => {
      const y = sy(v);
      html += `<line class="grid" x1="${m.left}" y1="${y}" x2="${w - m.right}" y2="${y}"/><text class="tick" x="${m.left - 8}" y="${y + 4}" text-anchor="end">${mode === 'relative' ? v.toFixed(2) : Math.round(v)}</text>`;
    });
    svg.innerHTML = html;
  }

  function updateStats() {
    const t = translations[lang];
    const ps = popStats();
    $('samplingPopStats').textContent = ps
      ? t.sampling_pop_stats.replace('{mu}', fmt(ps.mu)).replace('{sigma}', fmt(ps.sigma)).replace('{n}', ps.n.toLocaleString())
      : t.sampling_no_pop;
    if (lastSample && lastSample.length) {
      $('samplingSampleStats').textContent = t.sampling_sample_stats
        .replace('{n}', lastSample.length)
        .replace('{mean}', fmt(mean(lastSample)))
        .replace('{sd}', fmt(sd(lastSample, 1)));
    } else {
      $('samplingSampleStats').textContent = t.sampling_no_sample;
    }
    if (sampleMeans.length) {
      const m = mean(sampleMeans);
      const s = sd(sampleMeans, 1);
      const n = Number($('samplingN').value);
      const se = ps ? ps.sigma / Math.sqrt(n) : 0;
      $('samplingMeansStats').textContent = t.sampling_means_stats
        .replace('{k}', sampleMeans.length)
        .replace('{mean}', fmt(m))
        .replace('{sd}', fmt(s))
        .replace('{se}', fmt(se));
    } else {
      $('samplingMeansStats').textContent = t.sampling_no_means;
    }
  }

  function updateHint() {
    const t = translations[lang];
    if (popType === 'normal') $('samplingHint').textContent = t.sampling_hint_normal;
    else if (popType === 'uniform') $('samplingHint').textContent = t.sampling_hint_uniform;
    else $('samplingHint').textContent = population ? t.sampling_hint_custom_ready : t.sampling_hint_custom;
  }

  function renderAll() {
    const ps = popStats();
    drawHistogram(svgPop, population, { bins: 60, color: '#2878b8', xRange: [XMIN, XMAX], mode: 'frequency' });
    drawHistogram(svgSample, lastSample, { bins: 20, color: '#e08a1e', xRange: [XMIN, XMAX], mode: 'relative', yMax: 1 });
    const meansRange = ps ? [ps.mu - 4 * ps.sigma, ps.mu + 4 * ps.sigma] : [XMIN, XMAX];
    drawHistogram(svgMeans, sampleMeans, { bins: 30, color: '#3aa76d', xRange: meansRange, mode: 'relative', yMax: 1 });
    updateStats();
    updateHint();
  }

  /* ---------- 7. 抽样 ---------- */
  function doSampling(k) {
    if (!population) return;
    const n = Number($('samplingN').value);
    for (let d = 0; d < k; d++) {
      let s = 0;
      const sample = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const v = population[(rand() * population.length) | 0];
        sample[i] = v;
        s += v;
      }
      sampleMeans.push(s / n);
      lastSample = sample;
    }
    renderAll();
  }

  /* ---------- 8. 手绘 ---------- */
  function pointerData(event) {
    const r = svgPop.getBoundingClientRect();
    const px = (event.clientX - r.left) * chartSize.w / r.width;
    const py = (event.clientY - r.top) * chartSize.h / r.height;
    const { w, h, m } = chartSize;
    if (px < m.left || px > w - m.right || py < m.top || py > h - m.bottom) return null;
    const x = scale(px, [m.left, w - m.right], XMIN, XMAX);
    const y = scale(py, [h - m.bottom, m.top], 0, 1);
    return { x, y: Math.max(0, Math.min(1, y)) };
  }

  function drawCustomCurve() {
    const { w, h, m } = chartSize;
    const sx = v => scale(v, [XMIN, XMAX], m.left, w - m.right);
    const sy = v => scale(v, [0, 1], h - m.bottom, m.top);
    let d = '';
    for (let i = 0; i < customX.length; i++) {
      d += (i ? ' L ' : 'M ') + sx(customX[i]) + ' ' + sy(customY[i]);
    }
    let html = `<rect x="${m.left}" y="${m.top}" width="${w - m.right - m.left}" height="${h - m.bottom - m.top}" fill="#fff" stroke="#e4e9ee"/>`;
    html += `<path d="${d}" fill="rgba(40,120,184,.25)" stroke="#2878b8" stroke-width="2"/>`;
    html += `<line class="axis" x1="${m.left}" y1="${h - m.bottom}" x2="${w - m.right}" y2="${h - m.bottom}"/><line class="axis" x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${h - m.bottom}"/>`;
    ticks(XMIN, XMAX, 6).forEach(v => {
      html += `<text class="tick" x="${sx(v)}" y="${h - m.bottom + 18}" text-anchor="middle">${fmt(v)}</text>`;
    });
    ticks(0, 1, 5).forEach(v => {
      html += `<text class="tick" x="${m.left - 8}" y="${sy(v) + 4}" text-anchor="end">${v.toFixed(2)}</text>`;
    });
    svgPop.innerHTML = html;
  }

  svgPop.addEventListener('pointerdown', event => {
    if (popType !== 'custom') return;
    const p = pointerData(event);
    if (!p) return;
    event.preventDefault();
    drawing = true;
    customX = [p.x];
    customY = [p.y];
    svgPop.setPointerCapture(event.pointerId);
    drawCustomCurve();
  });
  svgPop.addEventListener('pointermove', event => {
    if (!drawing) return;
    const p = pointerData(event);
    if (!p) return;
    if (p.x <= customX[customX.length - 1]) return;
    customX.push(p.x);
    customY.push(p.y);
    drawCustomCurve();
  });
  svgPop.addEventListener('pointerup', event => {
    if (!drawing) return;
    drawing = false;
    if (svgPop.hasPointerCapture(event.pointerId)) svgPop.releasePointerCapture(event.pointerId);
    if (customX.length < 5) {
      population = null;
      $('samplingHint').textContent = translations[lang].sampling_hint_custom_empty;
      renderAll();
      return;
    }
    rebuildPopulationFromCurve();
    sampleMeans = [];
    lastSample = null;
    renderAll();
  });
  svgPop.addEventListener('pointercancel', () => { drawing = false; });

  /* ---------- 9. 事件绑定 ---------- */
  $('samplingPopulation').addEventListener('change', e => {
    popType = e.target.value;
    customX = []; customY = [];
    sampleMeans = [];
    lastSample = null;
    if (popType === 'custom') population = null;
    else generatePopulation();
    renderAll();
  });
  $('samplingN').addEventListener('input', e => {
    $('samplingNValue').textContent = e.target.value;
    updateStats();
  });
  $('samplingRun').addEventListener('click', () => {
    doSampling(Number($('samplingDraws').value));
  });
  $('samplingReset').addEventListener('click', () => {
    sampleMeans = [];
    lastSample = null;
    if (popType === 'custom') {
      customX = []; customY = [];
      population = null;
    }
    renderAll();
  });

  /* ---------- 10. 接管 sampling 页面切换 ---------- */
  // scatterplot.js 里的 showTool() 只认识四个旧工具，遇到 sampling 会提前抛错。
  // 这里在捕获阶段拦截，直接自己处理 sampling 的显示与标题，不再向下传递。
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-tool]');
    if (!button || button.dataset.tool !== 'sampling') return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const tool = 'sampling';
    // 隐藏所有页面
    ['correlationPage','scatterPage','outlierPage','linearPage','samplingPage'].forEach(id => {
      $(id).hidden = (id !== 'samplingPage');
    });
    // 导航按钮高亮
    document.querySelectorAll('[data-tool]').forEach(btn => {
      const active = btn.dataset.tool === tool;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    // 标题
    document.title = `AP Stats Hub · ${translations[lang].sampling_title}`;
    // 通知其他脚本
    document.dispatchEvent(new CustomEvent('apstats:tool', { detail: tool }));

    if (!population && popType !== 'custom') generatePopulation();
    renderAll();
  }, true);

  /* ---------- 11. 语言切换 ---------- */
  document.addEventListener('apstats:language', () => {
    $('samplingNValue').textContent = $('samplingN').value;
    // 只在当前页面是 sampling 时更新标题，避免覆盖其他工具标题
    if (!$('samplingPage').hidden) {
      document.title = `AP Stats Hub · ${translations[lang].sampling_title}`;
    }
    renderAll();
  });

  /* ---------- 12. 初始化 ---------- */
  generatePopulation();
  renderAll();
})();