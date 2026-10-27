/* Re-expression & Regression Tool */
(function () {
  'use strict';

  // 翻译字典补充（解决侧边栏和页面里的英文问题）
  if (typeof translations !== 'undefined') {
    translations.zh = translations.zh || {};
    translations.en = translations.en || {};
    translations.zh['reexpr_title'] = '重新表达';
    translations.zh['reexpr_desc'] = '通过点击或输入函数生成散点，观察变换 x 或 y 对线性拟合和残差的影响。';
    translations.en['reexpr_title'] = 'Re-expression';
    translations.en['reexpr_desc'] = 'Add points or generate a function, explore how transforming x or y affects linear fit and residuals.';
    
    // 补充内部使用的翻译
    Object.assign(translations.zh, {
      reexpr_xlabel: '对 X 变换:', reexpr_ylabel: '对 Y 变换:', reexpr_fitBtn: '拟合 & 显示残差',
      reexpr_clearBtn: '清空全部', reexpr_funcLabel: '生成函数 y =', reexpr_genBtn: '生成散点',
      reexpr_topTitle: '原始数据', reexpr_botTitle: '重新表达后的数据', reexpr_residTitle: '残差图',
      reexpr_invalidFunc: '无效的函数'
    });
    Object.assign(translations.en, {
      reexpr_xlabel: 'Re-express x:', reexpr_ylabel: 'Re-express y:', reexpr_fitBtn: 'Fit & Show Residuals',
      reexpr_clearBtn: 'Clear All', reexpr_funcLabel: 'Function y =', reexpr_genBtn: 'Generate Points',
      reexpr_topTitle: 'Original Data', reexpr_botTitle: 'Re-expressed Data', reexpr_residTitle: 'Residuals',
      reexpr_invalidFunc: 'Invalid Function'
    });
  }

  const t = (key) => (typeof lang !== 'undefined' && translations[lang] && translations[lang][key]) ? translations[lang][key] : key;

  const TRANSFORMS = {
    'none': { fx: v => v, label: { zh: '无', en: 'None' }, eq: { zh: 'x', en: 'x' } },
    'log': { fx: v => Math.log(v), label: { zh: 'log', en: 'log' }, eq: { zh: '\\log(x)', en: '\\log(x)' } },
    'inv': { fx: v => 1 / v, label: { zh: '1/x', en: '1/x' }, eq: { zh: '\\frac{1}{x}', en: '1/x' } },
    'sqrt': { fx: v => Math.sqrt(v), label: { zh: '√x', en: '√x' }, eq: { zh: '\\sqrt{x}', en: '\\sqrt{x}' } },
    'sq': { fx: v => v * v, label: { zh: 'x²', en: 'x²' }, eq: { zh: 'x^2', en: 'x^2' } },
    'ninv': { fx: v => -1 / v, label: { zh: '-1/x', en: '-1/x' }, eq: { zh: '-\\frac{1}{x}', en: '-1/x' } },
    'nsqrt': { fx: v => -1 / Math.sqrt(v), label: { zh: '-1/√x', en: '-1/√x' }, eq: { zh: '-\\frac{1}{\\sqrt{x}}', en: '-1/\\sqrt{x}' } }
  };

  let xTf = 'none', yTf = 'none';
  let points = [];
  let showFit = false;
  let domInitialized = false;

  function initDOM() {
    const page = document.getElementById('reexprPage');
    if (!page) return;

    // 防止重复注入 DOM
    if (domInitialized) return;
    domInitialized = true;

    page.innerHTML = `
      <div class="page-heading">
        <div>
          <h1 data-i18n="reexpr_title"></h1>
          <p data-i18n="reexpr_desc"></p>
        </div>
      </div>
      
      <section class="controls" style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
        <button id="reexprFitBtn" class="reset" style="min-width:160px;" data-i18n="reexpr_fitBtn"></button>
        <button id="reexprClearBtn" class="secondary-button" data-i18n="reexpr_clearBtn"></button>
        <div style="display:flex; align-items:center; gap:8px;">
          <span id="reexprFuncLabel" style="font-weight:bold; color:#17324d;" data-i18n="reexpr_funcLabel"></span>
          <input id="reexprFuncInput" type="text" style="width:150px; padding:6px; border:1px solid #c9d2da; border-radius:4px;" placeholder="e.g. 2x+3">
          <button id="reexprGenBtn" class="secondary-button" data-i18n="reexpr_genBtn"></button>
        </div>
      </section>

      <section class="controls" style="margin-top:10px; display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; align-items:center;">
          <span style="width:100px; font-weight:bold; color:#17324d;" data-i18n="reexpr_xlabel"></span>
          <div id="reexprXGroup" style="display:flex; gap:5px; flex-wrap:wrap;"></div>
        </div>
        <div style="display:flex; align-items:center;">
          <span style="width:100px; font-weight:bold; color:#17324d;" data-i18n="reexpr_ylabel"></span>
          <div id="reexprYGroup" style="display:flex; gap:5px; flex-wrap:wrap;"></div>
        </div>
      </section>

      <div class="reexpr-grid">
        <div class="reexpr-card">
          <h2 data-i18n="reexpr_topTitle"></h2>
          <svg id="reexprSvgTop" viewBox="0 0 400 300" class="reexpr-chart"></svg>
        </div>
        <div class="reexpr-card">
          <h2 data-i18n="reexpr_residTitle"></h2>
          <svg id="reexprSvgResidTop" viewBox="0 0 400 300" class="reexpr-chart"></svg>
        </div>
        <div class="reexpr-card reexpr-equ">
          <div id="reexprEquTop"></div>
        </div>

        <div class="reexpr-card">
          <h2 data-i18n="reexpr_botTitle"></h2>
          <svg id="reexprSvgBot" viewBox="0 0 400 300" class="reexpr-chart"></svg>
        </div>
        <div class="reexpr-card">
          <h2 data-i18n="reexpr_residTitle"></h2>
          <svg id="reexprSvgResidBot" viewBox="0 0 400 300" class="reexpr-chart"></svg>
        </div>
        <div class="reexpr-card reexpr-equ">
          <div id="reexprEquBot"></div>
        </div>
      </div>
    `;

    document.getElementById('reexprFitBtn').onclick = () => { showFit = !showFit; render(); };
    document.getElementById('reexprClearBtn').onclick = () => {
      points = []; showFit = false;
      document.getElementById('reexprFuncInput').value = '';
      render();
    };
    document.getElementById('reexprGenBtn').onclick = generatePoints;
    
    const svgTop = document.getElementById('reexprSvgTop');
    svgTop.addEventListener('contextmenu', e => e.preventDefault());
    svgTop.addEventListener('mousedown', handleCanvasClick);

    createButtons();
    if (typeof applyLang === 'function') applyLang(); // 让 data-i18n 立即生效
    render();
  }

  function createButtons() {
    const xGroup = document.getElementById('reexprXGroup');
    const yGroup = document.getElementById('reexprYGroup');
    if (!xGroup || !yGroup) return;
    
    xGroup.innerHTML = ''; yGroup.innerHTML = '';
    
    Object.keys(TRANSFORMS).forEach(id => {
      let btn = document.createElement('button');
      btn.className = 'secondary-button'; btn.dataset.id = id;
      btn.textContent = TRANSFORMS[id].label[lang] || TRANSFORMS[id].label['en'];
      btn.onclick = () => { xTf = id; updateButtons(); render(); };
      xGroup.appendChild(btn);

      let btnY = document.createElement('button');
      btnY.className = 'secondary-button'; btnY.dataset.id = id;
      btnY.textContent = TRANSFORMS[id].label[lang] || TRANSFORMS[id].label['en'];
      btnY.onclick = () => { yTf = id; updateButtons(); render(); };
      yGroup.appendChild(btnY);
    });
    updateButtons();
  }

  function updateButtons() {
    document.querySelectorAll('#reexprXGroup button').forEach(btn => {
      const active = btn.dataset.id === xTf;
      btn.style.backgroundColor = active ? '#2f6fb0' : 'white';
      btn.style.color = active ? 'white' : '#17324d';
      btn.style.borderColor = active ? '#2f6fb0' : '#c9d2da';
    });
    document.querySelectorAll('#reexprYGroup button').forEach(btn => {
      const active = btn.dataset.id === yTf;
      btn.style.backgroundColor = active ? '#2f6fb0' : 'white';
      btn.style.color = active ? 'white' : '#17324d';
      btn.style.borderColor = active ? '#2f6fb0' : '#c9d2da';
    });
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function clearSVG(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function el(tag, attrs) {
    const e = document.createElementNS(SVG_NS, tag);
    for (let k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function scale(v, d0, d1, a, b) { return a + (v - d0) * (b - a) / ((d1 - d0) || 1); }

  function getLinearFit(x, y) {
    if (x.length < 2) return null;
    let n = x.length, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sx += x[i]; sy += y[i];
      sxx += x[i] * x[i]; sxy += x[i] * y[i]; syy += y[i] * y[i];
    }
    let mx = sx / n, my = sy / n;
    let ss_xx = sxx - n * mx * mx;
    let ss_xy = sxy - n * mx * my;
    let ss_yy = syy - n * my * my;
    if (ss_xx === 0) return null;
    
    let b1 = ss_xy / ss_xx;
    let b0 = my - b1 * mx;
    let r2 = (ss_xx * ss_yy !== 0) ? (ss_xy * ss_xy) / (ss_xx * ss_yy) : 0;
    
    let y_pred = x.map(val => b1 * val + b0);
    let residuals = y.map((val, i) => val - y_pred[i]);
    return { b0, b1, y_pred, residuals, r2 };
  }

  function drawPanel(svgMain, svgResid, divEq, mode) {
    if (!svgMain || !svgResid || !divEq) return;
    clearSVG(svgMain); clearSVG(svgResid); divEq.innerHTML = '';

    const w = 400, h = 300, m = { left: 45, right: 15, top: 25, bottom: 35 };
    let xRaw = points.map(p => p.x), yRaw = points.map(p => p.y);
    let xData = [], yData = [];

    if (mode === 'top') {
      xData = [...xRaw]; yData = [...yRaw];
    } else {
      const fx = TRANSFORMS[xTf].fx, fy = TRANSFORMS[yTf].fx;
      points.forEach(p => {
        let vx = p.x, vy = p.y, v = true;
        if (['log', 'inv', 'sqrt', 'ninv', 'nsqrt'].includes(xTf) && vx <= 0) v = false;
        if (['log', 'inv', 'sqrt', 'ninv', 'nsqrt'].includes(yTf) && vy <= 0) v = false;
        if (v) {
          try {
            let tx = fx(vx), ty = fy(vy);
            if (isFinite(tx) && isFinite(ty)) { xData.push(tx); yData.push(ty); }
          } catch(e) {}
        }
      });
    }

    let xMin = 0, xMax = 10, yMin = 0, yMax = 10;
    if (xData.length > 0) {
      xMin = Math.min(...xData); xMax = Math.max(...xData);
      yMin = Math.min(...yData); yMax = Math.max(...yData);
    }
    if (xMin === xMax) { xMin -= 1; xMax += 1; }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    if (mode === 'top') { xMin = Math.min(0, xMin); yMin = Math.min(0, yMin); }
    else {
      let xPad = (xMax - xMin) * 0.1, yPad = (yMax - yMin) * 0.1;
      xMin -= xPad; xMax += xPad; yMin -= yPad; yMax += yPad;
    }
    xMax = xMax * 1.05; yMax = yMax * 1.05;

    const sx = v => scale(v, xMin, xMax, m.left, w - m.right);
    const sy = v => scale(v, yMin, yMax, h - m.bottom, m.top);

    for (let i = 0; i <= 5; i++) {
      let v = xMin + (xMax - xMin) * i / 5;
      let px = sx(v);
      svgMain.appendChild(el('line', { x1: px, y1: m.top, x2: px, y2: h - m.bottom, class: 'grid' }));
      let tx = el('text', { x: px, y: h - m.bottom + 15, class: 'tick', 'text-anchor': 'middle' });
      tx.textContent = Number(v.toPrecision(3)); svgMain.appendChild(tx);

      let vy = yMin + (yMax - yMin) * i / 5;
      let py = sy(vy);
      svgMain.appendChild(el('line', { x1: m.left, y1: py, x2: w - m.right, y2: py, class: 'grid' }));
      let ty = el('text', { x: m.left - 5, y: py + 4, class: 'tick', 'text-anchor': 'end' });
      ty.textContent = Number(vy.toPrecision(3)); svgMain.appendChild(ty);
    }
    svgMain.appendChild(el('line', { x1: m.left, y1: h - m.bottom, x2: w - m.right, y2: h - m.bottom, class: 'axis' }));
    svgMain.appendChild(el('line', { x1: m.left, y1: m.top, x2: m.left, y2: h - m.bottom, class: 'axis' }));

    xData.forEach((x, i) => {
      svgMain.appendChild(el('circle', { cx: sx(x), cy: sy(yData[i]), r: 5, fill: '#5b8bbf', stroke: '#2b4a6b', 'stroke-width': 1.5 }));
    });

    if (!showFit || xData.length < 2) {
      if (xData.length === 0) {
         let txt = el('text', { x: w/2, y: h/2, 'text-anchor': 'middle', fill: '#7a8791', 'font-size': '14px' });
         txt.textContent = mode === 'top' ? "Click to add points" : "No valid data";
         svgMain.appendChild(txt);
      }
      return;
    }

    let fit = getLinearFit(xData, yData);
    if (!fit) return;

    let lineX1 = xMin, lineX2 = xMax;
    let lineY1 = fit.b1 * lineX1 + fit.b0;
    let lineY2 = fit.b1 * lineX2 + fit.b0;
    svgMain.appendChild(el('line', { x1: sx(lineX1), y1: sy(lineY1), x2: sx(lineX2), y2: sy(lineY2), stroke: '#c73932', 'stroke-width': 2.5 }));

    let maxRes = Math.max(...fit.residuals.map(Math.abs), 0.1);
    let resYMin = -maxRes * 1.2, resYMax = maxRes * 1.2;
    let minPred = Math.min(...fit.y_pred), maxPred = Math.max(...fit.y_pred);
    if (minPred === maxPred) { minPred -= 1; maxPred += 1; }

    const sxRes = v => scale(v, minPred, maxPred, m.left, w - m.right);
    const syRes = v => scale(v, resYMin, resYMax, h - m.bottom, m.top);

    svgResid.appendChild(el('line', { x1: m.left, y1: syRes(0), x2: w - m.right, y2: syRes(0), stroke: '#999', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }));
    fit.y_pred.forEach((pred, i) => {
      svgResid.appendChild(el('circle', { cx: sxRes(pred), cy: syRes(fit.residuals[i]), r: 5, fill: '#e67e22', stroke: '#b85c0f', 'stroke-width': 1.5 }));
    });

    let xEq = TRANSFORMS[xTf].eq[lang] || TRANSFORMS[xTf].eq['en'];
    if (xTf === 'none') xEq = 'x';
    
    let sign = fit.b0 >= 0 ? '+' : '-';
    divEq.innerHTML = `<div style="font-family:serif; font-size:20px;">ŷ = ${fit.b0.toFixed(3)} ${sign} ${Math.abs(fit.b1).toFixed(3)} · ${xEq}</div>
                       <div style="margin-top:10px; font-size:16px;">R² = ${fit.r2.toFixed(4)}</div>`;
  }

  function render() {
    drawPanel(document.getElementById('reexprSvgTop'), document.getElementById('reexprSvgResidTop'), document.getElementById('reexprEquTop'), 'top');
    drawPanel(document.getElementById('reexprSvgBot'), document.getElementById('reexprSvgResidBot'), document.getElementById('reexprEquBot'), 'bottom');
  }

  function handleCanvasClick(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) * 400 / rect.width;
    const py = (e.clientY - rect.top) * 300 / rect.height;
    const m = { left: 45, right: 15, top: 25, bottom: 35 };
    if (px < m.left || px > 400 - m.right || py < m.top || py > 300 - m.bottom) return;

    let xMin = 0, xMax = 10, yMin = 0, yMax = 10;
    let xData = points.map(p=>p.x), yData = points.map(p=>p.y);
    if (xData.length > 0) {
      xMin = Math.min(0, ...xData); xMax = Math.max(...xData) * 1.05;
      yMin = Math.min(0, ...yData); yMax = Math.max(...yData) * 1.05;
    }
    if (xMax === xMin) xMax += 10;
    if (yMax === yMin) yMax += 10;

    const xv = scale(px, m.left, 400 - m.right, xMin, xMax);
    const yv = scale(py, 300 - m.bottom, m.top, yMin, yMax);

    if (e.button === 0) {
      if (xv > 0 && yv > 0) { points.push({ x: xv, y: yv }); render(); }
    } else if (e.button === 2 && points.length > 0) {
      let minDist = Infinity, idx = -1;
      points.forEach((p, i) => {
        let d = Math.hypot(p.x - xv, p.y - yv);
        if (d < minDist) { minDist = d; idx = i; }
      });
      if (idx !== -1) { points.splice(idx, 1); render(); }
    }
  }

  function generatePoints() {
    const expr = document.getElementById('reexprFuncInput').value.trim();
    if (!expr) return;
    try {
      let safeExpr = expr.replace(/\^/g, '**').replace(/([0-9])([a-zA-Z(])/g, '$1*$2');
      const func = new Function('x', `
        const sin = Math.sin, cos = Math.cos, tan = Math.tan, 
              log = Math.log, exp = Math.exp, sqrt = Math.sqrt, abs = Math.abs;
        return ${safeExpr};
      `);
      points = [];
      for (let i = 0; i < 15; i++) {
        let xv = 0.5 + (10 - 0.5) * i / 14;
        let yv = func(xv);
        if (isFinite(yv) && yv > 0) points.push({ x: xv, y: yv });
      }
      showFit = true; render();
    } catch (err) { alert(t('reexpr_invalidFunc') + ": " + expr); }
  }

  // 监听切换工具、切换语言事件
  document.addEventListener('apstats:tool', (e) => {
    if (e.detail === 'reexpr') {
      if (!domInitialized) initDOM();
      if (typeof applyLang === 'function') applyLang();
      render();
    }
  });

  document.addEventListener('apstats:language', () => { 
    if (document.getElementById('reexprPage')) { 
      createButtons(); 
      if (typeof applyLang === 'function') applyLang();
      render(); 
    } 
  });

  // 启动时预先初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDOM);
  } else {
    initDOM();
  }

})();
