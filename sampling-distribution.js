/* Sampling Distribution demo (SVG, no libraries). */
(function () {
  'use strict';

  function boot() {
    if (typeof translations === 'undefined') return setTimeout(boot, 50);
    if (typeof lang === 'undefined') return setTimeout(boot, 50);

    translations.zh = translations.zh || {};
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

    translations.en = translations.en || {};
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

    try { if (typeof applyLang === 'function') applyLang(); } catch (e) {}

    var page = document.getElementById('samplingPage');
    if (!page) return;
    function $id(id) { return document.getElementById(id); }

    var svgPop  = $id('samplingPopChart');
    var svgSamp = $id('samplingSampChart');
    var svgMean = $id('samplingMeanChart');
    var radioCustom  = $id('samplingRadioCustom');
    var radioNormal  = $id('samplingRadioNormal');
    var radioUniform = $id('samplingRadioUniform');
    var sliderN = $id('samplingSliderN');
    var sliderNValue = $id('samplingSliderNValue');
    var hintEl = $id('samplingHint');
    var txtPop = $id('samplingPopStats');
    var txtSamp = $id('samplingSampStats');
    var txtMean = $id('samplingMeanStats');
    var btnReset = $id('samplingReset');
    var btns = {
      1: $id('samplingBtn1'), 10: $id('samplingBtn10'), 20: $id('samplingBtn20'),
      50: $id('samplingBtn50'), 100: $id('samplingBtn100'), 1000: $id('samplingBtn1000'),
      10000: $id('samplingBtn10000'),
    };
    if (!svgPop || !svgSamp || !svgMean) return;

    var chartPop  = { w: 340, h: 260, m: { left: 42, right: 12, top: 22, bottom: 34 } };
    var chartSamp = { w: 340, h: 260, m: { left: 42, right: 12, top: 22, bottom: 34 } };
    var chartMean = { w: 720, h: 260, m: { left: 46, right: 12, top: 22, bottom: 34 } };
    var XMIN = 0, XMAX = 10;
    var POP_BINS = 60, SAMP_BINS = 20, MEAN_BINS = 30;

    var popType = 'normal';
    var population = null;
    var popCurveX = [], popCurveY = [];
    var isDrawing = false;
    var sampleMeans = [];
    var lastSample = null;

    function mean(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i]; return arr.length ? s / arr.length : 0; }
    function variance(arr, ddof) {
      ddof = ddof || 0;
      if (!arr || arr.length <= ddof) return 0;
      var m = mean(arr), s = 0;
      for (var i = 0; i < arr.length; i++) s += (arr[i] - m) * (arr[i] - m);
      return s / (arr.length - ddof);
    }
    function std(arr, ddof) { return Math.sqrt(variance(arr, ddof)); }
    function randn() {
      var u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function generatePopulation() {
      var n = 100000, out = new Float64Array(n), i;
      if (popType === 'normal') { for (i = 0; i < n; i++) out[i] = 5 + 1.5 * randn(); }
      else if (popType === 'uniform') { for (i = 0; i < n; i++) out[i] = 1 + 9 * Math.random(); }
      else { population = null; return; }
      population = out;
    }

    function rebuildPopulationFromCurve() {
      if (popCurveX.length < 5) { population = null; return; }
      var area = 0, i;
      for (i = 1; i < popCurveX.length; i++)
        area += 0.5 * (popCurveY[i] + popCurveY[i - 1]) * (popCurveX[i] - popCurveX[i - 1]);
      if (!(area > 0)) { population = null; return; }
      var pdf = new Float64Array(popCurveX.length);
      for (i = 0; i < popCurveX.length; i++) pdf[i] = popCurveY[i] / area;
      var cdf = new Float64Array(popCurveX.length);
      cdf[0] = 0;
      for (i = 1; i < popCurveX.length; i++)
        cdf[i] = cdf[i - 1] + 0.5 * (pdf[i] + pdf[i - 1]) * (popCurveX[i] - popCurveX[i - 1]);
      var last = cdf[cdf.length - 1] || 1;
      for (i = 0; i < cdf.length; i++) cdf[i] /= last;
      var n = 100000, out = new Float64Array(n);
      for (i = 0; i < n; i++) {
        var u = Math.random();
        var lo = 0, hi = cdf.length - 1;
        while (lo + 1 < hi) { var mid = (lo + hi) >> 1; if (cdf[mid] <= u) lo = mid; else hi = mid; }
        var t = (u - cdf[lo]) / ((cdf[hi] - cdf[lo]) || 1);
        out[i] = popCurveX[lo] + t * (popCurveX[hi] - popCurveX[lo]);
      }
      population = out;
    }

    function histogram(data, bins, lo, hi) {
      var counts = new Float64Array(bins);
      var binW = (hi - lo) / bins;
      for (var i = 0; i < data.length; i++) {
        var v = data[i];
        if (v < lo || v > hi) continue;
        var idx = Math.floor((v - lo) / binW);
        if (idx < 0) idx = 0;
        if (idx >= bins) idx = bins - 1;
        counts[idx]++;
      }
      return { counts: counts, binW: binW };
    }

    var svgNS = 'http://www.w3.org/2000/svg';
    function clearSVG(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
    function mk(tag, attrs) { var el = document.createElementNS(svgNS, tag); for (var k in attrs) el.setAttribute(k, attrs[k]); return el; }
    function scale(v, d0, d1, a, b) { return a + (v - d0) * (b - a) / ((d1 - d0) || 1); }
    function fmtShort(v) { var a = Math.abs(v); if (a >= 1000) return v.toFixed(0); if (a >= 10) return v.toFixed(2); if (a >= 1) return v.toFixed(2); return v.toFixed(3); }

    function drawAxes(svg, chart, xLo, xHi, yLo, yHi, xLabel, yLabel) {
      clearSVG(svg);
      var w = chart.w, h = chart.h, m = chart.m, i;
      for (i = 0; i < 6; i++) {
        var xv = xLo + (xHi - xLo) * i / 5;
        var px = scale(xv, xLo, xHi, m.left, w - m.right);
        svg.appendChild(mk('line', { x1: px, y1: m.top, x2: px, y2: h - m.bottom, 'class': 'grid' }));
        var tx = mk('text', { x: px, y: h - m.bottom + 16, 'text-anchor': 'middle', 'class': 'tick' });
        tx.textContent = fmtShort(xv);
        svg.appendChild(tx);
      }
      for (i = 0; i < 5; i++) {
        var yv = yLo + (yHi - yLo) * i / 4;
        var py = scale(yv, yLo, yHi, h - m.bottom, m.top);
        svg.appendChild(mk('line', { x1: m.left, y1: py, x2: w - m.right, y2: py, 'class': 'grid' }));
        var ty = mk('text', { x: m.left - 6, y: py + 4, 'text-anchor': 'end', 'class': 'tick' });
        ty.textContent = fmtShort(yv);
        svg.appendChild(ty);
      }
      svg.appendChild(mk('line', { x1: m.left, y1: h - m.bottom, x2: w - m.right, y2: h - m.bottom, 'class': 'axis' }));
      svg.appendChild(mk('line', { x1: m.left, y1: m.top, x2: m.left, y2: h - m.bottom, 'class': 'axis' }));
      var xl = mk('text', { x: (m.left + w - m.right) / 2, y: h - 4, 'text-anchor': 'middle', 'class': 'axis-label' });
      xl.textContent = xLabel;
      svg.appendChild(xl);
      var yl = mk('text', { x: -((m.top + h - m.bottom) / 2), y: 12, 'text-anchor': 'middle', 'class': 'axis-label', transform: 'rotate(-90)' });
      yl.textContent = yLabel;
      svg.appendChild(yl);
    }

    function drawPopulation() {
      if (popType === 'custom' && popCurveX.length > 0) {
        drawAxes(svgPop, chartPop, XMIN, XMAX, 0, 1.0, 'x', translations[lang].sampling_pop_ylabel_draw);
        var w = chartPop.w, h = chartPop.h, m = chartPop.m;
        var d = '';
        for (var i = 0; i < popCurveX.length; i++) {
          var px = scale(popCurveX[i], XMIN, XMAX, m.left, w - m.right);
          var py = scale(popCurveY[i], 0, 1.0, h - m.bottom, m.top);
          d += (i === 0 ? 'M ' : 'L ') + px.toFixed(2) + ' ' + py.toFixed(2) + ' ';
        }
        svgPop.appendChild(mk('path', { d: d, fill: 'rgba(40,120,184,0.25)', stroke: 'steelblue', 'stroke-width': 2 }));
        return;
      }
      if (!population) {
        drawAxes(svgPop, chartPop, XMIN, XMAX, 0, 1.0, 'x', translations[lang].sampling_pop_ylabel);
        var t = mk('text', { x: chartPop.w / 2, y: chartPop.h / 2, 'text-anchor': 'middle', 'class': 'axis-label' });
        t.textContent = translations[lang].sampling_no_data;
        svgPop.appendChild(t);
        return;
      }
      var hres = histogram(population, POP_BINS, XMIN, XMAX);
      var counts = hres.counts, binW = hres.binW;
      var maxCount = 1;
      for (var j = 0; j < counts.length; j++) if (counts[j] > maxCount) maxCount = counts[j];
      drawAxes(svgPop, chartPop, XMIN, XMAX, 0, maxCount * 1.05, 'x', translations[lang].sampling_pop_ylabel);
      var w2 = chartPop.w, h2 = chartPop.h, m2 = chartPop.m;
      for (j = 0; j < counts.length; j++) {
        if (!counts[j]) continue;
        var xL = XMIN + j * binW, xR = xL + binW;
        var pxL = scale(xL, XMIN, XMAX, m2.left, w2 - m2.right);
        var pxR = scale(xR, XMIN, XMAX, m2.left, w2 - m2.right);
        var pyT = scale(counts[j], 0, maxCount * 1.05, h2 - m2.bottom, m2.top);
        svgPop.appendChild(mk('rect', { x: pxL, y: pyT, width: pxR - pxL, height: (h2 - m2.bottom) - pyT, fill: 'steelblue', 'fill-opacity': 0.7, stroke: 'black', 'stroke-width': 0.3 }));
      }
    }

    function drawSample() {
      if (!lastSample) {
        drawAxes(svgSamp, chartSamp, XMIN, XMAX, 0, 1.0, 'x', translations[lang].sampling_rel_freq);
        var t = mk('text', { x: chartSamp.w / 2, y: chartSamp.h / 2, 'text-anchor': 'middle', 'class': 'axis-label' });
        t.textContent = translations[lang].sampling_no_sample;
        svgSamp.appendChild(t);
        return;
      }
      var hres = histogram(lastSample, SAMP_BINS, XMIN, XMAX);
      var counts = hres.counts, binW = hres.binW;
      var total = lastSample.length;
      drawAxes(svgSamp, chartSamp, XMIN, XMAX, 0, 1.0, 'x', translations[lang].sampling_rel_freq);
      var w = chartSamp.w, h = chartSamp.h, m = chartSamp.m;
      for (var i = 0; i < counts.length; i++) {
        if (!counts[i]) continue;
        var xL = XMIN + i * binW, xR = xL + binW;
        var pxL = scale(xL, XMIN, XMAX, m.left, w - m.right);
        var pxR = scale(xR, XMIN, XMAX, m.left, w - m.right);
        var hv = counts[i] / total;
        var pyT = scale(hv, 0, 1.0, h - m.bottom, m.top);
        svgSamp.appendChild(mk('rect', { x: pxL, y: pyT, width: pxR - pxL, height: (h - m.bottom) - pyT, fill: 'orange', 'fill-opacity': 0.75, stroke: 'black', 'stroke-width': 0.5 }));
      }
    }

    function drawMean() {
      if (sampleMeans.length === 0) {
        drawAxes(svgMean, chartMean, XMIN, XMAX, 0, 1.0, translations[lang].sampling_sample_mean, translations[lang].sampling_rel_freq);
        var t = mk('text', { x: chartMean.w / 2, y: chartMean.h / 2, 'text-anchor': 'middle', 'class': 'axis-label' });
        t.textContent = translations[lang].sampling_no_sample;
        svgMean.appendChild(t);
        return;
      }
      var mu = mean(population || [5]);
      var sd = std(population || [1.5]);
      if (!isFinite(sd) || sd === 0) sd = 1;
      var xLo = mu - 4 * sd, xHi = mu + 4 * sd;
      var hres = histogram(sampleMeans, MEAN_BINS, xLo, xHi);
      var counts = hres.counts, binW = hres.binW;
      var k = sampleMeans.length;
      drawAxes(svgMean, chartMean, xLo, xHi, 0, 1.0, translations[lang].sampling_sample_mean, translations[lang].sampling_rel_freq);
      var w = chartMean.w, h = chartMean.h, m = chartMean.m;
      for (var i = 0; i < counts.length; i++) {
        if (!counts[i]) continue;
        var xL = xLo + i * binW, xR = xL + binW;
        var pxL = scale(xL, xLo, xHi, m.left, w - m.right);
        var pxR = scale(xR, xLo, xHi, m.left, w - m.right);
        var hv = counts[i] / k;
        var pyT = scale(hv, 0, 1.0, h - m.bottom, m.top);
        svgMean.appendChild(mk('rect', { x: pxL, y: pyT, width: pxR - pxL, height: (h - m.bottom) - pyT, fill: 'mediumseagreen', 'fill-opacity': 0.75, stroke: 'black', 'stroke-width': 0.4 }));
      }
    }

    function line(label, value) {
      return '<div class="sd-line"><span>' + label + '</span><b>' + value + '</b></div>';
    }

    function updatePopStats() {
      var t = translations[lang];
      var html = '<div class="sd-card-title">' + t.sampling_pop_stats + '</div>';
      if (!population || population.length === 0) {
        html += '<div class="sd-line muted">' + t.sampling_no_data + '</div>';
      } else {
        var mu = mean(population);
        var v  = variance(population, 0);
        html += line(t.sampling_mu, mu.toFixed(4));
        html += line(t.sampling_sigma2, v.toFixed(4));
        html += line(t.sampling_sigma, Math.sqrt(v).toFixed(4));
        html += line(t.sampling_N, population.length.toLocaleString());
      }
      txtPop.innerHTML = html;
    }

    function updateSampStats() {
      var t = translations[lang];
      var html = '<div class="sd-card-title">' + t.sampling_sample_stats + '</div>';
      if (!lastSample || lastSample.length === 0) {
        html += '<div class="sd-line muted">' + t.sampling_no_sample + '</div>';
      } else {
        var m = mean(lastSample);
        var v = variance(lastSample, 1);
        html += line(t.sampling_n, lastSample.length);
        html += line(t.sampling_mean, m.toFixed(4));
        html += line(t.sampling_var, v.toFixed(4));
        html += line(t.sampling_std, Math.sqrt(v).toFixed(4));
      }
      txtSamp.innerHTML = html;
    }

    function updateMeanStats() {
      var t = translations[lang];
      var k = sampleMeans.length;
      var html = '<div class="sd-card-title">' + t.sampling_sampling_stats + '</div>';
      if (k === 0) {
        html += '<div class="sd-line muted">' + t.sampling_no_sample + '</div>';
      } else {
        var mbar = mean(sampleMeans);
        var vbar = variance(sampleMeans, 1);
        var se = 0;
        if (population && population.length > 0) {
          var s = std(population, 0);
          var n = Number(sliderN.value);
          se = s / Math.sqrt(n);
        }
        html += line(t.sampling_k, k);
        html += line(t.sampling_mean_of_mean, mbar.toFixed(4));
        html += line(t.sampling_var_of_mean, vbar.toFixed(4));
        html += line(t.sampling_std_of_mean, Math.sqrt(vbar).toFixed(4));
        html += line(t.sampling_SE, se.toFixed(4));
      }
      txtMean.innerHTML = html;
    }

    function updateHint() {
      if (!hintEl) return;
      var t = translations[lang];
      if (popType === 'custom') {
        hintEl.textContent = isDrawing ? t.sampling_draw_hint_active : t.sampling_draw_hint;
      } else {
        hintEl.textContent = t.sampling_draw_hint;
      }
    }

    function renderAll() {
      drawPopulation();
      drawSample();
      drawMean();
      updatePopStats();
      updateSampStats();
      updateMeanStats();
      updateHint();
      if (sliderNValue) sliderNValue.textContent = sliderN.value;
    }

    function doSampling(k) {
      if (!population || population.length === 0) return;
      var n = Number(sliderN.value);
      for (var i = 0; i < k; i++) {
        var s = new Float64Array(n);
        for (var j = 0; j < n; j++) s[j] = population[(Math.random() * population.length) | 0];
        lastSample = s;
        sampleMeans.push(mean(s));
      }
      renderAll();
    }

    function svgPointToData(evt) {
      var rect = svgPop.getBoundingClientRect();
      var vb = svgPop.viewBox.baseVal;
      var px = (evt.clientX - rect.left) * vb.width / rect.width;
      var py = (evt.clientY - rect.top) * vb.height / rect.height;
      var m = chartPop.m, w = chartPop.w, h = chartPop.h;
      var xv = scale(px, m.left, w - m.right, XMIN, XMAX);
      var yv = Math.max(0, Math.min(1, scale(py, h - m.bottom, m.top, 0, 1)));
      return { x: xv, y: yv };
    }

    svgPop.addEventListener('mousedown', function (e) {
      if (popType !== 'custom' || e.button !== 0) return;
      var p = svgPointToData(e);
      if (p.x < XMIN || p.x > XMAX) return;
      isDrawing = true;
      if (popCurveX.length === 0) {
        popCurveX = [p.x]; popCurveY = [p.y];
      } else if (p.x >= popCurveX[popCurveX.length - 1]) {
        popCurveX.push(p.x); popCurveY.push(p.y);
      } else {
        var idx = 0;
        while (idx < popCurveX.length && popCurveX[idx] < p.x) idx++;
        popCurveX = popCurveX.slice(0, idx).concat([p.x]);
        popCurveY = popCurveY.slice(0, idx).concat([p.y]);
      }
      renderAll();
      e.preventDefault();
    });
    svgPop.addEventListener('mousemove', function (e) {
      if (!isDrawing) return;
      var p = svgPointToData(e);
      if (p.x <= popCurveX[popCurveX.length - 1] || p.x > XMAX) return;
      popCurveX.push(p.x); popCurveY.push(p.y);
      drawPopulation();
    });
    window.addEventListener('mouseup', function () {
      if (!isDrawing) return;
      isDrawing = false;
      if (popCurveX.length < 5) { popCurveX = []; popCurveY = []; population = null; }
      else rebuildPopulationFromCurve();
      sampleMeans = []; lastSample = null;
      renderAll();
    });

    sliderN.addEventListener('input', function () { sliderNValue.textContent = sliderN.value; });
    radioCustom.addEventListener('change', function () {
      popType = 'custom'; sampleMeans = []; lastSample = null;
      if (popCurveX.length > 0) rebuildPopulationFromCurve();
      else population = null;
      renderAll();
    });
    radioNormal.addEventListener('change', function () {
      popType = 'normal'; popCurveX = []; popCurveY = [];
      generatePopulation(); sampleMeans = []; lastSample = null; renderAll();
    });
    radioUniform.addEventListener('change', function () {
      popType = 'uniform'; popCurveX = []; popCurveY = [];
      generatePopulation(); sampleMeans = []; lastSample = null; renderAll();
    });
    Object.keys(btns).forEach(function (k) {
      if (btns[k]) btns[k].addEventListener('click', function () { doSampling(Number(k)); });
    });
    btnReset.addEventListener('click', function () {
      sampleMeans = []; lastSample = null;
      if (popType === 'custom') { popCurveX = []; popCurveY = []; population = null; }
      renderAll();
    });

    document.addEventListener('apstats:tool', function (e) {
      if (e.detail !== 'sampling') return;
      if (!population && popType !== 'custom') generatePopulation();
      renderAll();
    });
    document.addEventListener('apstats:language', function () { renderAll(); });

    if (popType === 'normal' && !population) generatePopulation();
    renderAll();

    console.log('[sampling] 抽样分布工具已加载。');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();