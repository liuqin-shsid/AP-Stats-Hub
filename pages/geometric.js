/* pages/geometric.js */
(function() {
  // 核心渲染函数
  window.renderGeometricPage = function(container) {
    // 如果已经渲染过就不重复渲染（防止事件重复绑定）
    if (container.querySelector('#geoP')) return;

    // 支持多语言的 HTML 结构
    const html = `
      <div class="page-heading">
        <div>
          <h1 data-i18n="geometric_title">Geometric Distribution</h1>
          <p data-i18n="geometric_desc">模拟首次成功所需的试验次数。调整概率 p，观察概率质量函数 (PMF) 和累积分布函数 (CDF)。</p>
        </div>
      </div>

      <section class="controls">
        <label>
          <span data-i18n="geo_p_label">成功概率 p (0 < p ≤ 1)</span>
          <input type="number" id="geoP" value="0.5" min="0.01" max="1" step="0.01" style="width:100px; padding:6px; border:1px solid #c9d2da; border-radius:5px;">
        </label>
        <button id="geoGenerate" class="reset" type="button" data-i18n="geo_generate">生成 / Generate</button>
        <div id="geoStats" class="hint" style="margin-left: auto; font-size: 15px; font-weight: 600; color: var(--navy);">
          E(X) = — | SD(X) = —
        </div>
      </section>

      <div class="binomial-layout" style="grid-template-columns: 1.5fr 1fr; margin-top: 20px;">
        <!-- 左侧：直方图 -->
        <section class="chart-panel" style="padding: 20px;">
          <h2 style="margin-bottom: 20px;" data-i18n="geo_hist_title">Geometric Distribution Histogram</h2>
          <div id="geoChartWrap" style="position: relative; width: 100%; aspect-ratio: 4/3;">
            <svg id="geoChart" viewBox="0 0 800 600" style="width: 100%; height: 100%;"></svg>
          </div>
        </section>

        <!-- 右侧：概率模型表格 -->
        <section class="binomial-info-panel" style="padding: 15px;">
          <h3 style="margin-top: 0; margin-bottom: 15px;" data-i18n="geo_model_title">Probability Model</h3>
          <div class="table-scroll" style="max-height: 500px; overflow-y: auto; border: 1px solid var(--line); border-radius: 6px;">
            <table class="freq-table" style="width: 100%; text-align: center; margin: 0;">
              <thead style="position: sticky; top: 0; z-index: 10;">
                <tr>
                  <th style="text-align: center;" data-i18n="geo_th_k">k (次数)</th>
                  <th style="text-align: center;">P(X = k)</th>
                  <th style="text-align: center;">P(X ≤ k)</th>
                </tr>
              </thead>
              <tbody id="geoTableBody">
                <!-- 数据由 JS 生成 -->
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;

    container.innerHTML = html;
    
    const pInput = document.getElementById('geoP');
    const btn = document.getElementById('geoGenerate');
    const statsDiv = document.getElementById('geoStats');
    const tableBody = document.getElementById('geoTableBody');
    const svg = document.getElementById('geoChart');

    // 尝试应用当前的 i18n 翻译
    if (window.applyTranslations) {
      window.applyTranslations(container);
    }

    function generate() {
      let p = parseFloat(pInput.value);
      if (isNaN(p) || p <= 0 || p > 1) {
        alert("请输入 0 < p <= 1 之间的数字 / Please enter a number between 0 and 1");
        return;
      }

      // 1. 计算统计信息
      const expected = 1 / p;
      const variance = (1 - p) / (p * p);
      const stdDev = Math.sqrt(variance);
      statsDiv.innerHTML = `E(X) = ${expected.toFixed(4)} &nbsp;&nbsp;|&nbsp;&nbsp; SD(X) = ${stdDev.toFixed(4)}`;

      // 2. 动态计算直方图的最大截断值 k
      let maxPlotK = 1;
      let cum = 0;
      const thresholdProb = 0.002;
      for (let k = 1; k <= 200; k++) {
        const prob = Math.pow(1 - p, k - 1) * p;
        cum += prob;
        maxPlotK = k;
        if (prob < thresholdProb || cum >= 0.998) break;
      }
      maxPlotK += 1; // 尾部留一格空白

      // 3. 更新表格 (固定显示前 20 行，末尾加 ...)
      let htmlRows = '';
      cum = 0;
      for (let k = 1; k <= 20; k++) {
        const prob = Math.pow(1 - p, k - 1) * p;
        cum += prob;
        const bgColor = k % 2 === 0 ? '#fff' : '#f9f9f9';
        htmlRows += `
          <tr style="background-color: ${bgColor};">
            <td>${k}</td>
            <td>${prob.toFixed(6)}</td>
            <td>${cum.toFixed(6)}</td>
          </tr>
        `;
      }
      htmlRows += `
        <tr style="background-color: #f9f9f9;">
          <td>...</td>
          <td>...</td>
          <td>...</td>
        </tr>
      `;
      tableBody.innerHTML = htmlRows;

      // 4. 绘制 SVG 直方图
      svg.innerHTML = ''; 
      
      const margin = { top: 40, right: 20, bottom: 60, left: 60 };
      const width = 800 - margin.left - margin.right;
      const height = 600 - margin.top - margin.bottom;

      let maxProb = 0;
      for (let k = 1; k <= maxPlotK; k++) {
        const prob = Math.pow(1 - p, k - 1) * p;
        if (prob > maxProb) maxProb = prob;
      }
      const yMax = maxProb * 1.1; 

      const xScale = k => margin.left + ((k - 0.5) / maxPlotK) * width;
      const yScale = prob => margin.top + height - (prob / yMax) * height;

      let svgHtml = `<g>`;
      // Y轴
      svgHtml += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + height}" class="axis" />`;
      // X轴
      svgHtml += `<line x1="${margin.left}" y1="${margin.top + height}" x2="${margin.left + width}" y2="${margin.top + height}" class="axis" />`;

      // Y轴刻度和网格线
      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++) {
        const val = (yMax / yTicks) * i;
        const y = yScale(val);
        svgHtml += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + width}" y2="${y}" class="grid" />`;
        svgHtml += `<text x="${margin.left - 10}" y="${y + 5}" text-anchor="end" class="tick">${val.toFixed(3)}</text>`;
      }

      // X轴刻度
      let step = maxPlotK <= 15 ? 1 : Math.ceil(maxPlotK / 10);
      for (let k = 1; k <= maxPlotK; k += step) {
        const x = margin.left + ((k - 0.5) / maxPlotK) * width;
        svgHtml += `<text x="${x}" y="${margin.top + height + 20}" text-anchor="middle" class="tick">${k}</text>`;
      }
      
      // X轴、Y轴标签
      svgHtml += `<text x="${margin.left + width / 2}" y="${margin.top + height + 50}" text-anchor="middle" class="axis-label">Number of Trials (k)</text>`;
      svgHtml += `<text x="20" y="${margin.top + height / 2}" text-anchor="middle" transform="rotate(-90 20 ${margin.top + height / 2})" class="axis-label">P(X = k)</text>`;

      // 期望值虚线
      const expX = xScale(expected);
      svgHtml += `<line x1="${expX}" y1="${margin.top}" x2="${expX}" y2="${margin.top + height}" stroke="#e74c3c" stroke-width="2.5" stroke-dasharray="6 4" />`;

      // 画柱子
      const barWidth = width / maxPlotK;
      for (let k = 1; k <= maxPlotK; k++) {
        const prob = Math.pow(1 - p, k - 1) * p;
        const x = margin.left + (k - 1) * barWidth;
        const y = yScale(prob);
        const h = margin.top + height - y;
        
        // 使用主题色，紧密相连
        svgHtml += `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="#2878b8" stroke="#004f7d" stroke-width="1" />`;
      }

      svgHtml += `</g>`;
      svg.innerHTML = svgHtml;
    }

    btn.addEventListener('click', generate);
    pInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') generate();
    });

    // 首次渲染
    generate();
  };

  // ================== 路由兼容机制 ==================
  // 自动检测并渲染（应对不同项目的路由架构）
  function checkAndRender() {
    const geoContainer = document.getElementById('geometricPage');
    // 如果容器存在、可见（没有 hidden 属性），且还没渲染过
    if (geoContainer && !geoContainer.hasAttribute('hidden') && !geoContainer.querySelector('#geoP')) {
      window.renderGeometricPage(geoContainer);
    }
  }

  // 监听路由哈希变化
  window.addEventListener('hashchange', checkAndRender);
  // 监听全局点击，延迟检查（给侧边栏路由逻辑留出切换 DOM 的时间）
  document.addEventListener('click', () => setTimeout(checkAndRender, 50));
  // 初始化时检查一次
  document.addEventListener('DOMContentLoaded', checkAndRender);

  // 如果你的框架有暴露特定的路由回调，也可以在这里手动挂载：
  window.addEventListener('pageChanged', checkAndRender);
})();
