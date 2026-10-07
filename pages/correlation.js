/* 相关关系探究 —— 拖动数据点，实时观察最佳拟合线、r 与 R²。 */
const chart = $('chart');
const W = 1000, H = 610, M = { left:86, right:38, top:32, bottom:75 };
let original = [], current = [], xKey = '', yKey = '', dragging = null;

function refreshSelectLabels() {
  if (!Object.keys(sheets).length) return;
  const selectedSheet = $('sheetSelect').value;
  setOptions($('sheetSelect'), Object.keys(sheets), selectedSheet, displaySheetName);
  const rows = sheets[selectedSheet] || [];
  const cols = numericColumns(rows);
  setOptions($('xSelect'), cols, xKey, displayVariableName);
  setOptions($('ySelect'), cols, yKey, displayVariableName);
}
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
function render() {
  const t = translations[lang];
  const deleteMode = $('deleteToggle').checked;
  $('hint').className = 'hint' + (deleteMode ? ' danger' : '');
  $('hint').textContent = deleteMode ? t.hint_delete : t.hint_normal;
  const fit = regression(current); $('count').textContent = `${t.count_label}${current.length}`;
  if (fit && $('fitToggle').checked) {
    const sign = fit.intercept >= 0 ? '+' : '−';
    $('equation').textContent = `${t.best_fit_line}: ŷ = ${fit.slope.toFixed(4)}x ${sign} ${Math.abs(fit.intercept).toFixed(4)}`;
    $('metrics').textContent = `r: ${fit.r.toFixed(4)}　|　R²: ${fit.r2.toFixed(4)}　|　${t.slope}: ${fit.slope.toFixed(4)}　|　${t.intercept}: ${fit.intercept.toFixed(4)}`;
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
$('sheetSelect').addEventListener('change', e=>loadSheet(e.target.value));
$('xSelect').addEventListener('change',updateVariables);
$('ySelect').addEventListener('change',updateVariables);
$('fitToggle').addEventListener('change',render);
$('deleteToggle').addEventListener('change',render);
$('resetButton').addEventListener('click',()=>{current=original.map(p=>({...p}));render();});

/* 切到别的页面时清掉拖动状态，避免回来时还黏着上一次的点。 */
document.addEventListener('apstats:tool', () => { dragging = null; });

/* 语言切换时本页要重刷下拉标签并重绘。第一个注册 = 在其它页面之前执行，与改造前一致。 */
onLanguageApply(() => { refreshSelectLabels(); render(); });
applyLang();

function loadWorkbook() {
  const book = (window.APSTATS_DATA || {}).regression?.linearRegression;
  if (!book || !book.sheetNames.length) {
    $('sheetSelect').innerHTML=`<option>${translations[lang].load_error_option}</option>`;
    $('hint').className='hint danger'; $('hint').textContent=translations[lang].load_error_hint;
    document.dispatchEvent(new Event('apstats:error')); return;
  }
  Object.assign(sheets, book.sheets);
  setOptions($('sheetSelect'),book.sheetNames,book.sheetNames[0],displaySheetName); $('sheetSelect').disabled=false; $('xSelect').disabled=false; $('ySelect').disabled=false; loadSheet(book.sheetNames[0]);
  document.dispatchEvent(new Event('apstats:data'));
}
document.addEventListener('DOMContentLoaded', loadWorkbook);
