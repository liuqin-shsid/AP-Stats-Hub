/* 正态分布计算器
   给 μ 与 σ 画出曲线；两种用法：
     求面积 —— 给边界，算左/右/中间的概率
     求边界 —— 给概率，反查 z 分数与实际值
   边界线可以直接拖。横轴同时标出实际值与 z 分数。 */
(() => {
  Object.assign(translations.zh, {
    normal_title: '正态分布',
    normal_desc: '输入 μ 与 σ 画出正态曲线。可以由边界求面积，也可以由面积反查边界与 z 分数；边界线能直接拖动。',
    normal_mu: '均值 μ', normal_sigma: '标准差 σ',
    normal_mode: '用法',
    normal_mode_area: '给边界 → 求面积',
    normal_mode_value: '给面积 → 求边界',
    normal_region: '区域',
    normal_left: '左侧', normal_right: '右侧', normal_center: '中间',
    normal_bound: '边界值', normal_lower: '下界', normal_upper: '上界',
    normal_area_in: '面积（概率）',
    normal_result: '结果',
    normal_prob: '概率', normal_zscore: 'z 分数', normal_value: '实际值',
    normal_presets: '常用',
    normal_sigma_bad: 'σ 必须大于 0。',
    normal_area_bad: '面积要在 0 与 1 之间。',
    normal_order: '下界已自动与上界对调。',
    normal_drag: '提示：直接拖动图上的竖线可以改边界。',
    normal_empirical: '显示 68–95–99.7 经验法则',
    normal_axis_x: '实际值', normal_axis_z: 'z 分数',
    normal_lohi: '下／上',
  });
  Object.assign(translations.en, {
    normal_title: 'Normal Distribution',
    normal_desc: 'Enter μ and σ to draw the curve. Go from boundaries to area, or from an area back to the boundaries and z-scores — the boundary lines are draggable.',
    normal_mu: 'Mean μ', normal_sigma: 'SD σ',
    normal_mode: 'Mode',
    normal_mode_area: 'Boundary → area',
    normal_mode_value: 'Area → boundary',
    normal_region: 'Region',
    normal_left: 'Left', normal_right: 'Right', normal_center: 'Between',
    normal_bound: 'Boundary', normal_lower: 'Lower', normal_upper: 'Upper',
    normal_area_in: 'Area (probability)',
    normal_result: 'Result',
    normal_prob: 'Probability', normal_zscore: 'z-score', normal_value: 'Value',
    normal_presets: 'Common',
    normal_sigma_bad: 'σ must be greater than 0.',
    normal_area_bad: 'Area must be between 0 and 1.',
    normal_order: 'Lower and upper bounds were swapped.',
    normal_drag: 'Tip: drag the vertical lines on the chart to move a boundary.',
    normal_empirical: 'Show the 68–95–99.7 rule',
    normal_axis_x: 'Value', normal_axis_z: 'z-score',
    normal_lohi: 'lower / upper',
  });

  /* ---------- 正态分布的数学 ---------- */
  /* erf 用 Numerical Recipes 的切比雪夫展开，精度接近机器精度；
     不用 jStat 是为了让这一页自己可验证，不依赖外部实现的细节。 */
  const ERF_COF = [-1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2,
    -9.561514786808631e-3, -9.46595344482036e-4, 3.66839497852761e-4,
    4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6,
    1.303655835580e-6, 1.5626441722e-8, -8.5238095915e-8,
    6.529054439e-9, 5.059343495e-9, -9.91364156e-10,
    -2.27365122e-10, 9.6467911e-11, 2.394038e-12,
    -6.886027e-12, 8.94487e-13, 3.13092e-13,
    -1.12708e-13, 3.81e-16, 7.106e-15];
  function erf(x) {
    const z = Math.abs(x), t = 2 / (2 + z), ty = 4 * t - 2;
    let d = 0, dd = 0;
    for (let j = ERF_COF.length - 1; j > 0; j--) { const tmp = d; d = ty * d - dd + ERF_COF[j]; dd = tmp; }
    const ans = t * Math.exp(-z * z + 0.5 * (ERF_COF[0] + ty * d) - dd);
    return x >= 0 ? 1 - ans : ans - 1;
  }
  const zOf = (x, mu, sd) => (x - mu) / sd;
  const cdfZ = z => 0.5 * (1 + erf(z / Math.SQRT2));
  const pdf = (x, mu, sd) => Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

  /* 标准正态的分位数：Acklam 有理逼近 + 一次牛顿修正 */
  const AQ_A = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
                1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const AQ_B = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
                6.680131188771972e1, -1.328068155288572e1];
  const AQ_C = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
                -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const AQ_D = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  function invZ(p) {
    if (!(p > 0 && p < 1)) return p <= 0 ? -Infinity : Infinity;
    const lo = 0.02425, hi = 1 - lo;
    let x;
    if (p < lo) {
      const q = Math.sqrt(-2 * Math.log(p));
      x = (((((AQ_C[0] * q + AQ_C[1]) * q + AQ_C[2]) * q + AQ_C[3]) * q + AQ_C[4]) * q + AQ_C[5]) /
          ((((AQ_D[0] * q + AQ_D[1]) * q + AQ_D[2]) * q + AQ_D[3]) * q + 1);
    } else if (p <= hi) {
      const q = p - 0.5, r = q * q;
      x = (((((AQ_A[0] * r + AQ_A[1]) * r + AQ_A[2]) * r + AQ_A[3]) * r + AQ_A[4]) * r + AQ_A[5]) * q /
          (((((AQ_B[0] * r + AQ_B[1]) * r + AQ_B[2]) * r + AQ_B[3]) * r + AQ_B[4]) * r + 1);
    } else {
      const q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((AQ_C[0] * q + AQ_C[1]) * q + AQ_C[2]) * q + AQ_C[3]) * q + AQ_C[4]) * q + AQ_C[5]) /
           ((((AQ_D[0] * q + AQ_D[1]) * q + AQ_D[2]) * q + AQ_D[3]) * q + 1);
    }
    const e = cdfZ(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    return x - u / (1 + x * u / 2);
  }
  // 供控制台核对用
  window.__NORMAL_MATH = { erf, cdfZ, invZ, pdf };

  /* ---------- 状态 ---------- */
  const state = {
    mu: 0, sigma: 1,
    mode: 'area',            // area | value
    region: 'center',        // left | right | center
    a: -1, b: 1,             // 边界（实际值）
    area: 0.95,
    empirical: false,
    note: '',
  };
  const T = () => translations[lang];
  const W = 980, H = 440, M = { left: 84, right: 30, top: 26, bottom: 86 };

  /* 小数位：σ 很小的时候要多给几位 */
  const dec = () => {
    const s = state.sigma;
    return s >= 10 ? 1 : s >= 1 ? 2 : Math.min(6, 2 + Math.ceil(-Math.log10(s)));
  };
  const fx = v => Number.isFinite(v) ? v.toFixed(dec()) : '—';
  const fz = v => Number.isFinite(v) ? v.toFixed(4) : '—';
  const fp = v => Number.isFinite(v) ? v.toFixed(4) : '—';

  /* ---------- 由状态推出「边界 + 面积」 ---------- */
  /* 两种用法共用一个出口：都算出 lo / hi / area，画图和结果面板只认这个。 */
  function solve() {
    const { mu, sigma, region } = state;
    let lo = -Infinity, hi = Infinity, area;
    if (state.mode === 'area') {
      if (region === 'left') { hi = state.a; area = cdfZ(zOf(hi, mu, sigma)); }
      else if (region === 'right') { lo = state.a; area = 1 - cdfZ(zOf(lo, mu, sigma)); }
      else {
        lo = Math.min(state.a, state.b); hi = Math.max(state.a, state.b);
        area = cdfZ(zOf(hi, mu, sigma)) - cdfZ(zOf(lo, mu, sigma));
      }
    } else {
      const A = state.area;
      if (region === 'left') { hi = mu + invZ(A) * sigma; area = A; }
      else if (region === 'right') { lo = mu + invZ(1 - A) * sigma; area = A; }
      else {
        const z = invZ((1 + A) / 2);       // 关于 μ 对称
        lo = mu - z * sigma; hi = mu + z * sigma; area = A;
      }
    }
    return { lo, hi, area };
  }

  /* ---------- 界面 ---------- */
  const seg = (name, cur, opts) =>
    `<div class="seg" role="group">` + opts.map(([v, label]) =>
      `<button type="button" data-${name}="${v}"${v === cur ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"'}>${escapeHtml(label)}</button>`
    ).join('') + `</div>`;

  function buildUI() {
    const t = T();
    $('normalPage').innerHTML = `
      <div class="page-heading"><div>
        <h1 data-i18n="normal_title">${escapeHtml(t.normal_title)}</h1>
        <p data-i18n="normal_desc">${escapeHtml(t.normal_desc)}</p>
      </div></div>
      <section class="controls" data-i18n-aria="controls_aria">
        <label><span>${escapeHtml(t.normal_mu)}</span><input id="nMu" type="number" step="any" value="${state.mu}"></label>
        <label><span>${escapeHtml(t.normal_sigma)}</span><input id="nSigma" type="number" step="any" min="0" value="${state.sigma}"></label>
        <label class="seg-label"><span>${escapeHtml(t.normal_mode)}</span>${seg('mode', state.mode, [['area', t.normal_mode_area], ['value', t.normal_mode_value]])}</label>
        <label class="seg-label"><span>${escapeHtml(t.normal_region)}</span>${seg('region', state.region, [['left', t.normal_left], ['center', t.normal_center], ['right', t.normal_right]])}</label>
        <div id="nArgs" class="normal-args"></div>
        <label class="check"><input id="nEmp" type="checkbox"${state.empirical ? ' checked' : ''}><span>${escapeHtml(t.normal_empirical)}</span></label>
      </section>
      <p id="nNote" class="hint"></p>
      <div id="nStats" class="normal-stats"></div>
      <section class="chart-panel normal-chart-panel">
        <svg id="nChart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(t.normal_title)}"></svg>
      </section>`;

    $('nMu').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (!Number.isFinite(v)) return;
      const shift = v - state.mu;
      state.mu = v; state.a += shift; state.b += shift;   // 边界跟着曲线平移，不然一改 μ 就跑出屏幕
      render();
    });
    $('nSigma').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (!Number.isFinite(v) || v <= 0) { state.note = T().normal_sigma_bad; render(); return; }
      state.note = ''; state.sigma = v; render();
    });
    $('nEmp').addEventListener('change', e => { state.empirical = e.target.checked; render(); });

    $('normalPage').querySelectorAll('[data-mode]').forEach(b =>
      b.addEventListener('click', () => { state.mode = b.dataset.mode; state.note = ''; render(); }));
    $('normalPage').querySelectorAll('[data-region]').forEach(b =>
      b.addEventListener('click', () => { state.region = b.dataset.region; state.note = ''; render(); }));

    bindDrag();
  }

  /* 随 mode / region 变化的那几个输入框 */
  function renderArgs() {
    const t = T(), one = state.mode === 'area' && state.region !== 'center';
    let html = '';
    if (state.mode === 'area') {
      if (one) html = `<label><span>${escapeHtml(t.normal_bound)}</span><input id="nA" type="number" step="any" value="${state.a}"></label>`;
      else html = `<label><span>${escapeHtml(t.normal_lower)}</span><input id="nA" type="number" step="any" value="${Math.min(state.a, state.b)}"></label>`
                + `<label><span>${escapeHtml(t.normal_upper)}</span><input id="nB" type="number" step="any" value="${Math.max(state.a, state.b)}"></label>`;
    } else {
      html = `<label><span>${escapeHtml(t.normal_area_in)}</span><input id="nArea" type="number" step="0.01" min="0" max="1" value="${state.area}"></label>`
           + `<div class="preset"><span>${escapeHtml(t.normal_presets)}</span>`
           + [0.90, 0.95, 0.99].map(v => `<button type="button" data-area="${v}">${v}</button>`).join('')
           + `</div>`;
    }
    $('nArgs').innerHTML = html;

    const bindNum = (id, set) => {
      const el = $(id); if (!el) return;
      el.addEventListener('input', e => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) { set(v); render(true); }
      });
    };
    bindNum('nA', v => { state.a = v; });
    bindNum('nB', v => { state.b = v; });
    bindNum('nArea', v => {
      if (v <= 0 || v >= 1) { state.note = T().normal_area_bad; return; }
      state.note = ''; state.area = v;
    });
    $('nArgs').querySelectorAll('[data-area]').forEach(b =>
      b.addEventListener('click', () => { state.area = Number(b.dataset.area); state.note = ''; render(); }));
  }

  /* ---------- 画图 ---------- */
  const domain = () => [state.mu - 4 * state.sigma, state.mu + 4 * state.sigma];
  const px = x => { const [l, r] = domain(); return M.left + (W - M.left - M.right) * (x - l) / (r - l); };
  const xOfPx = p => { const [l, r] = domain(); return l + (p - M.left) * (r - l) / (W - M.left - M.right); };
  const peak = () => pdf(state.mu, state.mu, state.sigma);
  const headroom = () => state.empirical ? 1.34 : 1.08;   // 开经验法则时给顶部腾出空间
  const py = d => M.top + (H - M.bottom - M.top) * (1 - d / (peak() * headroom()));

  let fullCurve = { key: '', d: '' };
  const curveKey = () => `${state.mu}|${state.sigma}|${state.empirical}`;
  function fullCurvePath() {
    if (fullCurve.key !== curveKey()) {
      const [l, r] = domain();
      fullCurve = { key: curveKey(), d: curvePath(l, r) };
    }
    return fullCurve.d;
  }
  function curvePath(from, to) {
    const n = 240, [l, r] = domain();
    const a = Math.max(from, l), b = Math.min(to, r);
    if (!(b > a)) return '';
    let s = '';
    for (let i = 0; i <= n; i++) {
      const x = a + (b - a) * i / n;
      s += `${i ? 'L' : 'M'} ${px(x).toFixed(2)} ${py(pdf(x, state.mu, state.sigma)).toFixed(2)} `;
    }
    return s;
  }

  function draw() {
    const t = T(), { lo, hi, area } = solve();
    const base = H - M.bottom;
    const [l, r] = domain();
    let s = '';

    // 阴影区域
    const sa = Math.max(lo, l), sb = Math.min(hi, r);
    if (sb > sa) {
      s += `<path class="n-area" d="${curvePath(sa, sb)} L ${px(sb).toFixed(2)} ${base} L ${px(sa).toFixed(2)} ${base} Z"/>`;
    }

    // 经验法则
    if (state.empirical) {
      [[1, '68%'], [2, '95%'], [3, '99.7%']].forEach(([k, label]) => {
        const x1 = px(state.mu - k * state.sigma), x2 = px(state.mu + k * state.sigma);
        const y = M.top + 12 + (k - 1) * 17;
        s += `<line class="n-emp" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>` +
             `<line class="n-emp" x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}"/>` +
             `<line class="n-emp" x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}"/>` +
             `<text class="n-emp-text" x="${(x1 + x2) / 2}" y="${y - 5}" text-anchor="middle">${label}</text>`;
      });
    }

    // 曲线 + 基线
    s += `<line class="n-base" x1="${M.left}" y1="${base}" x2="${W - M.right}" y2="${base}"/>`;
    s += `<path class="n-curve" d="${fullCurvePath()}"/>`;

    // μ 中线
    s += `<line class="n-mu" x1="${px(state.mu)}" y1="${py(peak())}" x2="${px(state.mu)}" y2="${base}"/>` +
         `<text class="n-mu-text" x="${px(state.mu)}" y="${py(peak()) - 7}" text-anchor="middle">μ = ${fx(state.mu)}</text>`;

    // 双刻度：上排实际值，下排 z
    for (let k = -4; k <= 4; k++) {
      const x = state.mu + k * state.sigma, p = px(x);
      s += `<line class="n-tick" x1="${p}" y1="${base}" x2="${p}" y2="${base + 5}"/>` +
           `<text class="n-tick-x" x="${p}" y="${base + 20}" text-anchor="middle">${fx(x)}</text>` +
           `<text class="n-tick-z" x="${p}" y="${base + 40}" text-anchor="middle">${k}</text>`;
    }
    s += `<text class="n-axis" x="${M.left - 12}" y="${base + 20}" text-anchor="end">${escapeHtml(t.normal_axis_x)}</text>` +
         `<text class="n-axis" x="${M.left - 12}" y="${base + 40}" text-anchor="end">${escapeHtml(t.normal_axis_z)}</text>`;

    // 边界线（可拖）
    const bounds = [];
    if (Number.isFinite(lo)) bounds.push(['lo', lo]);
    if (Number.isFinite(hi)) bounds.push(['hi', hi]);
    for (const [key, v] of bounds) {
      if (v < l || v > r) continue;
      const p = px(v);
      s += `<line class="n-bound" x1="${p}" y1="${M.top}" x2="${p}" y2="${base}"/>` +
           `<rect class="n-grab" data-b="${key}" x="${p - 13}" y="${M.top - 20}" width="26" height="${base - M.top + 20}"/>` +
           `<g class="n-handle" data-b="${key}"><circle cx="${p}" cy="${M.top - 9}" r="9"/>` +
           `<path d="M ${p - 3.5} ${M.top - 12} L ${p - 3.5} ${M.top - 6} M ${p + 3.5} ${M.top - 12} L ${p + 3.5} ${M.top - 6}"/></g>` +
           `<text class="n-bound-text" x="${p}" y="${base + 62}" text-anchor="middle">${fx(v)}　(z = ${fz(zOf(v, state.mu, state.sigma))})</text>`;
    }

    // 面积标签贴在阴影上
    if (sb > sa && area > 0.0005) {
      const mid = (Math.max(sa, l) + Math.min(sb, r)) / 2;
      s += `<text class="n-area-text" x="${px(mid)}" y="${base - 14}" text-anchor="middle">${fp(area)}</text>`;
    }
    $('nChart').innerHTML = s;
  }

  /* 把拖到的位置写回状态。
     求面积模式直接改边界；求边界模式改的是面积 —— 那边的边界是算出来的，
     直接写边界会被下一次 solve() 覆盖掉，所以反推成面积才站得住。 */
  function applyDragTo(x, which) {
    const { mu, sigma, region } = state;
    if (state.mode === 'area') {
      if (region === 'center') {
        if (which === 'lo') state.a = Math.min(x, state.b);
        else state.b = Math.max(x, state.a);
      } else state.a = x;
      return;
    }
    const z = zOf(x, mu, sigma);
    let A;
    if (region === 'left') A = cdfZ(z);
    else if (region === 'right') A = 1 - cdfZ(z);
    else A = 2 * cdfZ(Math.abs(z)) - 1;          // 中间区域对称，只认离 μ 的距离
    state.area = +Math.min(0.9999, Math.max(0.0001, A)).toFixed(4);
  }

  /* 拖动边界。整条竖线都是抓取区（.n-grab 是一条透明的宽带），
     重绘用 requestAnimationFrame 节流，一帧最多画一次。 */
  function bindDrag() {
    const svg = $('nChart');
    let drag = null, pending = null, raf = 0;
    const toX = ev => {
      const box = svg.getBoundingClientRect();
      return xOfPx((ev.clientX - box.left) * W / box.width);
    };
    const flush = () => {
      raf = 0;
      if (pending === null) return;
      applyDragTo(pending, drag);
      pending = null;
      render(false, true);
    };
    svg.addEventListener('pointerdown', ev => {
      const g = ev.target.closest('.n-grab, .n-handle');
      if (!g) return;
      drag = g.dataset.b;
      try { svg.setPointerCapture(ev.pointerId); } catch {}
      svg.classList.add('dragging');
      ev.preventDefault();
    });
    svg.addEventListener('pointermove', ev => {
      if (!drag) return;
      pending = toX(ev);
      if (!raf) raf = requestAnimationFrame(flush);
    });
    const stop = ev => {
      if (!drag) return;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      flush();
      drag = null;
      svg.classList.remove('dragging');
      try { svg.releasePointerCapture(ev.pointerId); } catch {}
      render();
    };
    svg.addEventListener('pointerup', stop);
    svg.addEventListener('pointercancel', stop);
  }

  /* ---------- 结果面板 ---------- */
  function renderStats() {
    const t = T(), { lo, hi, area } = solve();
    const cell = (label, value, cls) =>
      `<div class="${cls || ''}"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`;
    const zl = Number.isFinite(lo) ? fz(zOf(lo, state.mu, state.sigma)) : '−∞';
    const zh = Number.isFinite(hi) ? fz(zOf(hi, state.mu, state.sigma)) : '+∞';

    let expr;
    if (state.region === 'left') expr = `P(X < ${fx(hi)})`;
    else if (state.region === 'right') expr = `P(X > ${fx(lo)})`;
    else expr = `P(${fx(lo)} < X < ${fx(hi)})`;

    $('nStats').innerHTML =
      cell(t.normal_prob, `${escapeHtml(expr)} = <b>${fp(area)}</b>`, 'wide') +
      cell(state.region === 'center' ? `${t.normal_value}　${t.normal_lohi}` : t.normal_value,
           state.region === 'center' ? `${fx(lo)} ， ${fx(hi)}`
             : state.region === 'left' ? fx(hi) : fx(lo)) +
      cell(t.normal_zscore, state.region === 'center' ? `${zl} ， ${zh}`
             : state.region === 'left' ? zh : zl) +
      cell('μ ， σ', `${fx(state.mu)} ， ${fx(state.sigma)}`);
  }

  /* ---------- 渲染 ---------- */
  /* keepArgs: 正在输入框里打字时不要重建输入框，否则光标会跳
     keepAll : 拖动过程中连输入框的值也先不同步，拖完再统一刷新 */
  function syncSegs() {
    const page = $('normalPage');
    page.querySelectorAll('[data-mode]').forEach(b => {
      const on = b.dataset.mode === state.mode;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    page.querySelectorAll('[data-region]').forEach(b => {
      const on = b.dataset.region === state.region;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function render(keepArgs, keepAll) {
    if (!keepArgs && !keepAll) renderArgs();
    else if (keepAll) syncArgInputs();
    syncSegs();
    $('nNote').textContent = state.note || T().normal_drag;
    $('nNote').classList.toggle('danger', !!state.note);
    renderStats();
    draw();
  }
  /* 拖动时只改输入框里的数字，不重建元素 */
  function syncArgInputs() {
    const a = $('nA'), b = $('nB');
    if (state.mode !== 'area') {
      const ar = $('nArea');
      if (ar) ar.value = state.area.toFixed(4);
      return;
    }
    if (state.region === 'center') {
      if (a) a.value = Math.min(state.a, state.b).toFixed(dec());
      if (b) b.value = Math.max(state.a, state.b).toFixed(dec());
    } else if (a) a.value = state.a.toFixed(dec());
  }

  /* ---------- 启动 ---------- */
  buildUI();
  render();
  document.addEventListener('apstats:tool', e => { if (e.detail === 'normal') render(); });
  document.addEventListener('apstats:language', () => { buildUI(); render(); });
})();
