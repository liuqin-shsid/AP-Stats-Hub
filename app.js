/* AP Stats Hub：无需服务器；数据来自同目录 Excel 文件。 */
const $ = (id) => document.getElementById(id);
const chart = $('chart');
const W = 1000, H = 610, M = { left:86, right:38, top:32, bottom:75 };
let sheets = {}, original = [], current = [], xKey = '', yKey = '', dragging = null;

// 英文界面中，Excel 的案例名和变量名也会显示为对应英文；数据本身保持不变。
const englishSheetNames = {
  '1.海拔-气温': '1. Altitude–Temperature',
  '2.冰淇淋-空调销量': '2. Ice Cream–Air Conditioner Sales',
  '3.年龄-握力': '3. Age–Grip Strength',
  '4.酒精浓度-反应时间': '4. Blood Alcohol Concentration–Reaction Time',
  '5.身高-体重': '5. Height–Weight',
  '身高-体重分析': 'Height–Weight Analysis',
  '6.鞋码-GPA': '6. Shoe Size–GPA',
  '7.计算机使用-学习效果': '7. Computer Use–Learning Outcomes',
  '8.学习时长-考试成绩': '8. Study Time–Exam Score',
};
const englishVariableNames = {
  '性别': 'Gender', '海拔高度 (m)': 'Altitude (m)', '气温 (°C)': 'Temperature (°C)',
  '冰淇淋销量 (件/周)': 'Ice Cream Sales (units/week)', '空调销量 (台/周)': 'Air Conditioner Sales (units/week)',
  '年龄 (岁)': 'Age (years)', '握力 (kg)': 'Grip Strength (kg)',
  '血液酒精浓度 (%)': 'Blood Alcohol Concentration (%)', '反应时间 (秒)': 'Reaction Time (seconds)',
  '身高 (cm)': 'Height (cm)', '体重 (kg)': 'Weight (kg)', '身高（in)': 'Height (in)', '体重（lb)': 'Weight (lb)',
  '鞋码 (码)': 'Shoe Size', '平均学分绩点 (GPA)': 'Grade Point Average (GPA)',
  '每周计算机使用时长 (小时)': 'Weekly Computer Use (hours)', '学习效果综合评分': 'Learning Outcome Score',
  '每周学习时长 (小时)': 'Weekly Study Time (hours)', '期末考试成绩 (分)': 'Final Exam Score',
  'zx': 'Standardized Height (zx)', 'zy': 'Standardized Weight (zy)', 'Unnamed: 7': 'Product of z-scores',
};

const translations = {
  zh: {
    brand: 'AP Stats Hub',
    sidebar_title: '学习工具',
    nav_linreg: '线性回归教学',
    heading_title: '相关关系探究',
    heading_desc: '拖动数据点，观察最佳拟合线、相关系数与 R² 的变化。',
    label_sheet: '选择案例',
    label_x: 'X 变量',
    label_y: 'Y 变量',
    label_fit: '显示拟合直线',
    label_delete: '删除模式',
    label_reset: '重置数据',
    hint_normal: '提示：直接拖动蓝色数据点；开启删除模式后，点击数据点即可删除。',
    hint_delete: '删除模式已开启：点击红色数据点即可删除。',
    count_label: '数据点：',
    metrics_need_points: '至少需要 2 个数据点进行线性回归。',
    metrics_hidden: '拟合直线已隐藏。',
    loading: '正在读取数据…',
    load_error_option: '数据文件读取失败',
    load_error_hint: '无法读取数据文件。请确认 linear-regression-data.xlsx 与 index.html 位于同一文件夹。',
    lang_button: 'EN',
    empty_chart: '没有数据点，请点击“重置数据”。',
    controls_aria: '控制面板',
    chart_aria: '互动散点图',
    best_fit_line: '最佳拟合直线',
    slope: '斜率',
    intercept: '截距',
  },
  en: {
    brand: 'AP Stats Hub',
    sidebar_title: 'Learning tools',
    nav_linreg: 'Linear Regression',
    heading_title: 'Correlation Explorer',
    heading_desc: 'Drag the data points and watch the best-fit line, correlation, and R² update live.',
    label_sheet: 'Select dataset',
    label_x: 'X variable',
    label_y: 'Y variable',
    label_fit: 'Show best-fit line',
    label_delete: 'Delete mode',
    label_reset: 'Reset data',
    hint_normal: 'Tip: drag the blue points directly; turn on delete mode to click a point and remove it.',
    hint_delete: 'Delete mode is on: click a red point to remove it.',
    count_label: 'Data points: ',
    metrics_need_points: 'At least 2 data points are needed for linear regression.',
    metrics_hidden: 'Best-fit line hidden.',
    loading: 'Loading data…',
    load_error_option: 'Failed to load data file',
    load_error_hint: 'Could not read the data file. Make sure linear-regression-data.xlsx is in the same folder as index.html.',
    lang_button: '中文',
    empty_chart: 'No data points — click "Reset data".',
    controls_aria: 'Controls',
    chart_aria: 'Interactive scatterplot',
    best_fit_line: 'Best-Fit Line',
    slope: 'Slope',
    intercept: 'Intercept',
  },
};
let lang = localStorage.getItem('apstats-lang') || 'zh';
function applyLang() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  const t = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => { if (t[el.dataset.i18n] !== undefined) el.textContent = t[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { if (t[el.dataset.i18nAria] !== undefined) el.setAttribute('aria-label', t[el.dataset.i18nAria]); });
  document.title = `AP Stats Hub · ${t.heading_title}`;
  $('langToggle').textContent = t.lang_button;
  refreshSelectLabels();
  render();
  document.dispatchEvent(new Event('apstats:language'));
}
function setLang(l) { lang = l; localStorage.setItem('apstats-lang', l); applyLang(); }
$('langToggle').addEventListener('click', () => setLang(lang === 'zh' ? 'en' : 'zh'));

function numericColumns(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).filter(k => rows.some(r => Number.isFinite(Number(r[k]))));
}
function displaySheetName(name) { return lang === 'en' ? (englishSheetNames[name] || name) : name; }
function displayVariableName(name) {
  if (lang !== 'en') return name;
  // SheetJS may add _1, _2 to repeated Excel headers; retain the English base label.
  const base = name.replace(/_\d+$/, '');
  return englishVariableNames[name] || englishVariableNames[base] || name;
}
function setOptions(select, values, selection, labeler = v => v) {
  select.innerHTML = values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(labeler(v))}</option>`).join('');
  if (selection && values.includes(selection)) select.value = selection;
}
function refreshSelectLabels() {
  if (!Object.keys(sheets).length) return;
  const selectedSheet = $('sheetSelect').value;
  setOptions($('sheetSelect'), Object.keys(sheets), selectedSheet, displaySheetName);
  const rows = sheets[selectedSheet] || [];
  const cols = numericColumns(rows);
  setOptions($('xSelect'), cols, xKey, displayVariableName);
  setOptions($('ySelect'), cols, yKey, displayVariableName);
}
function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function loadSheet(name) {
  const rows = sheets[name] || [];
  const cols = numericColumns(rows);
  setOptions($('xSelect'), cols, cols[0], displayVariableName);
  setOptions($('ySelect'), cols, cols[1] || cols[0], displayVariableName);
  xKey = $('xSelect').value; yKey = $('ySelect').value;
  original = rows.map(r => ({ x:Number(r[xKey]), y:Number(r[yKey]) })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  current = original.map(p => ({...p})); render();
}
function updateVariables() {
  xKey = $('xSelect').value; yKey = $('ySelect').value;
  const rows = sheets[$('sheetSelect').value] || [];
  original = rows.map(r => ({ x:Number(r[xKey]), y:Number(r[yKey]) })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  current = original.map(p => ({...p})); render();
}
function regression(points) {
  const n = points.length; if (n < 2) return null;
  const mx = points.reduce((s,p)=>s+p.x,0)/n, my = points.reduce((s,p)=>s+p.y,0)/n;
  let sxx=0, syy=0, sxy=0; points.forEach(p=>{const dx=p.x-mx, dy=p.y-my; sxx+=dx*dx; syy+=dy*dy; sxy+=dx*dy;});
  if (!sxx || !syy) return null;
  const slope=sxy/sxx, intercept=my-slope*mx, r=sxy/Math.sqrt(sxx*syy);
  return {slope, intercept, r, r2:r*r};
}
function domain(values) { let lo=Math.min(...values), hi=Math.max(...values); if (lo===hi) { lo-=1; hi+=1; } const pad=(hi-lo)*.1; return [lo-pad,hi+pad]; }
function scale(v, d, a, b) { return a+(v-d[0])*(b-a)/(d[1]-d[0]); }
function fmt(v) { const a=Math.abs(v); return a>=1000 ? v.toFixed(0) : a>=10 ? v.toFixed(2) : v.toFixed(3); }
function ticks(lo, hi, count=6) { return Array.from({length:count},(_,i)=>lo+(hi-lo)*i/(count-1)); }
function render() {
  const t = translations[lang];
  const deleteMode = $('deleteToggle').checked;
  $('hint').className = 'hint' + (deleteMode ? ' danger' : '');
  $('hint').textContent = deleteMode ? t.hint_delete : t.hint_normal;
  const fit = regression(current); $('count').textContent = `${t.count_label}${current.length}`;
  if (fit && $('fitToggle').checked) {
    const sign = fit.intercept >= 0 ? '+' : '−';
    $('equation').textContent = `${t.best_fit_line}: ŷ = ${fit.slope.toFixed(4)}x ${sign} ${Math.abs(fit.intercept).toFixed(4)}`;
    $('metrics').textContent = `R: ${fit.r.toFixed(4)}　|　R²: ${fit.r2.toFixed(4)}　|　${t.slope}: ${fit.slope.toFixed(4)}　|　${t.intercept}: ${fit.intercept.toFixed(4)}`;
  } else { $('equation').textContent = `${t.best_fit_line}: —`; $('metrics').textContent = current.length < 2 ? t.metrics_need_points : t.metrics_hidden; }
  if (!current.length) { chart.innerHTML = `<text x="500" y="300" text-anchor="middle" class="axis-label">${escapeHtml(t.empty_chart)}</text>`; return; }
  const dx=domain(current.map(p=>p.x)), dy=domain(current.map(p=>p.y)); const sx=v=>scale(v,dx,M.left,W-M.right), sy=v=>scale(v,dy,H-M.bottom,M.top);
  let html='';
  ticks(dx[0],dx[1]).forEach(v=>{const x=sx(v); html+=`<line class="grid" x1="${x}" y1="${M.top}" x2="${x}" y2="${H-M.bottom}"/><text class="tick" x="${x}" y="${H-M.bottom+24}" text-anchor="middle">${fmt(v)}</text>`;});
  ticks(dy[0],dy[1]).forEach(v=>{const y=sy(v); html+=`<line class="grid" x1="${M.left}" y1="${y}" x2="${W-M.right}" y2="${y}"/><text class="tick" x="${M.left-12}" y="${y+5}" text-anchor="end">${fmt(v)}</text>`;});
  html+=`<line class="axis" x1="${M.left}" y1="${H-M.bottom}" x2="${W-M.right}" y2="${H-M.bottom}"/><line class="axis" x1="${M.left}" y1="${M.top}" x2="${M.left}" y2="${H-M.bottom}"/>`;
  if (fit && $('fitToggle').checked) { const x1=dx[0],x2=dx[1]; html+=`<line class="fit-line" x1="${sx(x1)}" y1="${sy(fit.slope*x1+fit.intercept)}" x2="${sx(x2)}" y2="${sy(fit.slope*x2+fit.intercept)}"/>`; }
  html+=`<text class="axis-label" x="${(M.left+W-M.right)/2}" y="${H-18}" text-anchor="middle">${escapeHtml(displayVariableName(xKey))}</text><text class="axis-label" transform="translate(22 ${(M.top+H-M.bottom)/2}) rotate(-90)" text-anchor="middle">${escapeHtml(displayVariableName(yKey))}</text>`;
  current.forEach((p,i)=>html+=`<circle class="point${deleteMode?' delete':''}" data-index="${i}" cx="${sx(p.x)}" cy="${sy(p.y)}" r="6"/>`); chart.innerHTML=html;
  chart.querySelectorAll('.point').forEach(el=>el.addEventListener('mousedown', event=> {
    event.preventDefault(); event.stopPropagation(); const i=Number(el.dataset.index);
    if ($('deleteToggle').checked) { current.splice(i,1); render(); return; }
    dragging={i, dx, dy};
  }));
}
function pointerToData(event) { const r=chart.getBoundingClientRect(); return { px:(event.clientX-r.left)*W/r.width, py:(event.clientY-r.top)*H/r.height }; }
chart.addEventListener('mousemove', event=>{ if(!dragging) return; const p=pointerToData(event); current[dragging.i].x=scale(p.px,[M.left,W-M.right],dragging.dx[0],dragging.dx[1]); current[dragging.i].y=scale(p.py,[H-M.bottom,M.top],dragging.dy[0],dragging.dy[1]); render(); });
window.addEventListener('mouseup', ()=>dragging=null);
$('sheetSelect').addEventListener('change', e=>loadSheet(e.target.value)); $('xSelect').addEventListener('change',updateVariables); $('ySelect').addEventListener('change',updateVariables); $('fitToggle').addEventListener('change',render); $('deleteToggle').addEventListener('change',render); $('resetButton').addEventListener('click',()=>{current=original.map(p=>({...p}));render();});
applyLang();
fetch('linear-regression-data.xlsx').then(r=>r.arrayBuffer()).then(buffer=>{
  const book=XLSX.read(buffer,{type:'array'}); book.SheetNames.forEach(name=>{sheets[name]=XLSX.utils.sheet_to_json(book.Sheets[name],{defval:null});});
  setOptions($('sheetSelect'),book.SheetNames,book.SheetNames[0],displaySheetName); $('sheetSelect').disabled=false; $('xSelect').disabled=false; $('ySelect').disabled=false; loadSheet(book.SheetNames[0]);
  document.dispatchEvent(new Event('apstats:data'));
}).catch(()=>{ $('sheetSelect').innerHTML=`<option>${translations[lang].load_error_option}</option>`; $('hint').className='hint danger'; $('hint').textContent=translations[lang].load_error_hint; document.dispatchEvent(new Event('apstats:error')); });
