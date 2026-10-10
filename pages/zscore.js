/* z-score 标准化 —— 接在线性回归教学分组下（group: 'linreg'）。
   数据复用 data/regression.js 的 linearRegression 部分，与"相关关系探究"等页面同源。
   页面只做两件事：
     1) 选工作表 + 选变量
     2) 展示原始值与对应的 z = (x − x̄) / s （样本标准差，分母 n − 1） */
(() => {
  Object.assign(translations.zh, {
    zscore_title: 'z-score 标准化',
    zscore_desc: '对选定变量做标准化 z = (x − x̄) / s，比较标准化前后每个数据点的取值。',
    zscore_sheet: '选择案例',
    zscore_var: '选择变量',
    zscore_raw: '原始数据',
    zscore_std: '标准化数据 (z)',
    zscore_mean: '均值 x̄',
    zscore_sd: '样本标准差 s',
    zscore_n: '个数 n',
    zscore_need: '至少需要 2 个数值才能计算标准差。',
    zscore_loading: '正在读取数据…',
    zscore_error: '无法读取数据 data/regression.js。请执行 npm run build:data 重新生成。',
  });
  Object.assign(translations.en, {
    zscore_title: 'z-score Standardization',
    zscore_desc: 'Standardize a variable as z = (x − x̄) / s and compare each value before and after.',
    zscore_sheet: 'Select dataset',
    zscore_var: 'Select variable',
    zscore_raw: 'Raw data',
    zscore_std: 'Standardized data (z)',
    zscore_mean: 'Mean x̄',
    zscore_sd: 'Sample SD s',
    zscore_n: 'Count n',
    zscore_need: 'At least 2 numeric values are needed for the standard deviation.',
    zscore_loading: 'Loading data…',
    zscore_error: 'Could not read data/regression.js. Run "npm run build:data" to regenerate it.',
  });

  const state = { sheet: null, col: null };

  function book() {
    return (window.APSTATS_DATA || {}).regression?.linearRegression || null;
  }

  function currentRows() {
    const b = book();
    if (!b || !state.sheet) return [];
    return b.sheets[state.sheet] || [];
  }

  function load() {
    const rows = currentRows();
    state.col = $('zscoreVar').value;
    const values = rows
      .map(r => Number(r[state.col]))
      .filter(Number.isFinite);
    render(values);
  }

  function render(values) {
    const t = translations[lang];
    const n = values.length;
    if (n < 2) {
      $('zscoreStats').innerHTML =
        `<div><span>${escapeHtml(t.zscore_n)}</span><strong>${n}</strong></div>`;
      $('zscoreRaw').innerHTML =
        `<section class="chart-panel"><h2>${escapeHtml(t.zscore_raw)}</h2>` +
        `<p class="panel-note">${escapeHtml(t.zscore_need)}</p></section>`;
      $('zscoreStd').innerHTML = '';
      return;
    }

    const mean = values.reduce((s, v) => s + v, 0) / n;
    const sd = Math.sqrt(
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
    );
    const z = values.map(v => (v - mean) / sd);
    const fmt = v => Number(v.toPrecision(6)).toString();

    $('zscoreStats').innerHTML =
      `<div><span>${escapeHtml(t.zscore_n)}</span><strong>${n}</strong></div>` +
      `<div><span>${escapeHtml(t.zscore_mean)}</span><strong>${fmt(mean)}</strong></div>` +
      `<div><span>${escapeHtml(t.zscore_sd)}</span><strong>${fmt(sd)}</strong></div>`;

    const table = (title, arr) =>
      `<section class="chart-panel"><h2>${escapeHtml(title)}</h2>` +
      `<div class="freq-table-wrap"><table class="freq-table">` +
      `<thead><tr><th>#</th><th>${escapeHtml(title)}</th></tr></thead><tbody>` +
      arr.map((v, i) =>
        `<tr><td>${i + 1}</td><td>${fmt(v)}</td></tr>`
      ).join('') +
      `</tbody></table></div></section>`;

    $('zscoreRaw').innerHTML = table(t.zscore_raw, values);
    $('zscoreStd').innerHTML = table(t.zscore_std, z);
  }

  function buildUI() {
    const t = translations[lang];
    $('zscorePage').innerHTML = `
      <div class="page-heading"><div>
        <h1 data-i18n="zscore_title">${escapeHtml(t.zscore_title)}</h1>
        <p data-i18n="zscore_desc">${escapeHtml(t.zscore_desc)}</p>
      </div></div>
      <section class="controls" data-i18n-aria="controls_aria">
        <label><span data-i18n="zscore_sheet">${escapeHtml(t.zscore_sheet)}</span>
          <select id="zscoreSheet"></select></label>
        <label><span data-i18n="zscore_var">${escapeHtml(t.zscore_var)}</span>
          <select id="zscoreVar"></select></label>
      </section>
      <section id="zscoreStats" class="quant-stats" aria-live="polite"></section>
      <div class="chart-pair">
        <div id="zscoreRaw"></div>
        <div id="zscoreStd"></div>
      </div>`;

    $('zscoreSheet').addEventListener('change', () => {
      state.sheet = $('zscoreSheet').value;
      syncVars();
      load();
    });
    $('zscoreVar').addEventListener('change', load);

    syncVars();
    load();
  }

  function syncVars() {
    const b = book();
    if (!b) return;

    // 工作表下拉
    const sheets = b.sheetNames;
    if (!state.sheet || !sheets.includes(state.sheet)) state.sheet = sheets[0];
    setOptions($('zscoreSheet'), sheets, state.sheet, displaySheetName);

    // 变量下拉：当前工作表里至少有一个数值的列
    const rows = currentRows();
    const cols = numericColumns(rows);
    const prev = state.col;
    if (!prev || !cols.includes(prev)) state.col = cols[0];
    setOptions($('zscoreVar'), cols, state.col, displayVariableName);
  }

  /* ---------- 启动 ---------- */
  if (!book()) {
    // 数据加载失败：把错误信息塞进页面，不抛异常
    $('zscorePage').innerHTML =
      `<p class="hint danger">${escapeHtml(translations[lang].zscore_error)}</p>`;
    // 仍然监听语言切换，让错误提示也能切中英文
    document.addEventListener('apstats:language', () => {
      $('zscorePage').innerHTML =
        `<p class="hint danger">${escapeHtml(translations[lang].zscore_error)}</p>`;
    });
    return;
  }

  buildUI();

  document.addEventListener('apstats:tool', e => {
    if (e.detail === 'zscore') {
      // 回到本页时重刷一次下拉文字（语言可能切过）与表格
      syncVars();
      load();
    }
  });
  document.addEventListener('apstats:language', () => {
    syncVars();
    load();
  });
})();
