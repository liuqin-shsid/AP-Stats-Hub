/* Binomial Distribution (二项分布) */
(() => {
  Object.assign(translations.zh, {
    binomial_title: '二项分布',
    binomial_desc: '调整样本量 n 和成功概率 p，观察二项分布形态的变化。',
    binomial_n: '试验次数 (n)',
    binomial_p: '成功概率 (p)',
    binomial_pmf: '概率质量函数 (PMF)',
    binomial_stats: '统计指标',
    binomial_show_table: '显示概率分布表',
    binomial_hide_table: '隐藏概率分布表',
  });

  Object.assign(translations.en, {
    binomial_title: 'Binomial Distribution',
    binomial_desc: 'Adjust sample size (n) and probability of success (p) to see how the distribution changes.',
    binomial_n: 'Number of trials (n)',
    binomial_p: 'Probability of success (p)',
    binomial_pmf: 'Probability Mass Function (PMF)',
    binomial_stats: 'Statistics',
    binomial_show_table: 'Show probability table',
    binomial_hide_table: 'Hide probability table',
  });

  const state = { n: 20, p: 0.2, built: false, showTable: false };

  function combination(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 1; i <= k; i++) {
      result = result * (n - i + 1) / i;
    }
    return result;
  }

  function binomialPMF(n, k, p) {
    return combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  function buildUI() {
    const t = translations[lang];
    const page = document.getElementById('binomialPage');
    
    page.innerHTML = `
      <div class="page-heading"><div>
        <h1 data-i18n="binomial_title">${t.binomial_title}</h1>
        <p data-i18n="binomial_desc">${t.binomial_desc}</p>
      </div></div>
      
      <section class="controls" data-i18n-aria="controls_aria">
        <div style="display:flex; gap:24px; align-items:center; flex-wrap:wrap;">
          <!-- 试验次数 n -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            <span style="color:#42515e; font-size:13px; font-weight:600;" data-i18n="binomial_n">${t.binomial_n}</span>
            <input type="number" id="binomN" value="${state.n}" min="2" max="100" step="1" style="width:80px; height:34px; padding:0 8px; border:1px solid #c9d2da; border-radius:5px;">
          </div>

          <!-- 成功概率 p -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            <span style="color:#42515e; font-size:13px; font-weight:600;" data-i18n="binomial_p">${t.binomial_p}</span>
            <input type="number" id="binomP" value="${state.p}" min="0" max="1" step="0.01" style="width:80px; height:34px; padding:0 8px; border:1px solid #c9d2da; border-radius:5px;">
          </div>
        </div>
      </section>

      <div class="binomial-layout">
        <!-- 左侧：图表 -->
        <section class="chart-panel" style="margin-top:0; padding:10px;">
          <svg id="binomChart" viewBox="0 0 600 400" style="width:100%; height:auto;"></svg>
        </section>

        <!-- 右侧：信息面板 -->
        <section class="binomial-info-panel">
          <h3 data-i18n="binomial_pmf">${t.binomial_pmf}</h3>
          <div class="binomial-formula" id="binomFormula"></div>
          
          <h3 data-i18n="binomial_stats" style="margin-top:20px;">${t.binomial_stats}</h3>
          <div id="binomStats" style="font-size:16px; line-height:1.8; margin-bottom:20px;"></div>

          <!-- 表格区域 -->
          <div id="binomTableWrapper" style="display:block;">
            <button id="binomToggleBtn" class="secondary-button" style="margin-bottom:10px; width:100%;">${t.binomial_show_table}</button>
            <div class="table-scroll" id="binomTableScroll" style="display:none;">
              <table id="binomTable" style="width:100%; border-collapse:collapse; text-align:center; font-size:14px;"></table>
            </div>
          </div>
        </section>
      </div>
    `;

    // 绑定 n 输入事件
    document.getElementById('binomN').addEventListener('input', e => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) return;
      if (val < 2) val = 2;
      if (val > 100) val = 100;
      state.n = Math.floor(val);
      updateAll();
    });
    document.getElementById('binomN').addEventListener('change', e => {
      if (e.target.value === '' || isNaN(state.n)) {
        state.n = 20;
        e.target.value = state.n;
        updateAll();
      } else {
        e.target.value = state.n;
      }
    });

    // 绑定 p 输入事件
    document.getElementById('binomP').addEventListener('input', e => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) return;
      if (val < 0) val = 0;
      if (val > 1) val = 1;
      state.p = val;
      updateAll();
    });
    document.getElementById('binomP').addEventListener('change', e => {
      if (e.target.value === '' || isNaN(state.p)) {
        state.p = 0.2;
        e.target.value = state.p;
        updateAll();
      } else {
        e.target.value = state.p;
      }
    });

    // 表格展开/收起
    document.getElementById('binomToggleBtn').addEventListener('click', () => {
      state.showTable = !state.showTable;
      const tableScroll = document.getElementById('binomTableScroll');
      const btn = document.getElementById('binomToggleBtn');
      if (state.showTable) {
        tableScroll.style.display = 'block';
        btn.textContent = translations[lang].binomial_hide_table;
      } else {
        tableScroll.style.display = 'none';
        btn.textContent = translations[lang].binomial_show_table;
      }
    });

    updateAll();
    state.built = true;
  }

  function drawChart(probs) {
    const svg = document.getElementById('binomChart');
    const w = 600, h = 400;
    const m = { top: 30, right: 20, bottom: 40, left: 50 };
    const maxProb = Math.max(...probs);
    
    // 修复1：居中计算，同时让 k=0 不会被 Y 轴切掉
    const sx = k => m.left + ((k + 0.5) / (state.n + 1)) * (w - m.left - m.right);
    const sy = p => h - m.bottom - (p / maxProb) * (h - m.top - m.bottom);
    
    // 修复2：加上 0.5 像素，填满柱子之间的白缝
    const barWidth = (w - m.left - m.right) / (state.n + 1) + 0.5;

    let html = `<text x="${w/2}" y="20" text-anchor="middle" font-weight="bold">B(n=${state.n}, p=${state.p.toFixed(2)})</text>`;

    for (let i = 0; i <= 4; i++) {
      const pVal = (maxProb / 4) * i;
      const y = sy(pVal);
      html += `<line x1="${m.left}" y1="${y}" x2="${w - m.right}" y2="${y}" stroke="#eee"/>`;
      html += `<text x="${m.left - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="#666">${pVal.toFixed(3)}</text>`;
    }

    probs.forEach((p, k) => {
      const x = sx(k) - barWidth / 2;
      const y = sy(p);
      const height = h - m.bottom - y;
      
      if (p > 0.0001) {
        html += `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" fill="#7ea6c9" stroke="#333" stroke-width="0.5">
                   <title>P(X=${k}) = ${p.toFixed(5)}</title>
                 </rect>`;
      }
      
      const step = state.n > 30 ? Math.ceil(state.n / 15) : 1;
      if (k % step === 0 || k === state.n) {
        html += `<text x="${sx(k)}" y="${h - m.bottom + 15}" text-anchor="middle" font-size="12" fill="#333">${k}</text>`;
      }
    });

    html += `<line x1="${m.left}" y1="${h - m.bottom}" x2="${w - m.right}" y2="${h - m.bottom}" stroke="#333" stroke-width="1.5"/>`;
    html += `<text x="${w/2}" y="${h - 5}" text-anchor="middle" font-size="12" fill="#333">成功次数 k</text>`;

    const mean = state.n * state.p;
    const meanX = sx(mean);
    if (meanX >= m.left && meanX <= w - m.right) {
      html += `<line x1="${meanX}" y1="${m.top}" x2="${meanX}" y2="${h - m.bottom}" stroke="#c73932" stroke-width="1.5" stroke-dasharray="4 4"/>`;
      html += `<text x="${meanX + 5}" y="${m.top + 10}" fill="#c73932" font-size="12" font-weight="bold">均值 = ${mean.toFixed(2)}</text>`;
    }

    svg.innerHTML = html;
  }

  function updateAll() {
    const n = state.n;
    const p = state.p;
    const q = 1 - p;

    const probs = [];
    for (let k = 0; k <= n; k++) {
      probs.push(binomialPMF(n, k, p));
    }

    const nStr = n === 1 ? '' : n;
    document.getElementById('binomFormula').innerHTML = `
      P(X = k) = <sub>${nStr}</sub>C<sub>k</sub> &middot; (${p.toFixed(2)})<sup>k</sup> &middot; (1 - ${p.toFixed(2)})<sup>${n}-k</sup><br>
      <span style="font-size:14px; color:#666;">k = 0, 1, ..., ${n}</span>
    `;

    const mean = n * p;
    const sd = Math.sqrt(n * p * q);
    document.getElementById('binomStats').innerHTML = `
      E(X) = np = <strong>${mean.toFixed(2)}</strong><br>
      SD(X) = &radic;(npq) = <strong>${sd.toFixed(4)}</strong>
    `;

    const table = document.getElementById('binomTable');
    let tr = `<tr style="background:#eee;"><th>k</th><th>P(X=k)</th></tr>`;
    probs.forEach((prob, k) => {
      tr += `<tr><td style="padding:4px; border-bottom:1px solid #eee;">${k}</td><td style="padding:4px; border-bottom:1px solid #eee;">${prob.toFixed(6)}</td></tr>`;
    });
    table.innerHTML = tr;

    drawChart(probs);
  }

  function tryBuild() {
    if (document.getElementById('binomialPage')) {
      if (!state.built) buildUI();
      else updateAll();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryBuild);
  } else {
    tryBuild();
  }

  document.addEventListener('apstats:tool', e => {
    if (e.detail === 'binomial') {
      if (!state.built) buildUI();
      else updateAll();
    }
  });

  document.addEventListener('apstats:language', () => {
    if (state.built) buildUI();
  });
})();
