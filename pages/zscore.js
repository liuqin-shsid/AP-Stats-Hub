/* z-score 标准化 —— 手绘散点图 + 标准化并排对照。
   功能：
     1) 用户在图里点击加点、拖动移动、右键删除
     2) 左图：原始单位散点图；右图：标准化散点图（z 分数）
     3) 两张图下方各显示对应统计量（n、均值、标准差、r、回归线）
   数据源：无需 Excel，纯手绘。 */
(() => {
  Object.assign(translations.zh, {
    zscore_title: 'z-score 标准化',
    zscore_desc: '在左图点击添加散点，拖动移动，右键删除；右图自动显示标准化后的散点。',
    zscore_raw_title: '原始数据散点图',
    zscore_std_title: '标准化散点图',
    zscore_raw_x: 'x',
    zscore_raw_y: 'y',
    zscore_std_x: 'z(x)',
    zscore_std_y: 'z(y)',
    zscore_n: 'n',
    zscore_mean_x: 'x̄',
    zscore_mean_y: 'ȳ',
    zscore_sd_x: 'sₓ',
    zscore_sd_y: 'sᵧ',
    zscore_r: 'r',
    zscore_r2: 'R²',
    zscore_line: '回归线',
    zscore_clear: '清空',
    zscore_undo: '撤销',
    zscore_need: '至少需要 2 个点才能计算统计量。',
    zscore_x_label: 'x',
    zscore_y_label: 'y',
    zscore_zx_label: 'z(x)',
    zscore_zy_label: 'z(y)',
  });
  Object.assign(translations.en, {
    zscore_title: 'z-score Standardization',
    zscore_desc: 'Click to add points, drag to move, right-click to delete; the right plot shows standardized points automatically.',
    zscore_raw_title: 'Raw data scatterplot',
    zscore_std_title: 'Standardized scatterplot',
    zscore_raw_x: 'x',
    zscore_raw_y: 'y',
    zscore_std_x: 'z(x)',
    zscore_std_y: 'z(y)',
    zscore_n: 'n',
    zscore_mean_x: 'x̄',
    zscore_mean_y: 'ȳ',
    zscore_sd_x: 'sₓ',
    zscore_sd_y: 'sᵧ',
    zscore_r: 'r',
    zscore_r2: 'R²',
    zscore_line: 'Regression',
    zscore_clear: 'Clear',
    zscore_undo: 'Undo',
    zscore_need: 'At least 2 points are needed for statistics.',
    zscore_x_label: 'x',
    zscore_y_label: 'y',
    zscore_zx_label: 'z(x)',
    zscore_zy_label: 'z(y)',
  });

  const XMIN = 0, XMAX = 20, YMIN = 0, YMAX = 20;
  const HIT = 0.45;

  const state = {
    points: [],
    history: [],
    drag: null,
    built: false,
  };

  const rawSVGId = 'zscoreRawSVG';
  const stdSVGId = 'zscoreStdSVG';
  const rawStatsId = 'zscoreRawStats';
  const stdStatsId = 'zscoreStdStats';

  const SIZES = {
    raw: { w: 620, h: 470, m: { left: 60, right: 20, top: 24, bottom: 56 } },
    std: { w: 620, h: 470, m: { left: 60, right: 20, top: 24, bottom: 56 } },
  };

  // ---------- 统计 ----------
  function stats(arr) {
    const n = arr.length;
    if (n === 0) return { n: 0, mean: NaN, sd: NaN };
    const mean = arr.reduce((s, v) => s + v, 0) / n;
    const sd = n < 2 ? NaN : Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
    return { n, mean, sd };
  }
  function regression(xs, ys) {
    const n = xs.length;
    if (n < 2) return null;
    const mx = xs.reduce((s, v) => s + v, 0) / n;
    const my = ys.reduce((s, v) => s + v, 0) / n;
    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - mx, dy = ys[i] - my;
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    }
    if (sxx === 0 || syy === 0) return null;
    const slope = sxy / sxx;
    const intercept = my - slope * mx;
    const r = sxy / Math.sqrt(sxx * syy);
    return { slope, intercept, r, r2: r * r };
  }
  const fmt = v => (Number.isFinite(v) ? Number(v.toPrecision(6)).toString() : '—');

  // ---------- 坐标 ----------
  function scaleLinear(value, d, a, b) {
    return a + (value - d[0]) * (b - a) / (d[1] - d[0]);
  }
  function domainFrom(values, fallback) {
    if (values.length === 0) return fallback;
    let lo = Math.min(...values), hi = Math.max(...values);
    if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.08;
    return [lo - pad, hi + pad];
  }
  function ticks(lo, hi, count) {
    return Array.from({ length: count }, (_, i) => lo + (hi - lo) * i / (count - 1));
  }

  // ---------- 绘制 ----------
  function drawRaw() {
    const svg = document.getElementById(rawSVGId);
    if (!svg) return;
    const { w, h, m } = SIZES.raw;
    const xs = state.points.map(p => p.x);
    const ys = state.points.map(p => p.y);
    const dx = [XMIN, XMAX];
    const dy = [YMIN, YMAX];
    const sx = v => scaleLinear(v, dx, m.left, w - m.right);
    const sy = v => scaleLinear(v, dy, h - m.bottom, m.top);

    let html = '';
    // 网格
    ticks(dx[0], dx[1], 6).forEach(v => {
      const x = sx(v);
      html += `<line x1="${x}" y1="${m.top}" x2="${x}" y2="${h - m.bottom}" stroke="#e4e9ee"/>`;
      html += `<text x="${x}" y="${h - m.bottom + 18}" text-anchor="middle" font-size="12" fill="#5b6874">${fmt(v)}</text>`;
    });
    ticks(dy[0], dy[1], 6).forEach(v => {
      const y = sy(v);
      html += `<line x1="${m.left}" y1="${y}" x2="${w - m.right}" y2="${y}" stroke="#e4e9ee"/>`;
      html += `<text x="${m.left - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="#5b6874">${fmt(v)}</text>`;
    });
    // 轴
    html += `<line x1="${m.left}" y1="${h - m.bottom}" x2="${w - m.right}" y2="${h - m.bottom}" stroke="#50606d" stroke-width="1.2"/>`;
    html += `<line x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${h - m.bottom}" stroke="#50606d" stroke-width="1.2"/>`;

    // 回归线
    const fit = regression(xs, ys);
    if (fit) {
      html += `<line x1="${sx(XMIN)}" y1="${sy(fit.intercept + fit.slope * XMIN)}" x2="${sx(XMAX)}" y2="${sy(fit.intercept + fit.slope * XMAX)}" stroke="#c73932" stroke-width="2.2"/>`;
    }

    // 数据点
    state.points.forEach((p, i) => {
      html += `<circle data-idx="${i}" cx="${sx(p.x)}" cy="${sy(p.y)}" r="7" fill="#2878b8" stroke="#fff" stroke-width="1.5" style="cursor:grab"/>`;
    });

    // 轴标签
    html += `<text x="${(m.left + w - m.right) / 2}" y="${h - 14}" text-anchor="middle" font-size="14" fill="#263844">${translations[lang].zscore_x_label}</text>`;
    html += `<text transform="translate(16 ${(m.top + h - m.bottom) / 2}) rotate(-90)" text-anchor="middle" font-size="14" fill="#263844">${translations[lang].zscore_y_label}</text>`;

    svg.innerHTML = html;
    return { sx, sy, dx, dy, m, w, h };
  }

  function drawStd() {
    const svg = document.getElementById(stdSVGId);
    if (!svg) return;
    const { w, h, m } = SIZES.std;
    const xs = state.points.map(p => p.x);
    const ys = state.points.map(p => p.y);
    const sxStats = stats(xs), syStats = stats(ys);
    const canStd = state.points.length >= 2 && sxStats.sd > 0 && syStats.sd > 0;

    let html = '';
    let zx = [], zy = [], dx, dy;

    if (canStd) {
      zx = xs.map(v => (v - sxStats.mean) / sxStats.sd);
      zy = ys.map(v => (v - syStats.mean) / syStats.sd);
      const lo = Math.min(...zx, ...zy, -2);
      const hi = Math.max(...zx, ...zy, 2);
      const pad = Math.max((hi - lo) * 0.08, 0.2);
      const lim = Math.max(Math.abs(lo), Math.abs(hi)) + pad;
      dx = [-lim, lim];
      dy = [-lim, lim];
    } else {
      dx = [-3, 3];
      dy = [-3, 3];
    }
    const sx = v => scaleLinear(v, dx, m.left, w - m.right);
    const sy = v => scaleLinear(v, dy, h - m.bottom, m.top);

    // 网格
    ticks(dx[0], dx[1], 6).forEach(v => {
      const x = sx(v);
      html += `<line x1="${x}" y1="${m.top}" x2="${x}" y2="${h - m.bottom}" stroke="#e4e9ee"/>`;
      html += `<text x="${x}" y="${h - m.bottom + 18}" text-anchor="middle" font-size="12" fill="#5b6874">${fmt(v)}</text>`;
    });
    ticks(dy[0], dy[1], 6).forEach(v => {
      const y = sy(v);
      html += `<line x1="${m.left}" y1="${y}" x2="${w - m.right}" y2="${y}" stroke="#e4e9ee"/>`;
      html += `<text x="${m.left - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="#5b6874">${fmt(v)}</text>`;
    });
    // 轴
    html += `<line x1="${m.left}" y1="${h - m.bottom}" x2="${w - m.right}" y2="${h - m.bottom}" stroke="#50606d" stroke-width="1.2"/>`;
    html += `<line x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${h - m.bottom}" stroke="#50606d" stroke-width="1.2"/>`;
    // 零轴
    if (dx[0] < 0 && dx[1] > 0) {
      html += `<line x1="${sx(0)}" y1="${m.top}" x2="${sx(0)}" y2="${h - m.bottom}" stroke="#888" stroke-width="0.9"/>`;
    }
    if (dy[0] < 0 && dy[1] > 0) {
      html += `<line x1="${m.left}" y1="${sy(0)}" x2="${w - m.right}" y2="${sy(0)}" stroke="#888" stroke-width="0.9"/>`;
    }

    // 回归线（标准化后）
    if (canStd) {
      const fit = regression(zx, zy);
      if (fit) {
        html += `<line x1="${sx(dx[0])}" y1="${sy(fit.intercept + fit.slope * dx[0])}" x2="${sx(dx[1])}" y2="${sy(fit.intercept + fit.slope * dx[1])}" stroke="#c73932" stroke-width="2.2"/>`;
      }
    }
    // 数据点
    if (canStd) {
      zx.forEach((vx, i) => {
        html += `<circle cx="${sx(vx)}" cy="${sy(zy[i])}" r="7" fill="#c17b23" stroke="#fff" stroke-width="1.5"/>`;
      });
    }

    // 轴标签
    html += `<text x="${(m.left + w - m.right) / 2}" y="${h - 14}" text-anchor="middle" font-size="14" fill="#263844">${translations[lang].zscore_zx_label}</text>`;
    html += `<text transform="translate(16 ${(m.top + h - m.bottom) / 2}) rotate(-90)" text-anchor="middle" font-size="14" fill="#263844">${translations[lang].zscore_zy_label}</text>`;

    svg.innerHTML = html;
  }

  // ---------- 统计面板 ----------
  function statsHTML(xs, ys, mode) {
    const t = translations[lang];
    const sxStats = stats(xs), syStats = stats(ys);
    const fit = regression(xs, ys);
    const rows = [];
    rows.push(`<div><span>${t.zscore_n}</span><strong>${state.points.length}</strong></div>`);
    rows.push(`<div><span>${mode === 'std' ? 'z̄ₓ' : 'x̄'}</span><strong>${fmt(sxStats.mean)}</strong></div>`);
    rows.push(`<div><span>${mode === 'std' ? 'z̄ᵧ' : 'ȳ'}</span><strong>${fmt(syStats.mean)}</strong></div>`);
    rows.push(`<div><span>${mode === 'std' ? 's(zₓ)' : 'sₓ'}</span><strong>${fmt(sxStats.sd)}</strong></div>`);
    rows.push(`<div><span>${mode === 'std' ? 's(zᵧ)' : 'sᵧ'}</span><strong>${fmt(syStats.sd)}</strong></div>`);
    if (fit) {
      rows.push(`<div><span>${t.zscore_r}</span><strong>${fmt(fit.r)}</strong></div>`);
      rows.push(`<div><span>${t.zscore_r2}</span><strong>${fmt(fit.r2)}</strong></div>`);
      rows.push(`<div><span>${t.zscore_line}</span><strong>ŷ = ${fmt(fit.slope)}x ${fit.intercept >= 0 ? '+' : '−'} ${fmt(Math.abs(fit.intercept))}</strong></div>`);
    } else {
      rows.push(`<div class="hint" style="grid-column:1/-1">${t.zscore_need}</div>`);
    }
    return rows.join('');
  }

  function updateStats() {
    const xs = state.points.map(p => p.x);
    const ys = state.points.map(p => p.y);
    const rawBox = document.getElementById(rawStatsId);
    const stdBox = document.getElementById(stdStatsId);
    if (rawBox) rawBox.innerHTML = statsHTML(xs, ys, 'raw');
    if (stdBox) {
      const sxStats = stats(xs), syStats = stats(ys);
      if (state.points.length >= 2 && sxStats.sd > 0 && syStats.sd > 0) {
        const zx = xs.map(v => (v - sxStats.mean) / sxStats.sd);
        const zy = ys.map(v => (v - syStats.mean) / syStats.sd);
        stdBox.innerHTML = statsHTML(zx, zy, 'std');
      } else {
        stdBox.innerHTML = `<div class="hint" style="grid-column:1/-1">${translations[lang].zscore_need}</div>`;
      }
    }
  }

  function redrawAll() {
    drawRaw();
    drawStd();
    updateStats();
  }

  // ---------- 鼠标交互 ----------
  function getRawSVG() { return document.getElementById(rawSVGId); }
  function getPointCoordinates(event) {
    const svg = getRawSVG();
    const r = svg.getBoundingClientRect();
    const { w, h, m } = SIZES.raw;
    const px = (event.clientX - r.left) * w / r.width;
    const py = (event.clientY - r.top) * h / r.height;
    if (px < m.left || px > w - m.right || py < m.top || py > h - m.bottom) return null;
    const x = scaleLinear(px, [m.left, w - m.right], XMIN, XMAX);
    const y = scaleLinear(py, [h - m.bottom, m.top], YMIN, YMAX);
    return { x, y };
  }
  function findPoint(x, y) {
    let best = -1, bestD = HIT;
    state.points.forEach((p, i) => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function attachEvents() {
    const svg = getRawSVG();
    if (!svg) return;
    svg.style.touchAction = 'none';
    svg.addEventListener('contextmenu', e => e.preventDefault());

    svg.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      const p = getPointCoordinates(event);
      if (!p) return;
      const idx = findPoint(p.x, p.y);
      state.history.push(JSON.parse(JSON.stringify(state.points)));
      if (idx >= 0) {
        state.drag = { idx };
      } else {
        state.points.push({ x: p.x, y: p.y });
        redrawAll();
      }
      svg.setPointerCapture(event.pointerId);
    });

    svg.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const p = getPointCoordinates(event);
      if (!p) return;
      state.points[state.drag.idx] = { x: p.x, y: p.y };
      redrawAll();
    });

    svg.addEventListener('pointerup', event => {
      state.drag = null;
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    });

    svg.addEventListener('pointercancel', () => { state.drag = null; });

    svg.addEventListener('contextmenu', event => {
      const p = getPointCoordinates(event);
      if (!p) return;
      const idx = findPoint(p.x, p.y);
      if (idx >= 0) {
        state.history.push(JSON.parse(JSON.stringify(state.points)));
        state.points.splice(idx, 1);
        redrawAll();
      }
    });
  }

  // ---------- UI ----------
  function buildUI() {
    const t = translations[lang];
    document.getElementById('zscorePage').innerHTML = `
      <div class="page-heading"><div>
        <h1 data-i18n="zscore_title">${t.zscore_title}</h1>
        <p data-i18n="zscore_desc">${t.zscore_desc}</p>
      </div></div>
      <section class="controls" data-i18n-aria="controls_aria">
        <button id="zscoreClear" class="reset" type="button">${t.zscore_clear}</button>
        <button id="zscoreUndo" class="secondary-button" type="button">${t.zscore_undo}</button>
      </section>
      <div class="zscore-pair">
        <section class="chart-panel">
          <h2>${t.zscore_raw_title}</h2>
          <svg id="${rawSVGId}" viewBox="0 0 620 470" role="img"></svg>
          <section id="${rawStatsId}" class="zscore-stats"></section>
        </section>
        <section class="chart-panel">
          <h2>${t.zscore_std_title}</h2>
          <svg id="${stdSVGId}" viewBox="0 0 620 470" role="img"></svg>
          <section id="${stdStatsId}" class="zscore-stats"></section>
        </section>
      </div>`;

    document.getElementById('zscoreClear').addEventListener('click', () => {
      if (state.points.length === 0) return;
      state.history.push(JSON.parse(JSON.stringify(state.points)));
      state.points = [];
      redrawAll();
    });
    document.getElementById('zscoreUndo').addEventListener('click', () => {
      if (state.history.length === 0) return;
      state.points = state.history.pop();
      redrawAll();
    });

    attachEvents();
    redrawAll();
    state.built = true;
  }

  // ---------- 启动 ----------
  function tryBuild() {
    if (document.getElementById('zscorePage')) buildUI();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryBuild);
  } else {
    tryBuild();
  }

  document.addEventListener('apstats:tool', e => {
    if (e.detail !== 'zscore') return;
    if (!state.built) buildUI();
    else redrawAll();
  });
  document.addEventListener('apstats:language', () => {
    if (state.built) {
      buildUI();
    }
  });
})();
