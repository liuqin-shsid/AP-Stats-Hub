/* AP Stats 小站：无需服务器；数据来自同目录 Excel 文件。 */
const $ = (id) => document.getElementById(id);
const chart = $('chart');
const W = 1000, H = 610, M = { left:86, right:38, top:32, bottom:75 };
let sheets = {}, original = [], current = [], xKey = '', yKey = '', dragging = null;

function numericColumns(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).filter(k => rows.some(r => Number.isFinite(Number(r[k]))));
}
function setOptions(select, values, selection) {
  select.innerHTML = values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  if (selection && values.includes(selection)) select.value = selection;
}
function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function loadSheet(name) {
  const rows = sheets[name] || [];
  const cols = numericColumns(rows);
  setOptions($('xSelect'), cols, cols[0]);
  setOptions($('ySelect'), cols, cols[1] || cols[0]);
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
  const deleteMode = $('deleteToggle').checked;
  $('hint').className = 'hint' + (deleteMode ? ' danger' : '');
  $('hint').textContent = deleteMode ? '删除模式已开启：点击红色数据点即可删除。' : '提示：直接拖动蓝色数据点；开启删除模式后，点击数据点即可删除。';
  const fit = regression(current); $('count').textContent = `数据点：${current.length}`;
  if (fit && $('fitToggle').checked) {
    const sign = fit.intercept >= 0 ? '+' : '−';
    $('equation').textContent = `Best Fit Line: ŷ = ${fit.slope.toFixed(4)}x ${sign} ${Math.abs(fit.intercept).toFixed(4)}`;
    $('metrics').textContent = `R: ${fit.r.toFixed(4)}　|　R²: ${fit.r2.toFixed(4)}　|　Slope: ${fit.slope.toFixed(4)}　|　Intercept: ${fit.intercept.toFixed(4)}`;
  } else { $('equation').textContent = 'Best Fit Line: —'; $('metrics').textContent = current.length < 2 ? '至少需要 2 个数据点进行线性回归。' : '拟合直线已隐藏。'; }
  if (!current.length) { chart.innerHTML = '<text x="500" y="300" text-anchor="middle" class="axis-label">没有数据点，请点击“重置数据”。</text>'; return; }
  const dx=domain(current.map(p=>p.x)), dy=domain(current.map(p=>p.y)); const sx=v=>scale(v,dx,M.left,W-M.right), sy=v=>scale(v,dy,H-M.bottom,M.top);
  let html='';
  ticks(dx[0],dx[1]).forEach(v=>{const x=sx(v); html+=`<line class="grid" x1="${x}" y1="${M.top}" x2="${x}" y2="${H-M.bottom}"/><text class="tick" x="${x}" y="${H-M.bottom+24}" text-anchor="middle">${fmt(v)}</text>`;});
  ticks(dy[0],dy[1]).forEach(v=>{const y=sy(v); html+=`<line class="grid" x1="${M.left}" y1="${y}" x2="${W-M.right}" y2="${y}"/><text class="tick" x="${M.left-12}" y="${y+5}" text-anchor="end">${fmt(v)}</text>`;});
  html+=`<line class="axis" x1="${M.left}" y1="${H-M.bottom}" x2="${W-M.right}" y2="${H-M.bottom}"/><line class="axis" x1="${M.left}" y1="${M.top}" x2="${M.left}" y2="${H-M.bottom}"/>`;
  if (fit && $('fitToggle').checked) { const x1=dx[0],x2=dx[1]; html+=`<line class="fit-line" x1="${sx(x1)}" y1="${sy(fit.slope*x1+fit.intercept)}" x2="${sx(x2)}" y2="${sy(fit.slope*x2+fit.intercept)}"/>`; }
  html+=`<text class="axis-label" x="${(M.left+W-M.right)/2}" y="${H-18}" text-anchor="middle">${escapeHtml(xKey)}</text><text class="axis-label" transform="translate(22 ${(M.top+H-M.bottom)/2}) rotate(-90)" text-anchor="middle">${escapeHtml(yKey)}</text>`;
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
fetch('linear-regression-data.xlsx').then(r=>r.arrayBuffer()).then(buffer=>{
  const book=XLSX.read(buffer,{type:'array'}); book.SheetNames.forEach(name=>{sheets[name]=XLSX.utils.sheet_to_json(book.Sheets[name],{defval:null});});
  setOptions($('sheetSelect'),book.SheetNames,book.SheetNames[0]); $('sheetSelect').disabled=false; $('xSelect').disabled=false; $('ySelect').disabled=false; loadSheet(book.SheetNames[0]);
}).catch(()=>{ $('sheetSelect').innerHTML='<option>数据文件读取失败</option>'; $('hint').className='hint danger'; $('hint').textContent='无法读取数据文件。请确认 linear-regression-data.xlsx 与 index.html 位于同一文件夹。'; });
