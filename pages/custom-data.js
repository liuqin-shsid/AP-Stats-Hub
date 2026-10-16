/* 自定义数据 —— 用自己的数据画教材 Ch3–5 的那些图。
   两种输入方式：选文件（Excel / CSV）或手动输入（两列，支持从 Excel 粘贴）。
   绘图全部走 core/charts.js。

   存储：
     当前数据  sessionStorage —— 刷新还在，关掉标签页就没了，只有一份，传新的覆盖旧的
     保存的数据 localStorage  —— 长期留着，可以多份，随时载入 */
(() => {
  const SKEY = 'apstats-custom-work';      // 当前数据（sessionStorage）
  const LKEY = 'apstats-custom-saved';     // 已保存的数据（localStorage）
  const SEEDED = 'apstats-custom-seeded';  // 示例数据是否已预置过（只置一次）
  const MAX_ROWS = 5000;
  const MAX_SAVE_BYTES = 1.5 * 1024 * 1024;

  Object.assign(translations.zh, {
    custom_title: '自定义数据',
    custom_desc: '用你自己的数据画图。传一个 Excel / CSV，或者直接在下面手敲、从 Excel 粘贴。数据只在你这台电脑上，不会上传到任何地方。',
    custom_guide_title: '选几个变量，就出哪些图',
    custom_guide: [
      ['1 个分类变量', '频数表 ＋ 条形图 ＋ 饼图'],
      ['2 个分类变量', '列联表（计数／行%／列%／总%）＋ 并排条形图 ＋ 分段条形图'],
      ['1 个定量变量', '直方图（组距可调）＋ 点图 ＋ 肩形图 ＋ 箱线图 ＋ 茎叶图'],
      ['1 个定量 ＋ 1 个分类', '并排箱线图 ＋ 同刻度直方图 ＋ 背靠背茎叶图'],
      ['2 个定量变量', '散点图 ＋ 最小二乘回归直线（给出方程、r 与 r²）'],
      ['3 个及以上变量', '并排箱线图，把几个变量放在同一条数轴上比'],
      ['数据有 3 列以上时', '可以只勾其中几个：勾 1～2 个就按上面 1～2 个变量的规则出图'],
    ],
    custom_use: '参与作图的变量',
    custom_use_hint: '勾 1～2 个就按 1～2 个变量的规则出图，勾 3 个及以上画并排箱线图。',
    custom_use_none: '至少勾一个变量。',
    custom_swap: '交换 x / y 轴',
    custom_scatter: '散点图与回归直线',
    custom_scatter_note: '红线是最小二乘回归直线。x 轴（解释变量）在前、y 轴（响应变量）在后，换一换用上面的「交换 x / y 轴」。',
    custom_scatter_need: '画散点图至少要 2 个成对的数据点，而且两个变量都不能是常数。',
    custom_eq: '回归方程',
    custom_r: '相关系数 r',
    custom_r2: '判定系数 r²',
    custom_slope: '斜率 b₁',
    custom_intercept: '截距 b₀',
    custom_npairs: '成对个数 n',
    custom_src_file: '选文件', custom_src_manual: '手动输入',
    custom_pick: '选择文件…', custom_sheet: '工作表',
    custom_file_hint: '支持 .xlsx / .xls / .csv。默认第一行是表头。',
    custom_manual_hint: '第一列必填，第二列可留空。点任意数据格，从 Excel 复制的内容可以直接粘贴进来，会自动铺开。',
    custom_type: '类型', custom_varname: '变量名', custom_data: '数据',
    custom_quant: '定量', custom_cat: '分类',
    custom_col1: '第一列', custom_col2: '第二列（可选）',
    custom_apply: '应用', custom_clear: '清空',
    custom_addcol: '＋ 加一列', custom_delcol: '删除这一列',
    custom_coln: '第 {n} 列',
    custom_multi: '多列对比',
    custom_multi_note: '选了 3 列或更多，这时只画并排箱线图 —— 多个变量放在同一条数轴上比，中心、离散程度和离群点一眼可比。',
    custom_multi_skip: '已跳过 {n} 个非定量的列（并排箱线图只能比定量数据）。',
    custom_multi_need: '至少需要 2 个定量的列才能做并排箱线图。',
    custom_report: '解析结果', custom_rows: '行', custom_cols: '列',
    custom_dropped: '丢弃 {n} 行（有空值或非数值）',
    custom_vars: '变量设置', custom_preview: '取值预览',
    custom_show1: '展示变量一', custom_show2: '展示变量二', custom_none: '—（只看一个）',
    custom_save: '保存这组数据', custom_saved_list: '已保存的数据',
    custom_load: '载入', custom_delete: '删除',
    custom_save_prompt: '给这组数据起个名字：',
    custom_save_ok: '已保存：{n}', custom_save_dup: '已有同名数据，要覆盖吗？',
    custom_save_big: '数据太大，存不下（浏览器约 5MB 上限）。建议减少行数后再保存。',
    custom_no_data: '还没有数据。上面选个文件，或者切到「手动输入」自己敲。',
    custom_empty_col: '第一列还没填数据。',
    custom_too_many: '最多 {n} 行，多出来的已忽略。',
    custom_footnote: '已去掉表格末尾 {n} 行（看起来是脚注，只有一格有内容）',
    custom_binwidth: '组距', custom_bins: '组数',
    custom_freq: '频数', custom_relfreq: '相对频数 (%)', custom_pct_axis: '百分比 (%)',
    custom_count: '计数', custom_row_pct: '行百分比', custom_col_pct: '列百分比', custom_tot_pct: '总百分比',
    custom_basis: '数值显示', custom_category: '类别', custom_total: '合计',
    custom_n: '个数 n', custom_mean: '均值 x̄', custom_median: '中位数 M', custom_sd: '样本标准差 s',
    custom_min: '最小值', custom_q1: 'Q₁', custom_q3: 'Q₃', custom_max: '最大值',
    custom_range: '全距', custom_iqr: '四分位距 IQR',
    chart_bar: '条形图', chart_pie: '饼图', chart_grouped: '并排条形图', chart_segmented: '分段条形图',
    chart_hist: '直方图', chart_dot: '点图', chart_stem: '茎叶图', chart_ogive: '累积频率曲线（肩形图）',
    chart_box: '箱线图', chart_boxes: '并排箱线图', chart_b2b: '背靠背茎叶图',
    custom_stem_read: '读法：{k} | {d} 表示 {v}',
    custom_stem_crowded: '提示：某一行的叶太多，形状已经读不出来了，这种规模改看直方图更合适。',
    custom_stem_neg: '（已略去 {n} 个负值，茎叶图无法表示负数）',
    custom_b2b_need2: '背靠背茎叶图需要分组变量恰好有 2 个类别，当前有 {n} 个。',
    custom_stem_label: '茎',
    custom_clear_all: '清除当前数据',

    custom_sample_name: '各季度航班延误时长（示例）',
    custom_sample_note: '虚构的示例数据，用来演示多列并排箱线图：某机场四个季度各抽查 15 个航班的延误小时数。',
    custom_qtr1: '第一季度', custom_qtr2: '第二季度', custom_qtr3: '第三季度', custom_qtr4: '第四季度',
    custom_pushed: '已填入上方表格，可以直接改',
    custom_too_big_grid: '这组数据有 {n} 行，太多了没填进上方表格（表格最多 {m} 行）。图表照常显示。',
  });
  Object.assign(translations.en, {
    custom_title: 'Your Own Data',
    custom_desc: 'Make the Ch3–5 displays from your own data. Upload an Excel/CSV file, or type or paste values below. Everything stays on this computer — nothing is uploaded.',
    custom_guide_title: 'What you get for each choice of variables',
    custom_guide: [
      ['1 categorical', 'Frequency table + bar chart + pie chart'],
      ['2 categorical', 'Contingency table (counts / row% / column% / table%) + side-by-side bar + segmented bar'],
      ['1 quantitative', 'Histogram (adjustable bins) + dotplot + ogive + boxplot + stem-and-leaf'],
      ['1 quantitative + 1 categorical', 'Side-by-side boxplots + histograms on one scale + back-to-back stem-and-leaf'],
      ['2 quantitative', 'Scatterplot + least-squares regression line (equation, r and r²)'],
      ['3 or more variables', 'Side-by-side boxplots — several variables on one axis'],
      ['When the data has 3+ columns', 'Tick just the ones you want: tick 1 or 2 and the rules above apply'],
    ],
    custom_use: 'Variables to plot',
    custom_use_hint: 'Tick 1 or 2 and the one/two-variable rules apply; tick 3 or more for side-by-side boxplots.',
    custom_use_none: 'Tick at least one variable.',
    custom_swap: 'Swap x / y',
    custom_scatter: 'Scatterplot with regression line',
    custom_scatter_note: 'The red line is the least-squares regression line. The first variable is x (explanatory), the second is y (response) — use “Swap x / y” above to switch them.',
    custom_scatter_need: 'A scatterplot needs at least 2 complete pairs, and neither variable can be constant.',
    custom_eq: 'Equation',
    custom_r: 'Correlation r',
    custom_r2: 'r²',
    custom_slope: 'Slope b₁',
    custom_intercept: 'Intercept b₀',
    custom_npairs: 'Pairs n',
    custom_src_file: 'Choose a file', custom_src_manual: 'Type or paste',
    custom_pick: 'Choose file…', custom_sheet: 'Sheet',
    custom_file_hint: 'Accepts .xlsx / .xls / .csv. The first row is treated as the header.',
    custom_manual_hint: 'The first column is required; the second is optional. Click any data cell and paste straight from Excel — it fills out automatically.',
    custom_type: 'Type', custom_varname: 'Variable name', custom_data: 'Data',
    custom_quant: 'Quantitative', custom_cat: 'Categorical',
    custom_col1: 'Column 1', custom_col2: 'Column 2 (optional)',
    custom_apply: 'Apply', custom_clear: 'Clear',
    custom_addcol: '+ Add column', custom_delcol: 'Remove this column',
    custom_coln: 'Column {n}',
    custom_multi: 'Comparing several columns',
    custom_multi_note: 'With 3 or more columns the page draws side-by-side boxplots only — putting the variables on one axis makes centers, spreads and outliers directly comparable.',
    custom_multi_skip: '{n} non-quantitative column(s) skipped (side-by-side boxplots need quantitative data).',
    custom_multi_need: 'At least 2 quantitative columns are needed for side-by-side boxplots.',
    custom_report: 'Parsed', custom_rows: 'rows', custom_cols: 'columns',
    custom_dropped: '{n} row(s) dropped (blank or non-numeric)',
    custom_vars: 'Variables', custom_preview: 'Sample values',
    custom_show1: 'Variable 1', custom_show2: 'Variable 2', custom_none: '— (one only)',
    custom_save: 'Save this dataset', custom_saved_list: 'Saved datasets',
    custom_load: 'Load', custom_delete: 'Delete',
    custom_save_prompt: 'Name this dataset:',
    custom_save_ok: 'Saved: {n}', custom_save_dup: 'A dataset with that name exists. Overwrite?',
    custom_save_big: 'Too large to save (browsers allow about 5MB). Try fewer rows.',
    custom_no_data: 'No data yet. Choose a file above, or switch to "Type or paste".',
    custom_empty_col: 'Column 1 is still empty.',
    custom_too_many: 'Only the first {n} rows are kept.',
    custom_footnote: 'Removed {n} trailing row(s) that look like a footnote (only one cell filled)',
    custom_binwidth: 'Bin width', custom_bins: 'Bins',
    custom_freq: 'Count', custom_relfreq: 'Relative frequency (%)', custom_pct_axis: 'Percent (%)',
    custom_count: 'Counts', custom_row_pct: 'Row %', custom_col_pct: 'Column %', custom_tot_pct: 'Table %',
    custom_basis: 'Show as', custom_category: 'Category', custom_total: 'Total',
    custom_n: 'Count n', custom_mean: 'Mean x̄', custom_median: 'Median M', custom_sd: 'Sample SD s',
    custom_min: 'Min', custom_q1: 'Q₁', custom_q3: 'Q₃', custom_max: 'Max',
    custom_range: 'Range', custom_iqr: 'IQR',
    chart_bar: 'Bar chart', chart_pie: 'Pie chart', chart_grouped: 'Side-by-side bar', chart_segmented: 'Segmented bar',
    chart_hist: 'Histogram', chart_dot: 'Dotplot', chart_stem: 'Stem-and-leaf', chart_ogive: 'Ogive (cumulative relative frequency)',
    chart_box: 'Boxplot', chart_boxes: 'Side-by-side boxplots', chart_b2b: 'Back-to-back stem-and-leaf',
    custom_stem_read: 'Read as: {k} | {d} means {v}',
    custom_stem_crowded: 'Note: one line carries too many leaves to read the shape — use the histogram at this size.',
    custom_stem_neg: '({n} negative value(s) omitted — stem-and-leaf cannot show them)',
    custom_b2b_need2: 'A back-to-back stem-and-leaf needs exactly 2 groups; this variable has {n}.',
    custom_stem_label: 'Stem',
    custom_clear_all: 'Clear current data',

    custom_sample_name: 'Flight delay hours by quarter (sample)',
    custom_sample_note: 'Made-up sample data for trying out side-by-side boxplots: delay in hours for 15 sampled flights in each quarter at one airport.',
    custom_qtr1: 'Q1', custom_qtr2: 'Q2', custom_qtr3: 'Q3', custom_qtr4: 'Q4',
    custom_pushed: 'Loaded into the table above — edit it freely',
    custom_too_big_grid: 'This dataset has {n} rows, too many for the table above (limit {m}). The charts still work.',
  });

  /* work = { name, columns:[{name, type:'quant'|'cat', values:[]}], n } */
  let work = null;
  let state = { src: 'file', v1: 0, v2: -1, sel: [], basis: 'count', rel: false, binW: null, sheetNames: [], book: null };

  const T = () => translations[lang];
  const col = i => work.columns[i];
  const twoVar = () => state.v2 >= 0 && state.v2 !== state.v1;
  const typeOf = i => col(i).type;

  /* ---------- 解析 ---------- */
  const isNum = v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));

  /* 自动判断类型：非数字一定是分类；数字但取值很少（如 1/2/3 的等级编码）也按分类。
     无论怎么判，界面上都有下拉让你改 —— 这类判断不可能全对。 */
  function guessType(values) {
    const nonEmpty = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    if (!nonEmpty.length) return 'cat';
    if (!nonEmpty.every(isNum)) return 'cat';
    return new Set(nonEmpty.map(Number)).size > 6 ? 'quant' : 'cat';
  }

  /* Excel 表格末尾常常跟着一两行脚注（「注：数据来源…」），它只占第一格。
     不清掉的话，选那一列做分类变量时脚注会变成一个假类别。
     只从末尾往回清，且只清「非空单元格不超过 1 个」的行，避免误伤正常数据。 */
  function trimFootnotes(rows, ncol) {
    if (ncol < 2) return { rows, trimmed: 0 };
    let end = rows.length;
    while (end > 0) {
      const filled = rows[end - 1].filter(v => v !== null && v !== undefined && String(v).trim() !== '').length;
      if (filled > 1) break;
      end--;
    }
    return { rows: rows.slice(0, end), trimmed: rows.length - end };
  }

  function fromRows(name, header, rows) {
    const cut = trimFootnotes(rows, header.length);
    const trimmed = cut.rows.slice(0, MAX_ROWS);
    const columns = header.map((h, j) => {
      const values = trimmed.map(r => r[j]);
      return { name: String(h ?? `列${j + 1}`).trim() || `列${j + 1}`, type: guessType(values), values };
    }).filter(c => c.values.some(v => v !== null && v !== undefined && String(v).trim() !== ''));
    return { name, columns, n: trimmed.length, truncated: cut.rows.length > MAX_ROWS, footnotes: cut.trimmed };
  }

  function readFile(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const book = XLSX.read(new Uint8Array(fr.result), { type: 'array' });
        state.book = book;
        state.sheetNames = book.SheetNames;
        loadSheet(file.name.replace(/\.[^.]+$/, ''), book.SheetNames[0]);
      } catch (e) {
        alert('读取失败：' + e.message);
      }
    };
    fr.onerror = () => alert('读取失败：' + fr.error);
    fr.readAsArrayBuffer(file);
  }
  function loadSheet(baseName, sheetName) {
    const aoa = XLSX.utils.sheet_to_json(state.book.Sheets[sheetName], { header: 1, defval: null, blankrows: false });
    if (!aoa.length) { alert('这张工作表是空的。'); return; }
    setWork(fromRows(baseName, aoa[0], aoa.slice(1)), sheetName);
  }

  function setWork(w, sheetName) {
    if (!w.columns.length) { alert(T().custom_empty_col); return; }
    work = w;
    work.pushedToGrid = pushToGrid(w);            // 填回表格，载入后还能接着改
    state.v1 = 0; state.v2 = -1; state.binW = null; state.basis = 'count'; state.rel = false;
    state.sel = w.columns.map((_, i) => i);      // 3 列以上默认全勾，与改动前的行为一致
    state.sheet = sheetName || '';
    persistWork();
    render();
  }

  /* 把一组数据填回上方的手动输入表格，这样载入之后还能接着改。
     行数太多就不填 —— 几百行会生成上千个输入框，页面会卡。 */
  const GRID_PUSH_MAX = 300;
  function pushToGrid(w) {
    if (w.n > GRID_PUSH_MAX) return false;
    gridCols = Math.min(Math.max(2, w.columns.length), MAX_COLS);
    buildGrid(Math.max(GRID_ROWS, w.n + 2));
    const names = $('customGrid').querySelectorAll('.grid-name');
    const types = $('customGrid').querySelectorAll('.grid-type');
    w.columns.slice(0, gridCols).forEach((c, j) => {
      if (names[j]) names[j].value = c.name;
      if (types[j]) types[j].value = c.type;
      c.values.forEach((v, i) => {
        const cell = $('customGrid').querySelector(`.grid-cell[data-i="${i}"][data-j="${j}"]`);
        if (cell) cell.value = v === null || v === undefined ? '' : String(v);
      });
    });
    return true;
  }

  /* ---------- 示例数据 ---------- */
  /* 虚构数据，只用于演示多列并排箱线图。冬夏两季延误更久也更分散，
     每季都右偏并带少数长尾 —— 与真实航班延误的形状一致。 */
  const SAMPLE_FLIGHT = [
    [0.3, 0.5, 0.8, 1.2, 0.4, 2.1, 0.6, 1.5, 0.9, 3.4, 0.7, 1.1, 0.5, 2.8, 1.3],
    [0.2, 0.4, 0.3, 0.7, 0.5, 0.9, 0.3, 1.1, 0.6, 0.4, 0.8, 0.5, 1.4, 0.3, 0.6],
    [0.4, 1.0, 0.7, 2.3, 1.6, 0.9, 3.1, 1.2, 0.6, 4.5, 1.8, 0.8, 1.4, 2.0, 1.1],
    [0.3, 0.6, 1.0, 0.5, 1.7, 0.8, 0.4, 2.2, 0.9, 0.7, 1.3, 0.6, 1.9, 0.5, 1.0],
  ];
  function sampleData() {
    const t = T();
    const names = [t.custom_qtr1, t.custom_qtr2, t.custom_qtr3, t.custom_qtr4];
    return {
      name: t.custom_sample_name,
      note: t.custom_sample_note,
      columns: SAMPLE_FLIGHT.map((v, j) => ({ name: names[j], type: 'quant', values: v.map(x => x.toFixed(1)) })),
      n: SAMPLE_FLIGHT[0].length, truncated: false, footnotes: 0,
    };
  }
  /* 首次打开时把示例数据放进「已保存的数据」，之后就当成普通的一条，
     可以载入、改名、删除。删掉之后不会再自动冒出来 —— 只预置这一次。 */
  function seedSample() {
    try {
      if (localStorage.getItem(SEEDED)) return;
      const list = savedList();
      const d = sampleData();
      if (!list.some(x => x.name === d.name))
        list.push({ name: d.name, at: new Date().toISOString().slice(0, 10), data: d });
      localStorage.setItem(LKEY, JSON.stringify(list));
      localStorage.setItem(SEEDED, '1');
    } catch { /* 存不下就算了，不影响其它功能 */ }
  }

  /* ---------- 存储 ---------- */
  function persistWork() {
    try { sessionStorage.setItem(SKEY, JSON.stringify(work)); } catch { /* 存不下就算了，不影响当前使用 */ }
  }
  function restoreWork() {
    try { const s = sessionStorage.getItem(SKEY); if (s) work = JSON.parse(s); } catch { work = null; }
    if (work) state.sel = work.columns.map((_, i) => i);   // 这条路不经过 setWork，勾选要自己补
  }
  const savedList = () => { try { return JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch { return []; } };
  function writeSaved(list) {
    const json = JSON.stringify(list);
    if (json.length > MAX_SAVE_BYTES) { alert(T().custom_save_big); return false; }
    try { localStorage.setItem(LKEY, json); return true; }
    catch { alert(T().custom_save_big); return false; }
  }
  function saveCurrent() {
    if (!work) return;
    const name = prompt(T().custom_save_prompt, work.name || '');
    if (!name) return;
    const list = savedList();
    const i = list.findIndex(x => x.name === name);
    if (i >= 0 && !confirm(T().custom_save_dup)) return;
    const entry = { name, at: new Date().toISOString().slice(0, 10), data: { ...work, name } };
    if (i >= 0) list[i] = entry; else list.push(entry);
    if (writeSaved(list)) { render(); alert(T().custom_save_ok.replace('{n}', name)); }
  }

  /* ---------- 界面 ---------- */
  function buildUI() {
    const t = T();
    $('customPage').innerHTML = `
      <div class="page-heading"><div>
        <h1 data-i18n="custom_title">${escapeHtml(t.custom_title)}</h1>
        <p data-i18n="custom_desc">${escapeHtml(t.custom_desc)}</p>
      </div></div>
      <details id="customGuide" class="chart-guide" open></details>
      <div id="customSrcSwitch" class="chart-switch"></div>
      <section id="customFilePanel" class="controls">
        <label><span data-i18n="custom_pick">${escapeHtml(t.custom_pick)}</span>
          <input id="customFile" type="file" accept=".xlsx,.xls,.csv"></label>
        <label id="customSheetWrap" hidden><span data-i18n="custom_sheet">${escapeHtml(t.custom_sheet)}</span>
          <select id="customSheet"></select></label>
      </section>
      <section id="customManualPanel" hidden>
        <div class="manual-grid-wrap"><table id="customGrid" class="manual-grid"></table></div>
        <div class="chart-switch">
          <button id="customApply" type="button" class="reset">${escapeHtml(t.custom_apply)}</button>
          <button id="customClearGrid" type="button">${escapeHtml(t.custom_clear)}</button>
        </div>
      </section>
      <p id="customSrcHint" class="hint"></p>
      <section id="customStore" class="controls"></section>
      <div id="customReport"></div>
      <div id="customVars"></div>
      <section id="customPick" class="controls" hidden></section>
      <section id="customBinWrap" class="bin-control" hidden>
        <label for="customBin" data-i18n="custom_binwidth">${escapeHtml(t.custom_binwidth)}</label>
        <input id="customBin" type="range" min="0" max="1" step="1" value="0">
        <output id="customBinOut"></output>
      </section>
      <div id="customStats"></div>
      <div id="customCharts" class="chart-pair"></div>`;

    $('customFile').addEventListener('change', e => { if (e.target.files[0]) readFile(e.target.files[0]); });
    $('customSheet').addEventListener('change', e => loadSheet(work ? work.name : 'data', e.target.value));
    $('customApply').addEventListener('click', applyGrid);
    $('customClearGrid').addEventListener('click', () => { buildGrid(); });
    $('customBin').addEventListener('input', e => {
      const v = quantValues(quantIndex());
      const r = Math.max(...v) - Math.min(...v);
      state.binW = Charts.binChoices(r)[Number(e.target.value)];
      render();
    });
    buildSrcSwitch();
    buildGrid();
  }

  function buildSrcSwitch() {
    const t = T();
    $('customSrcSwitch').innerHTML = [['file', t.custom_src_file], ['manual', t.custom_src_manual]]
      .map(([k, l]) => `<button type="button" data-src="${k}" aria-pressed="${state.src === k}">${escapeHtml(l)}</button>`).join('');
    $('customSrcSwitch').querySelectorAll('[data-src]').forEach(b =>
      b.addEventListener('click', () => { state.src = b.dataset.src; render(); }));
  }

  /* ---------- 手动输入网格 ---------- */
  const GRID_ROWS = 14;
  const MAX_COLS = 8;
  let gridCols = 2;                                  // 手动输入网格当前有几列

  function buildGrid(rows = GRID_ROWS) {
    const t = T();
    const typeSel = j => `<select class="grid-type" data-j="${j}">` +
      `<option value="quant">${escapeHtml(t.custom_quant)}</option>` +
      `<option value="cat">${escapeHtml(t.custom_cat)}</option></select>`;
    const head = j => j === 0 ? t.custom_col1 : j === 1 ? t.custom_col2 : t.custom_coln.replace('{n}', j + 1);
    const cols = [...Array(gridCols).keys()];
    let html = `<thead><tr><th></th>` + cols.map(j =>
        `<th>${escapeHtml(head(j))}` +
        (j >= 2 ? ` <button type="button" class="grid-delcol" data-j="${j}" title="${escapeHtml(t.custom_delcol)}">×</button>` : '') +
        `</th>`).join('') +
      (gridCols < MAX_COLS ? `<th class="grid-addcol-cell"><button type="button" id="gridAddCol">${escapeHtml(t.custom_addcol)}</button></th>` : '') +
      `</tr></thead><tbody>`;
    html += `<tr><th>${escapeHtml(t.custom_type)}</th>` + cols.map(j => `<td>${typeSel(j)}</td>`).join('') + `<td></td></tr>`;
    html += `<tr><th>${escapeHtml(t.custom_varname)}</th>` +
            cols.map(j => `<td><input class="grid-name" data-j="${j}" type="text"></td>`).join('') + `<td></td></tr>`;
    for (let i = 0; i < rows; i++)
      html += `<tr><th class="grid-rownum">${i + 1}</th>` +
              cols.map(j => `<td><input class="grid-cell" data-i="${i}" data-j="${j}" type="text"></td>`).join('') +
              `<td></td></tr>`;
    $('customGrid').innerHTML = html + '</tbody>';
    const add = $('gridAddCol');
    if (add) add.addEventListener('click', () => { const keep = readGrid(); gridCols++; buildGrid(); writeGrid(keep); });
    $('customGrid').querySelectorAll('.grid-delcol').forEach(b =>
      b.addEventListener('click', () => {
        const j = Number(b.dataset.j), keep = readGrid();
        keep.names.splice(j, 1); keep.types.splice(j, 1); keep.cells.forEach(r => r.splice(j, 1));
        gridCols--; buildGrid(); writeGrid(keep);
      }));
    $('customGrid').querySelectorAll('.grid-cell').forEach(el => {
      el.addEventListener('paste', onGridPaste);
      el.addEventListener('input', () => {             // 填到最后一行就再加几行
        if (Number(el.dataset.i) >= gridRowCount() - 2) addGridRows(6);
      });
    });
  }
  const gridRowCount = () => $('customGrid').querySelectorAll('.grid-rownum').length;
  /* 加列、删列都要重建整个表格，所以先把已填的内容读出来、建完再写回去 */
  function readGrid() {
    const names = [...$('customGrid').querySelectorAll('.grid-name')].map(e => e.value);
    const types = [...$('customGrid').querySelectorAll('.grid-type')].map(e => e.value);
    const n = gridRowCount(), cells = [];
    for (let i = 0; i < n; i++) cells.push([...Array(names.length).keys()].map(j =>
      $('customGrid').querySelector(`.grid-cell[data-i="${i}"][data-j="${j}"]`)?.value ?? ''));
    return { names, types, cells };
  }
  function writeGrid(k) {
    if (k.cells.length > gridRowCount()) addGridRows(k.cells.length - gridRowCount());
    $('customGrid').querySelectorAll('.grid-name').forEach((e, j) => { if (k.names[j] !== undefined) e.value = k.names[j]; });
    $('customGrid').querySelectorAll('.grid-type').forEach((e, j) => { if (k.types[j] !== undefined) e.value = k.types[j]; });
    k.cells.forEach((row, i) => row.forEach((v, j) => {
      const c = $('customGrid').querySelector(`.grid-cell[data-i="${i}"][data-j="${j}"]`);
      if (c) c.value = v;
    }));
  }
  function addGridRows(k) {
    const tbody = $('customGrid').querySelector('tbody');
    const start = gridRowCount();
    for (let i = start; i < start + k; i++) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<th class="grid-rownum">${i + 1}</th>` +
        [...Array(gridCols).keys()].map(j => `<td><input class="grid-cell" data-i="${i}" data-j="${j}" type="text"></td>`).join('') +
        `<td></td>`;
      tbody.appendChild(tr);
      tr.querySelectorAll('.grid-cell').forEach(el => {
        el.addEventListener('paste', onGridPaste);
        el.addEventListener('input', () => { if (Number(el.dataset.i) >= gridRowCount() - 2) addGridRows(6); });
      });
    }
  }
  /* 从 Excel 复制来的是「制表符分列、换行分行」的文本，从落点开始铺开 */
  function onGridPaste(e) {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (!text || !/[\t\n]/.test(text)) return;       // 单个值就让浏览器自己处理
    e.preventDefault();
    const i0 = Number(e.target.dataset.i), j0 = Number(e.target.dataset.j);
    const grid = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map(r => r.split('\t'));
    if (i0 + grid.length > gridRowCount()) addGridRows(i0 + grid.length - gridRowCount() + 4);
    grid.forEach((row, di) => row.forEach((val, dj) => {
      const cell = $('customGrid').querySelector(`.grid-cell[data-i="${i0 + di}"][data-j="${j0 + dj}"]`);
      if (cell) cell.value = val.trim();
    }));
  }
  function applyGrid() {
    const t = T();
    const names = [...$('customGrid').querySelectorAll('.grid-name')].map(el => el.value.trim());
    const types = [...$('customGrid').querySelectorAll('.grid-type')].map(el => el.value);
    const n = gridRowCount();
    const colVals = [...Array(gridCols).keys()].map(() => []);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < gridCols; j++)
        colVals[j].push(($('customGrid').querySelector(`.grid-cell[data-i="${i}"][data-j="${j}"]`)?.value ?? '').trim());
    // 去掉所有列都空的尾行
    let last = -1;
    for (let i = 0; i < n; i++) if (colVals.some(c => c[i] !== '')) last = i;
    if (last < 0) { alert(t.custom_empty_col); return; }
    const columns = [];
    for (let j = 0; j < gridCols; j++) {
      const vals = colVals[j].slice(0, last + 1);
      if (!vals.some(v => v !== '')) continue;
      const fallback = j === 0 ? t.custom_col1 : j === 1 ? t.custom_col2 : t.custom_coln.replace('{n}', j + 1);
      columns.push({ name: names[j] || fallback, type: types[j], values: vals });
    }
    if (!columns.length) { alert(t.custom_empty_col); return; }
    setWork({ name: columns[0].name, columns, n: last + 1, truncated: false });
  }

  /* ---------- 取值 ---------- */
  /* 画图前按所选变量成对清洗：任一所选变量缺失的整行都丢掉，保证配对关系正确 */
  function cleanPairs() {
    const idx = twoVar() ? [state.v1, state.v2] : [state.v1];
    const keep = [];
    for (let r = 0; r < work.n; r++) {
      let ok = true;
      for (const i of idx) {
        const v = col(i).values[r];
        if (v === null || v === undefined || String(v).trim() === '') { ok = false; break; }
        if (col(i).type === 'quant' && !isNum(v)) { ok = false; break; }
      }
      if (ok) keep.push(r);
    }
    return keep;
  }
  const quantIndex = () => typeOf(state.v1) === 'quant' ? state.v1 : (twoVar() && typeOf(state.v2) === 'quant' ? state.v2 : -1);
  const catIndex = () => typeOf(state.v1) === 'cat' ? state.v1 : (twoVar() && typeOf(state.v2) === 'cat' ? state.v2 : -1);
  function quantValues(i, rowsIdx) {
    const rows = rowsIdx || cleanPairs();
    return rows.map(r => Number(col(i).values[r])).filter(Number.isFinite);
  }
  function levelsOf(i, rows) {
    const seen = [];
    for (const r of rows) { const v = String(col(i).values[r]); if (!seen.includes(v)) seen.push(v); }
    return seen.sort((a, b) => {
      const na = Number(a), nb = Number(b);
      return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.localeCompare(b, 'zh');
    });
  }

  /* ---------- 渲染 ---------- */
  function renderGuide() {
    const t = T();
    const open = $('customGuide').open;            // 保住用户自己折叠/展开的状态
    $('customGuide').innerHTML =
      `<summary>${escapeHtml(t.custom_guide_title)}</summary>` +
      `<ul>${t.custom_guide.map(([k, v]) => `<li><b>${escapeHtml(k)}</b> → ${escapeHtml(v)}</li>`).join('')}</ul>`;
    $('customGuide').open = open;
  }

  function render() {
    const t = T();
    renderGuide();
    $('customSrcSwitch').querySelectorAll('[data-src]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.src === state.src)));
    $('customFilePanel').hidden = state.src !== 'file';
    $('customManualPanel').hidden = state.src !== 'manual';
    $('customSrcHint').textContent = state.src === 'file' ? t.custom_file_hint : t.custom_manual_hint;
    $('customSheetWrap').hidden = state.sheetNames.length < 2;
    if (state.sheetNames.length > 1) setOptions($('customSheet'), state.sheetNames, state.sheet);

    renderStore();

    if (!work) {
      $('customReport').innerHTML = `<p class="hint">${escapeHtml(t.custom_no_data)}</p>`;
      $('customVars').innerHTML = ''; $('customPick').hidden = true;
      $('customBinWrap').hidden = true; $('customStats').innerHTML = ''; $('customCharts').innerHTML = '';
      return;
    }
    renderReport();
    renderVarTable();
    renderPicker();
    renderCharts();
  }

  function renderStore() {
    const t = T();
    const list = savedList();
    $('customStore').innerHTML =
      `<button id="customSave" class="reset" type="button" ${work ? '' : 'disabled'}>${escapeHtml(t.custom_save)}</button>` +
      (list.length ? `<label><span>${escapeHtml(t.custom_saved_list)}</span><select id="customSaved">` +
        list.map((x, i) => `<option value="${i}">${escapeHtml(x.name)}　(${x.at})</option>`).join('') + `</select></label>` +
        `<button id="customLoad" type="button" class="secondary-button">${escapeHtml(t.custom_load)}</button>` +
        `<button id="customDel" type="button" class="secondary-button">${escapeHtml(t.custom_delete)}</button>` : '') +
      (work ? `<button id="customClearAll" type="button" class="secondary-button">${escapeHtml(t.custom_clear_all)}</button>` : '');
    $('customSave').addEventListener('click', saveCurrent);
    const ld = $('customLoad');
    if (ld) {
      ld.addEventListener('click', () => {
        const e = savedList()[Number($('customSaved').value)];
        if (!e) return;
        state.sheetNames = [];
        state.src = 'manual';                     // 推回表格后切到手动输入，方便接着改
        setWork(JSON.parse(JSON.stringify(e.data)));
      });
      $('customDel').addEventListener('click', () => {
        const list2 = savedList(); const i = Number($('customSaved').value);
        if (list2[i] && confirm(`${T().custom_delete}「${list2[i].name}」?`)) { list2.splice(i, 1); writeSaved(list2); render(); }
      });
    }
    const ca = $('customClearAll');
    if (ca) ca.addEventListener('click', () => {
      work = null; state.sheetNames = []; state.book = null;
      try { sessionStorage.removeItem(SKEY); } catch {}
      render();
    });
  }

  function renderReport() {
    const t = T();
    const kept = cleanPairs().length, dropped = work.n - kept;
    $('customReport').innerHTML =
      (work.note ? `<p class="hint">${escapeHtml(work.note)}</p>` : '') +
      `<p class="hint">${escapeHtml(t.custom_report)}：<strong>${work.n}</strong> ${escapeHtml(t.custom_rows)} × ` +
      `<strong>${work.columns.length}</strong> ${escapeHtml(t.custom_cols)}` +
      (dropped ? `　·　${escapeHtml(t.custom_dropped.replace('{n}', dropped))}` : '') +
      (work.pushedToGrid ? `　·　${escapeHtml(t.custom_pushed)}` : '') +
      (work.pushedToGrid === false ? `　·　${escapeHtml(t.custom_too_big_grid.replace('{n}', work.n).replace('{m}', GRID_PUSH_MAX))}` : '') +
      (work.footnotes ? `　·　${escapeHtml(t.custom_footnote.replace('{n}', work.footnotes))}` : '') +
      (work.truncated ? `　·　${escapeHtml(t.custom_too_many.replace('{n}', MAX_ROWS))}` : '') + `</p>`;
  }

  function renderVarTable() {
    const t = T();
    const rows = work.columns.map((c, i) => {
      const preview = c.values.filter(v => v !== null && String(v).trim() !== '').slice(0, 5).join('、');
      return `<tr><th>${escapeHtml(c.name)}</th>` +
        `<td><select class="var-type" data-i="${i}">` +
        `<option value="quant"${c.type === 'quant' ? ' selected' : ''}>${escapeHtml(t.custom_quant)}</option>` +
        `<option value="cat"${c.type === 'cat' ? ' selected' : ''}>${escapeHtml(t.custom_cat)}</option></select></td>` +
        `<td class="var-preview">${escapeHtml(preview)}${c.values.length > 5 ? ' …' : ''}</td></tr>`;
    }).join('');
    $('customVars').innerHTML =
      `<div class="freq-table-wrap"><p class="freq-caption">${escapeHtml(t.custom_vars)}</p>` +
      `<table class="freq-table"><thead><tr><th class="corner">${escapeHtml(t.custom_varname)}</th>` +
      `<th>${escapeHtml(t.custom_type)}</th><th>${escapeHtml(t.custom_preview)}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    $('customVars').querySelectorAll('.var-type').forEach(el =>
      el.addEventListener('change', () => {
        work.columns[Number(el.dataset.i)].type = el.value;
        state.binW = null; persistWork(); render();
      }));
  }

  const multiMode = () => work.columns.length >= 3;

  /* 参与作图的变量下标。
     两列及以下 —— 由 v1 / v2 两个下拉决定；
     三列及以上 —— 由勾选框决定，勾几个就按几个变量的规则出图。 */
  function selection() {
    if (!multiMode()) return twoVar() ? [state.v1, state.v2] : [state.v1];
    return (state.sel || []).filter(i => i >= 0 && i < work.columns.length);
  }
  /* 勾了 1～2 个时把它们写回 v1 / v2，后面那一整套老逻辑就能原样复用 */
  function syncSelToVars() {
    const sel = selection();
    if (!multiMode() || sel.length > 2 || !sel.length) return;
    state.v1 = sel[0];
    state.v2 = sel.length === 2 ? sel[1] : -1;
  }
  const bothQuant = () => { const sel = selection();
    return sel.length === 2 && sel.every(i => typeOf(i) === 'quant'); };

  function renderPicker() {
    const t = T();
    const idx = work.columns.map((_, i) => i);
    if (multiMode()) {                               // 3 列以上：勾选要画哪几个
      $('customPick').hidden = false;
      $('customPick').innerHTML =
        `<fieldset class="var-check"><legend>${escapeHtml(t.custom_use)}</legend>` +
        idx.map(i => `<label class="var-check-item"><input type="checkbox" data-i="${i}"` +
          `${state.sel.includes(i) ? ' checked' : ''}><span>${escapeHtml(col(i).name)}</span></label>`).join('') +
        `</fieldset>` +
        (bothQuant() ? `<button id="customSwap" type="button" class="secondary-button">${escapeHtml(t.custom_swap)}</button>` : '') +
        `<p class="hint">${escapeHtml(t.custom_use_hint)}</p>`;
      $('customPick').querySelectorAll('input[type="checkbox"]').forEach(cb =>
        cb.addEventListener('change', () => {
          const i = Number(cb.dataset.i);
          // 按列的顺序存，勾选顺序不影响谁是 x 谁是 y —— 要换轴用「交换 x / y」
          state.sel = cb.checked ? [...state.sel, i].sort((a, b) => a - b) : state.sel.filter(x => x !== i);
          state.binW = null; render();
        }));
      const sw = $('customSwap');
      if (sw) sw.addEventListener('click', () => { state.sel = [state.sel[1], state.sel[0]]; render(); });
      return;
    }
    $('customPick').hidden = false;
    $('customPick').innerHTML =
      `<label><span>${escapeHtml(t.custom_show1)}</span><select id="customV1"></select></label>` +
      `<label><span>${escapeHtml(t.custom_show2)}</span><select id="customV2"></select></label>` +
      (needBasis() ? `<label><span>${escapeHtml(t.custom_basis)}</span><select id="customBasis"></select></label>` : '') +
      (bothQuant() ? `<button id="customSwap" type="button" class="secondary-button">${escapeHtml(t.custom_swap)}</button>` : '');
    setOptions($('customV1'), idx, state.v1, i => col(i).name);
    setOptions($('customV2'), [-1, ...idx], state.v2, i => i < 0 ? t.custom_none : col(i).name);
    $('customV1').value = String(state.v1);
    $('customV2').value = String(state.v2);
    $('customV1').addEventListener('change', e => { state.v1 = Number(e.target.value); state.binW = null; render(); });
    $('customV2').addEventListener('change', e => { state.v2 = Number(e.target.value); state.binW = null; render(); });
    const sw = $('customSwap');
    if (sw) sw.addEventListener('click', () => { const a = state.v1; state.v1 = state.v2; state.v2 = a; render(); });
    const bs = $('customBasis');
    if (bs) {
      const opts = twoVar() && typeOf(state.v1) === 'cat' && typeOf(state.v2) === 'cat'
        ? [['count', t.custom_count], ['row', t.custom_row_pct], ['col', t.custom_col_pct], ['total', t.custom_tot_pct]]
        : [['count', t.custom_freq], ['rel', t.custom_relfreq]];
      if (!opts.some(o => o[0] === state.basis)) state.basis = 'count';
      bs.innerHTML = opts.map(([v, l]) => `<option value="${v}">${escapeHtml(l)}</option>`).join('');
      bs.value = state.basis;
      bs.addEventListener('change', e => { state.basis = e.target.value; render(); });
    }
  }
  function needBasis() {
    if (!twoVar()) return true;
    return !(typeOf(state.v1) === 'quant' || typeOf(state.v2) === 'quant');
  }

  const panel = (title, inner, note, span) =>
    `<section class="chart-panel${span ? ' span-2' : ''}"><h2>${escapeHtml(title)}</h2>${inner}` +
    (note ? `<p class="panel-note">${escapeHtml(note)}</p>` : '') + `</section>`;
  const svgOf = (body, h, w = Charts.DEF.W) => `<svg class="cat-chart" viewBox="0 0 ${w} ${h}" role="img">${body}</svg>`;

  function renderCharts() {
    const t = T();
    const sel = selection();
    if (!sel.length) {                               // 一个都没勾
      $('customBinWrap').hidden = true;
      $('customStats').innerHTML = '';
      $('customCharts').innerHTML = `<p class="hint">${escapeHtml(t.custom_use_none)}</p>`;
      return;
    }
    if (sel.length >= 3) { renderMultiBox(sel); return; }
    syncSelToVars();                                 // 勾了 1～2 个 → 走下面这套老逻辑
    const rows = cleanPairs();
    const q = quantIndex(), c = catIndex();
    $('customBinWrap').hidden = q < 0;
    $('customStats').innerHTML = '';

    // 「两个都是定量」是结构性情况，必须排在数据清洗之前判断 ——
    // 否则把一个文字列误标成定量时，整表会被清空，先撞上「没数据」的分支。
    if (twoVar() && typeOf(state.v1) === 'quant' && typeOf(state.v2) === 'quant') {
      $('customBinWrap').hidden = true;
      renderScatter(rows);
      return;
    }
    if (!rows.length) {
      $('customCharts').innerHTML = `<p class="hint">${escapeHtml(t.custom_empty_col)}</p>`;
      $('customBinWrap').hidden = true;
      return;
    }

    if (q >= 0) {                                   // 组距滑杆
      const v = quantValues(q, rows);
      const r = Math.max(...v) - Math.min(...v);
      const choices = Charts.binChoices(r);
      if (!choices.length) { $('customBinWrap').hidden = true; }
      else {
        if (state.binW === null || !choices.includes(state.binW)) state.binW = Charts.defaultBin(choices, r);
        $('customBin').max = String(choices.length - 1);
        $('customBin').value = String(choices.indexOf(state.binW));
        const d = Charts.decimalsFor(state.binW);
        $('customBinOut').textContent = `${state.binW.toFixed(d)}　(${t.custom_bins} ${Charts.histogram(v, state.binW).k})`;
      }
    }

    // 只有分类变量
    if (q < 0) { renderCategorical(rows); return; }
    // 定量 + 分类
    if (c >= 0) { renderGrouped(rows, q, c); return; }
    // 只有一个定量
    renderQuantitative(rows, q);
  }

  function renderCategorical(rows) {
    const t = T();
    if (!twoVar()) {
      const lv = levelsOf(state.v1, rows);
      const counts = lv.map(l => rows.filter(r => String(col(state.v1).values[r]) === l).length);
      const n = Charts.sum(counts);
      const asPct = state.basis === 'rel';
      const vals = asPct ? counts.map(v => +Charts.pctOf(v, n).toFixed(1)) : counts;
      $('customStats').innerHTML = freqTable(lv, counts, n);
      $('customCharts').innerHTML =
        panel(t.chart_bar, svgOf(Charts.bar({ values: vals, labels: lv, axisLabel: asPct ? t.custom_pct_axis : t.custom_freq, pct: asPct }), Charts.DEF.H)) +
        panel(t.chart_pie, svgOf(Charts.pie({ values: counts, labels: lv }), Charts.DEF.H)) +
        legendHtml(lv);
      return;
    }
    const lv1 = levelsOf(state.v1, rows), lv2 = levelsOf(state.v2, rows);
    const M = lv1.map(a => lv2.map(b =>
      rows.filter(r => String(col(state.v1).values[r]) === a && String(col(state.v2).values[r]) === b).length));
    $('customStats').innerHTML = ctab(M, lv1, lv2);
    const rowTot = M.map(Charts.sum), colTot = lv2.map((_, j) => Charts.sum(M.map(r => r[j]))), n = Charts.sum(rowTot);
    const asPct = state.basis !== 'count';
    const V = M.map((row, i) => row.map((v, j) => !asPct ? v
      : +Charts.pctOf(v, state.basis === 'row' ? rowTot[i] : state.basis === 'col' ? colTot[j] : n).toFixed(1)));
    $('customCharts').innerHTML =
      panel(t.chart_grouped, svgOf(Charts.grouped({ matrix: V, rowLabels: lv1, colLabels: lv2, axisLabel: asPct ? t.custom_pct_axis : t.custom_freq, pct: asPct }), Charts.DEF.H)) +
      panel(t.chart_segmented, svgOf(Charts.segmented({ matrix: M, rowLabels: lv1, colLabels: lv2, pctAxisLabel: t.custom_pct_axis }), Charts.DEF.H)) +
      legendHtml(lv2);
  }

  function renderQuantitative(rows, q) {
    const t = T();
    const v = quantValues(q, rows), name = col(q).name;
    $('customStats').innerHTML = statsGrid(v);
    const box = Charts.box({ values: v, xLabel: name });
    $('customCharts').innerHTML =
      panel(t.chart_hist, svgOf(Charts.hist({ values: v, binW: state.binW, pct: state.basis === 'rel', yLabel: state.basis === 'rel' ? t.custom_relfreq : t.custom_freq, xLabel: name }), Charts.DEF.H)) +
      panel(t.chart_dot, svgOf(Charts.dot({ values: v, binW: state.binW, yLabel: t.custom_freq, xLabel: name }), Charts.DEF.H)) +
      panel(t.chart_ogive, svgOf(Charts.ogive({ values: v, binW: state.binW, yLabel: t.custom_relfreq, xLabel: name }), Charts.DEF.H)) +
      panel(t.chart_box, svgOf(box.svg, box.h)) +
      panel(t.chart_stem, `<pre class="stem-plot">${escapeHtml(Charts.stem({ values: v, readTpl: t.custom_stem_read, crowdedNote: t.custom_stem_crowded, negNote: t.custom_stem_neg }))}</pre>`, null, true);
  }

  /* 两个都是定量：散点图 + 最小二乘回归直线。
     第一个变量作 x（解释变量），第二个作 y（响应变量）—— 顺序要紧，所以给了交换按钮。 */
  function renderScatter(rows) {
    const t = T();
    const xi = state.v1, yi = state.v2;
    const pts = rows.map(r => ({ x: Number(col(xi).values[r]), y: Number(col(yi).values[r]) }))
                    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    const fit = regression(pts);                      // 点太少或某一轴是常数时返回 null
    if (!fit) {
      $('customStats').innerHTML = '';
      $('customCharts').innerHTML = `<p class="hint">${escapeHtml(t.custom_scatter_need)}</p>`;
      return;
    }
    const d = v => Math.abs(v) >= 100 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(3) : v.toFixed(4);
    const eq = fit.intercept < 0 ? `ŷ = ${d(fit.slope)}x − ${d(-fit.intercept)}`
                                 : `ŷ = ${d(fit.intercept)} + ${d(fit.slope)}x`;
    const cell = (k, v) => `<div><span>${escapeHtml(t[k])}</span><strong>${escapeHtml(v)}</strong></div>`;
    $('customStats').innerHTML = `<section class="quant-stats">` +
      cell('custom_npairs', String(pts.length)) +
      cell('custom_eq', eq) +
      cell('custom_r', fit.r.toFixed(4)) +
      cell('custom_r2', fit.r2.toFixed(4)) +
      cell('custom_slope', d(fit.slope)) +
      cell('custom_intercept', d(fit.intercept)) + `</section>`;
    const H = 420;
    $('customCharts').innerHTML = panel(t.custom_scatter,
      `<svg class="cat-chart" viewBox="0 0 1120 ${H}" role="img">` +
      Charts.scatter({ points: pts, xLabel: col(xi).name, yLabel: col(yi).name, fit,
                       geom: { W: 1120, H, M: { left: 70, right: 24, top: 22, bottom: 62 }, yLabelDx: 10 } }) +
      `</svg>`, t.custom_scatter_note, true);
  }

  function renderGrouped(rows, q, c) {
    const t = T();
    const name = col(q).name;
    const lv = levelsOf(c, rows);
    const groups = lv.map(l => ({ label: l, values: rows.filter(r => String(col(c).values[r]) === l).map(r => Number(col(q).values[r])).filter(Number.isFinite) }))
                     .filter(g => g.values.length);
    $('customStats').innerHTML = groupStats(groups);
    // 两组直方图共用分箱边界与纵轴上限，否则无法直接比较
    const all = groups.flatMap(g => g.values);
    const shared = Charts.histogram(all, state.binW);
    const yTop = Math.max(...groups.map(g => Math.max(...Charts.histogram(g.values, state.binW).bins.map(b => b.n))));
    let html = panel(t.chart_boxes, svgOf(Charts.boxGroups({ groups, xLabel: name, geom: { W: 1120, H: 90 + groups.length * 70 } }), 90 + groups.length * 70, 1120), null, true);
    html += groups.map(g => panel(`${t.chart_hist} · ${g.label}`,
      svgOf(Charts.hist({ values: g.values, binW: state.binW, yLabel: t.custom_freq, xLabel: name,
                          geom: { W: Charts.DEF.W, H: Charts.DEF.H } }), Charts.DEF.H))).join('');
    html += groups.length === 2
      ? panel(t.chart_b2b, Charts.backToBackStem({ groups, stemLabel: t.custom_stem_label, readTpl: t.custom_stem_read }), null, true)
      : panel(t.chart_b2b, `<p class="hint">${escapeHtml(t.custom_b2b_need2.replace('{n}', groups.length))}</p>`, null, true);
    $('customCharts').innerHTML = html;
  }

  /* 3 列及以上：只画并排箱线图。每一列单独清洗（不做成对删除）——
     各列长度本来就可以不一样，强行配对会白白丢数据。 */
  function renderMultiBox(sel) {
    const t = T();
    $('customBinWrap').hidden = true;
    const groups = [], skipped = [];
    for (const c of sel.map(i => col(i))) {
      if (c.type !== 'quant') { skipped.push(c.name); continue; }
      const v = c.values.map(Number).filter(Number.isFinite);
      if (v.length >= 2) groups.push({ label: c.name, values: v });
    }
    if (groups.length < 2) {
      $('customStats').innerHTML = '';
      $('customCharts').innerHTML = `<p class="hint">${escapeHtml(t.custom_multi_need)}</p>`;
      return;
    }
    $('customStats').innerHTML = multiStats(groups);
    const h = 90 + groups.length * 70;
    $('customCharts').innerHTML = panel(t.custom_multi,
      `<svg class="cat-chart" viewBox="0 0 1120 ${h}" role="img">` +
      Charts.boxGroups({ groups, xLabel: '', geom: { W: 1120, H: h, yLabelDx: 8 } }) + `</svg>`,
      t.custom_multi_note + (skipped.length ? '　' + t.custom_multi_skip.replace('{n}', skipped.length) : ''),
      true);
  }
  function multiStats(groups) {
    const t = T();
    const cols = ['custom_n','custom_mean','custom_median','custom_sd','custom_min','custom_q1','custom_q3','custom_max','custom_iqr','custom_range'];
    const head = cols.map(c => `<th>${escapeHtml(t[c])}</th>`).join('');
    const body = groups.map((g, i) => {
      const f = fiveNumber(g.values), ms = meanSd(g.values);
      const n = x => Number.isFinite(x) ? x.toFixed(1) : '—';
      return `<tr><th><span class="swatch" style="background:${Charts.colorOf(i)}"></span>${escapeHtml(g.label)}</th>` +
        `<td>${f.n}</td><td>${n(ms.mean)}</td><td>${n(f.median)}</td><td>${n(ms.sd)}</td>` +
        `<td>${n(f.min)}</td><td>${n(f.q1)}</td><td>${n(f.q3)}</td><td>${n(f.max)}</td><td>${n(f.iqr)}</td><td>${n(f.max - f.min)}</td></tr>`;
    }).join('');
    return `<div class="freq-table-wrap"><table class="freq-table"><thead><tr>` +
      `<th class="corner">${escapeHtml(t.custom_varname)}</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  /* ---------- 表格 ---------- */
  function legendHtml(labels) {
    return `<div class="cat-legend span-2">` + labels.map((l, i) =>
      `<span><i style="background:${Charts.colorOf(i)}"></i>${escapeHtml(l)}</span>`).join('') + `</div>`;
  }
  function freqTable(labels, counts, n) {
    const t = T();
    const rows = labels.map((l, i) =>
      `<tr><th><span class="swatch" style="background:${Charts.colorOf(i)}"></span>${escapeHtml(l)}</th>` +
      `<td>${counts[i]}</td><td>${Charts.fmtPct(Charts.pctOf(counts[i], n))}</td></tr>`).join('');
    return `<div class="freq-table-wrap"><table class="freq-table"><thead><tr>` +
      `<th class="corner">${escapeHtml(t.custom_category)}</th><th>${escapeHtml(t.custom_freq)}</th><th>${escapeHtml(t.custom_relfreq)}</th>` +
      `</tr></thead><tbody>${rows}<tr class="margin"><th>${escapeHtml(t.custom_total)}</th><td>${n}</td><td>100.0%</td></tr></tbody></table></div>`;
  }
  function ctab(M, lv1, lv2) {
    const t = T();
    const rowTot = M.map(Charts.sum), colTot = lv2.map((_, j) => Charts.sum(M.map(r => r[j]))), n = Charts.sum(rowTot);
    const show = (v, i, j) => state.basis === 'count' ? String(v)
      : state.basis === 'row' ? Charts.fmtPct(Charts.pctOf(v, rowTot[i]))
      : state.basis === 'col' ? Charts.fmtPct(Charts.pctOf(v, colTot[j]))
      : Charts.fmtPct(Charts.pctOf(v, n));
    const head = lv2.map((l, j) => `<th><span class="swatch" style="background:${Charts.colorOf(j)}"></span>${escapeHtml(l)}</th>`).join('');
    const body = M.map((row, i) => `<tr><th>${escapeHtml(lv1[i])}</th>` + row.map((v, j) => `<td>${show(v, i, j)}</td>`).join('') +
      `<td class="margin">${state.basis === 'row' ? '100.0%' : state.basis === 'count' ? rowTot[i] : Charts.fmtPct(Charts.pctOf(rowTot[i], n))}</td></tr>`).join('');
    const foot = `<tr class="margin"><th>${escapeHtml(t.custom_total)}</th>` +
      colTot.map(v => `<td>${state.basis === 'col' ? '100.0%' : state.basis === 'count' ? v : Charts.fmtPct(Charts.pctOf(v, n))}</td>`).join('') +
      `<td>${state.basis === 'count' ? n : '100.0%'}</td></tr>`;
    return `<div class="freq-table-wrap"><table class="freq-table"><thead><tr>` +
      `<th class="corner">${escapeHtml(col(state.v1).name)} \\ ${escapeHtml(col(state.v2).name)}</th>${head}` +
      `<th class="margin">${escapeHtml(t.custom_total)}</th></tr></thead><tbody>${body}${foot}</tbody></table></div>`;
  }
  function statsGrid(v) {
    const t = T(), f = fiveNumber(v), ms = meanSd(v);
    const d = (Math.max(...v) - Math.min(...v)) < 10 ? 2 : 1;
    const cell = (k, val) => `<div><span>${escapeHtml(t[k])}</span><strong>${val}</strong></div>`;
    const n = x => Number.isFinite(x) ? x.toFixed(d) : '—';
    return `<section class="quant-stats">` +
      cell('custom_n', f.n) + cell('custom_mean', n(ms.mean)) + cell('custom_median', n(f.median)) +
      cell('custom_sd', n(ms.sd)) + cell('custom_range', n(f.max - f.min)) + cell('custom_iqr', n(f.iqr)) +
      cell('custom_min', n(f.min)) + cell('custom_q1', n(f.q1)) + cell('custom_q3', n(f.q3)) + cell('custom_max', n(f.max)) +
      `</section>`;
  }
  function groupStats(groups) {
    const t = T();
    const cols = ['custom_n', 'custom_mean', 'custom_median', 'custom_sd', 'custom_min', 'custom_q1', 'custom_q3', 'custom_max', 'custom_iqr', 'custom_range'];
    const head = cols.map(c => `<th>${escapeHtml(t[c])}</th>`).join('');
    const body = groups.map((g, i) => {
      const f = fiveNumber(g.values), ms = meanSd(g.values);
      const n = x => Number.isFinite(x) ? x.toFixed(1) : '—';
      return `<tr><th><span class="swatch" style="background:${Charts.colorOf(i)}"></span>${escapeHtml(g.label)}</th>` +
        `<td>${f.n}</td><td>${n(ms.mean)}</td><td>${n(f.median)}</td><td>${n(ms.sd)}</td>` +
        `<td>${n(f.min)}</td><td>${n(f.q1)}</td><td>${n(f.q3)}</td><td>${n(f.max)}</td><td>${n(f.iqr)}</td><td>${n(f.max - f.min)}</td></tr>`;
    }).join('');
    return `<div class="freq-table-wrap"><table class="freq-table"><thead><tr>` +
      `<th class="corner">${escapeHtml(col(catIndex()).name)}</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  /* ---------- 启动 ---------- */
  seedSample();
  restoreWork();
  buildUI();
  render();
  document.addEventListener('apstats:tool', e => { if (e.detail === 'custom') render(); });
  document.addEventListener('apstats:language', () => {
    buildSrcSwitch();
    const keep = readGrid();          // 网格里的表头文字要跟着语言走，重建前先存内容
    buildGrid(); writeGrid(keep);
    render();
  });
})();
