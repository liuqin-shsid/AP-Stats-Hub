/* Binomial Histogram — browser port of Binomial Distribution.py
 * Renders B(n, p) as a bar chart of P(X = k), with n / p input boxes,
 * a Plot button, and a red dashed line marking the mean n*p.
 * No external libraries. Works with the existing i18n system.
 */
(() => {
  /* ---------- i18n ---------- */
  Object.assign(translations.zh, {
    binomial_title: '二项分布',
    binomial_desc: '输入 n 与 p，绘制 B(n, p) 的概率质量函数直方图。',
    binomial_n_label: '试验次数 n',
    binomial_p_label: '成功概率 p',
    binomial_plot: '绘图',
    binomial_k: '成功次数 k',
    binomial_prob: '概率 P(X = k)',
    binomial_mean: '均值',
    binomial_need_plot: '输入 n 与 p 后点击“绘图”。',
    binomial_invalid_n: 'n 必须为正整数。',
    binomial_invalid_p: 'p 必须在 0 与 1 之间。',
    binomial_invalid_input: '输入无效：n 为整数，p 为 0–1 之间的数。',
    binomial_aria: '二项分布直方图',
  });
  Object.assign(translations.en, {
    binomial_title: 'Binomial Distribution',
    binomial_desc: 'Enter n and p to plot the probability mass function of B(n, p).',
    binomial_n_label: 'Number of trials n',
    binomial_p_label: 'Probability of success p',
    binomial_plot: 'Plot',
    binomial_k: 'Number of successes k',
    binomial_prob: 'Probability P(X = k)',
    binomial_mean: 'Mean',
    binomial_need_plot: 'Enter n and p, then click Plot.',
    binomial_invalid_n: 'n must be a positive integer.',
    binomial_invalid_p: 'p must be between 0 and 1.',
    binomial_invalid_input: 'Invalid input — n must be an integer, p a number.',
    binomial_aria: 'Binomial distribution histogram',
  });

  /* ---------- Constants ---------- */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SIZE = { w: 1000, h: 610, m: { left: 86, right: 38, top: 32, bottom: 75 } };
  const COLORS = {
    bar: 'steelblue',
    barStroke: '#1d2935',
    grid: '#dfe6eb',
    axis: '#50606d',
    tick: '#5b6874',
    label: '#263844',
    mean: '#c73932',
  };

  /* ---------- PMF (log-gamma based for numerical stability) ---------- */
  function logGamma(x) {
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    x -= 1;
    let a = c[0];
    const t = x + g + 0.5;
    for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function logComb(n, k) {
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  }
  function binomialPmf(k, n, p) {
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === n ? 1 : 0;
    return Math.exp(logComb(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  }

  /* ---------- Helpers ---------- */
  const fmt = (v, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : '—');
  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function clearSvg(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }
  function makeScale(domain, range) {
    return (v) => range[0] + ((v - domain[0]) * (range[1] - range[0])) / (domain[1] - domain[0] || 1);
  }

  /* ---------- State ---------- */
  const state = {
    n: 20,
    p: 0.2,
    lastValid: null,
    error: null,
  };

  /* ---------- DOM injection ---------- */
  function buildUI() {
    const root = document.getElementById('binomialPage');
    if (!root) return;
    root.innerHTML = `
      <div class="page-heading">
        <div>
          <h1 data-i18n="binomial_title">二项分布</h1>
          <p data-i18n="binomial_desc"></p>
        </div>
      </div>
      <section class="controls binomial-controls" data-i18n-aria="controls_aria">
        <label class="binomial-field">
          <span data-i18n="binomial_n_label">试验次数 n</span>
          <input id="binomialN" type="number" min="1" step="1" value="20">
        </label>
        <label class="binomial-field">
          <span data-i18n="binomial_p_label">成功概率 p</span>
          <input id="binomialP" type="number" min="0" max="1" step="0.01" value="0.2">
        </label>
        <button id="binomialPlot" class="reset" type="button" data-i18n="binomial_plot">绘图</button>
      </section>
      <p id="binomialHint" class="hint" role="status"></p>
      <section class="chart-card binomial-card">
        <svg id="binomialChart" viewBox="0 0 1000 610" role="img" data-i18n-aria="binomial_aria"></svg>
      </section>
    `;

    const nInput = document.getElementById('binomialN');
    const pInput = document.getElementById('binomialP');
    const btn = document.getElementById('binomialPlot');

    const trigger = () => {
      const rawN = nInput.value.trim();
      const rawP = pInput.value.trim();
      const nNum = Number(rawN);
      const pNum = Number(rawP);
      if (!Number.isFinite(nNum) || !Number.isFinite(pNum) ||
          !Number.isInteger(nNum) || rawN === '' || rawP === '') {
        state.error = 'binomial_invalid_input';
        renderChart();
        return;
      }
      if (nNum <= 0) { state.error = 'binomial_invalid_n'; renderChart(); return; }
      if (pNum < 0 || pNum > 1) { state.error = 'binomial_invalid_p'; renderChart(); return; }
      state.n = nNum;
      state.p = pNum;
      state.lastValid = { n: nNum, p: pNum };
      state.error = null;
      renderChart();
    };

    btn.addEventListener('click', trigger);
    [nInput, pInput].forEach((el) => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); trigger(); }
      });
    });
  }

  /* ---------- Chart rendering ---------- */
  function renderChart() {
    const svg = document.getElementById('binomialChart');
    if (!svg) return;
    const t = translations[lang];
    const hint = document.getElementById('binomialHint');

    if (!state.lastValid && !state.error) {
      hint.textContent = t.binomial_need_plot;
      hint.className = 'hint';
      clearSvg(svg);
      const placeholder = svgEl('text', {
        x: SIZE.w / 2, y: SIZE.h / 2, 'text-anchor': 'middle',
        class: 'binomial-empty',
      });
      placeholder.textContent = t.binomial_need_plot;
      svg.appendChild(placeholder);
      return;
    }

    if (state.error) {
      hint.textContent = t[state.error];
      hint.className = 'hint danger';
      clearSvg(svg);
      const err = svgEl('text', {
        x: SIZE.w / 2, y: SIZE.h / 2, 'text-anchor': 'middle',
        class: 'binomial-error',
      });
      err.textContent = t[state.error];
      svg.appendChild(err);
      return;
    }

    hint.textContent = '';
    hint.className = 'hint';
    clearSvg(svg);

    const { n, p } = state.lastValid;
    const kValues = [];
    const pmfValues = [];
    for (let k = 0; k <= n; k++) {
      kValues.push(k);
      pmfValues.push(binomialPmf(k, n, p));
    }
    const yMax = Math.max(...pmfValues, 1e-12) * 1.08;

    const sx = makeScale([-0.5, n + 0.5], [SIZE.m.left, SIZE.w - SIZE.m.right]);
    const sy = makeScale([0, yMax], [SIZE.h - SIZE.m.bottom, SIZE.m.top]);

    const yTicks = 6;
    for (let i = 0; i <= yTicks; i++) {
      const v = (yMax * i) / yTicks;
      const y = sy(v);
      svg.appendChild(svgEl('line', {
        class: 'grid', x1: SIZE.m.left, y1: y, x2: SIZE.w - SIZE.m.right, y2: y,
      }));
      const txt = svgEl('text', {
        class: 'tick', x: SIZE.m.left - 12, y: y + 5, 'text-anchor': 'end',
      });
      txt.textContent = fmt(v, 3);
      svg.appendChild(txt);
    }

    let step = 1;
    if (n > 30) step = Math.max(1, Math.floor(n / 30));
    for (let k = 0; k <= n; k += step) {
      const x = sx(k);
      const txt = svgEl('text', {
        class: 'tick', x, y: SIZE.h - SIZE.m.bottom + 24, 'text-anchor': 'middle',
      });
      txt.textContent = String(k);
      svg.appendChild(txt);
    }
    if ((n % step) !== 0) {
      const x = sx(n);
      const txt = svgEl('text', {
        class: 'tick', x, y: SIZE.h - SIZE.m.bottom + 24, 'text-anchor': 'middle',
      });
      txt.textContent = String(n);
      svg.appendChild(txt);
    }

    svg.appendChild(svgEl('line', {
      class: 'axis',
      x1: SIZE.m.left, y1: SIZE.h - SIZE.m.bottom,
      x2: SIZE.w - SIZE.m.right, y2: SIZE.h - SIZE.m.bottom,
    }));
    svg.appendChild(svgEl('line', {
      class: 'axis',
      x1: SIZE.m.left, y1: SIZE.m.top,
      x2: SIZE.m.left, y2: SIZE.h - SIZE.m.bottom,
    }));

    const barW = Math.max(1, (sx(1) - sx(0)) * 0.8);
    for (let k = 0; k <= n; k++) {
      const h = (SIZE.h - SIZE.m.bottom) - sy(pmfValues[k]);
      if (h <= 0) continue;
      svg.appendChild(svgEl('rect', {
        x: sx(k) - barW / 2,
        y: sy(pmfValues[k]),
        width: barW,
        height: h,
        fill: COLORS.bar,
        'fill-opacity': 0.85,
        stroke: COLORS.barStroke,
        'stroke-width': 0.6,
      }));
    }

    const mean = n * p;
    svg.appendChild(svgEl('line', {
      x1: sx(mean), x2: sx(mean),
      y1: SIZE.m.top, y2: SIZE.h - SIZE.m.bottom,
      stroke: COLORS.mean,
      'stroke-width': 2,
      'stroke-dasharray': '6 4',
    }));
    const meanLabel = svgEl('text', {
      x: sx(mean) + 6, y: SIZE.m.top + 14,
      fill: COLORS.mean, 'font-size': 13, 'font-weight': 600,
    });
    meanLabel.textContent = `${t.binomial_mean} = ${fmt(mean, 2)}`;
    svg.appendChild(meanLabel);

    const xLabel = svgEl('text', {
      class: 'axis-label',
      x: (SIZE.m.left + SIZE.w - SIZE.m.right) / 2,
      y: SIZE.h - 18,
      'text-anchor': 'middle',
    });
    xLabel.textContent = t.binomial_k;
    svg.appendChild(xLabel);

    const yLabel = svgEl('text', {
      class: 'axis-label',
      transform: `translate(22 ${(SIZE.m.top + SIZE.h - SIZE.m.bottom) / 2}) rotate(-90)`,
      'text-anchor': 'middle',
    });
    yLabel.textContent = t.binomial_prob;
    svg.appendChild(yLabel);

    const title = svgEl('text', {
      x: SIZE.w / 2, y: 20, 'text-anchor': 'middle',
      fill: '#17324d', 'font-size': 16, 'font-weight': 700,
    });
    title.textContent = `B(n=${n}, p=${p})`;
    svg.appendChild(title);
  }

  /* ---------- Language / navigation hooks ---------- */
  document.addEventListener('apstats:language', () => {
    renderChart();
  });

  document.addEventListener('apstats:tool', (e) => {
    const page = document.getElementById('binomialPage');
    if (!page) return;
    if (e.detail !== 'binomial') {
      page.hidden = true;
    } else {
      ['correlationPage', 'scatterPage', 'outlierPage', 'linearPage',
       'samplingPage', 'proportionPage'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
      });
      page.hidden = false;
      document.querySelectorAll('[data-tool]').forEach((btn) => {
        const active = btn.dataset.tool === 'binomial';
        btn.classList.toggle('active', active);
        if (active) btn.setAttribute('aria-current', 'page');
        else btn.removeAttribute('aria-current');
      });
      document.title = `AP Stats Hub · ${translations[lang].binomial_title}`;
      renderChart();
    }
  });

  /* ---------- Init ---------- */
  function init() {
    if (!document.getElementById('binomialPage')) {
      const main = document.querySelector('.content');
      if (!main) return;
      const page = document.createElement('div');
      page.id = 'binomialPage';
      page.hidden = true;
      main.appendChild(page);
    }
    buildUI();
    renderChart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();