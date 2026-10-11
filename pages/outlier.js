/* A blank drawing canvas independent of the Excel-based tools. */
(() => {
  Object.assign(translations.zh, {
    outlier_title:'异常值点', outlier_desc:'自由添加、移动和删除数据点，观察异常值对均值、标准差和相关关系的影响。',
    outlier_undo:'撤销上一步', outlier_clear:'清空数据点', outlier_fit:'显示最佳拟合线',
    outlier_hint:'点击坐标区域空白处添加点；再次点击已有点删除；按住点拖动可移动，拖动结束不会删除。',
    outlier_mean_x:'X 均值 x̄', outlier_mean_y:'Y 均值 ȳ', outlier_sd_x:'X 样本标准差 sₓ', outlier_sd_y:'Y 样本标准差 sᵧ',
    outlier_r:'相关系数 r', outlier_stats_aria:'实时统计量', outlier_chart_aria:'可添加、删除和拖动数据点的坐标图',
    outlier_empty:'点击坐标区域，添加第一个数据点', outlier_none:'暂无数据。',
    outlier_single:'样本标准差、r 和 R² 至少需要两个点。',
    outlier_constant:'X 或 Y 为常数，r 和 R² 未定义。',
    outlier_note:'样本标准差 s = √[Σ(值 − 均值)² / (n − 1)]；R² = r²。',
    outlier_point:'数据点', outlier_keyboard:'点击或按 Delete / Enter 删除；方向键移动。',
    outlier_import:'导入数据', outlier_xy:'X / Y 变量',
    outlier_imported:'已从 {f} 读入 {n} 个点。坐标轴改为跟着数据走，照样可以拖动和删除。点「清空数据点」回到空白的 0–20 网格。',
    outlier_need2:'这个文件至少要有两列数值。',
    outlier_readfail:'读取失败：{e}',
  });
  Object.assign(translations.en, {
    outlier_title:'Outliers', outlier_desc:'Add, move, and remove points to explore how outliers affect means, standard deviations, and correlation.',
    outlier_undo:'Undo', outlier_clear:'Clear points', outlier_fit:'Show best fit line',
    outlier_hint:'Click empty plot space to add a point. Click an existing point to remove it. Drag a point to move it; releasing a drag does not delete it.',
    outlier_mean_x:'X mean x̄', outlier_mean_y:'Y mean ȳ', outlier_sd_x:'X sample standard deviation sₓ', outlier_sd_y:'Y sample standard deviation sᵧ',
    outlier_r:'Correlation r', outlier_stats_aria:'Live statistics', outlier_chart_aria:'Coordinate plot for adding, deleting, and dragging points',
    outlier_empty:'Click inside the plot to add your first point', outlier_none:'No data yet.',
    outlier_single:'Sample standard deviations, r, and R² require at least two points.',
    outlier_constant:'X or Y is constant; r and R² are undefined.',
    outlier_note:'Sample standard deviation s = √[Σ(value − mean)² / (n − 1)]; R² = r².',
    outlier_point:'Point', outlier_keyboard:'Click or press Delete / Enter to remove; use arrow keys to move.',
    outlier_import:'Import data', outlier_xy:'X / Y variable',
    outlier_imported:'Loaded {n} points from {f}. The axes now follow the data; drag and delete still work. "Clear points" returns to the blank 0–20 grid.',
    outlier_need2:'That file needs at least two numeric columns.',
    outlier_readfail:'Could not read the file: {e}',
  });
  const svg=$('outlierChart'), bounds={left:86,right:962,top:32,bottom:535};
  let points=[], history=[], gesture=null, nextId=1;
  /* 手画模式下两轴固定 0–20（便于对照每次添加和移动的影响）；
     导入文件后改成跟着数据走，否则真实数据会被全部压到边界上。 */
  const HAND=[0,20], HAND_STEP=2;
  let dx=[...HAND], dy=[...HAND], dxStep=HAND_STEP, dyStep=HAND_STEP, axisName={x:'X',y:'Y'};
  const copy=()=>points.map(p=>({...p}));
  const remember=state=>{history.push(state);if(history.length>50)history.shift();};
  const clampTo=(v,d)=>Math.max(d[0],Math.min(d[1],v));
  /* 刻度步长是整数就不显示小数位 —— 空白模式要和原来一样是 0 / 2 / 4 … */
  const decimals=st=>Number.isInteger(st)?0:st>=1?1:Math.min(4,Math.ceil(-Math.log10(st))+1);
  const roundTo=(v,d,st)=>{const k=Math.pow(10,decimals(st)+1);return Math.round(clampTo(v,d)*k)/k;};
  const sx=x=>scale(x,dx,bounds.left,bounds.right);
  const sy=y=>scale(y,dy,bounds.bottom,bounds.top);
  const number=v=>v===null?'—':Number(v.toPrecision(7)).toString();

  function statistics() {
    const n=points.length;
    if(!n)return {n,mx:null,my:null,sdx:null,sdy:null,r:null,r2:null,b0:null,b1:null};
    const mx=points[0].x+points.reduce((s,p)=>s+p.x-points[0].x,0)/n;
    const my=points[0].y+points.reduce((s,p)=>s+p.y-points[0].y,0)/n;
    let xx=0,yy=0,xy=0;
    points.forEach(p=>{const x=p.x-mx,y=p.y-my;xx+=x*x;yy+=y*y;xy+=x*y;});
    const constantX=points.every(p=>p.x===points[0].x),constantY=points.every(p=>p.y===points[0].y);
    const r=n<2||constantX||constantY?null:Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy)));
    const b1=n<2||constantX?null:xy/xx,b0=b1===null?null:my-b1*mx;
    return {n,mx,my,sdx:n<2?null:constantX?0:Math.sqrt(xx/(n-1)),sdy:n<2?null:constantY?0:Math.sqrt(yy/(n-1)),r,r2:r===null?null:r*r,b0,b1};
  }
  function renderOutliers() {
    const t=translations[lang],s=statistics();
    Object.entries({MeanX:s.mx,MeanY:s.my,SdX:s.sdx,SdY:s.sdy,R:s.r,R2:s.r2}).forEach(([id,value])=>$(`outlier${id}`).textContent=number(value));
    $('outlierFitStats').hidden=!$('outlierFit').checked;
    $('outlierFitStats').textContent=`b₀ = ${number(s.b0)}　b₁ = ${number(s.b1)}`;
    $('outlierClear').disabled=!points.length;$('outlierUndo').disabled=!history.length;
    $('outlierStatus').textContent=`${t.count_label}${s.n}　${!s.n?t.outlier_none:s.n<2?t.outlier_single:s.r===null?t.outlier_constant:t.outlier_note}`;
    let html=`<rect x="${bounds.left}" y="${bounds.top}" width="${bounds.right-bounds.left}" height="${bounds.bottom-bounds.top}" fill="#fff" stroke="#e4e9ee"/>`;
    html+=`<path class="axis" fill="none" d="M ${bounds.left} ${bounds.top} V ${bounds.bottom} H ${bounds.right}"/>`;
    const dX=decimals(dxStep), dY=decimals(dyStep);
    for(let v=dx[0];v<=dx[1]+1e-9;v+=dxStep)
      html+=`<line class="axis" x1="${sx(v)}" x2="${sx(v)}" y1="${bounds.bottom}" y2="${bounds.bottom+5}"/><text class="tick" x="${sx(v)}" y="${bounds.bottom+25}" text-anchor="middle">${v.toFixed(dX)}</text>`;
    for(let v=dy[0];v<=dy[1]+1e-9;v+=dyStep)
      html+=`<line class="axis" x1="${bounds.left-5}" x2="${bounds.left}" y1="${sy(v)}" y2="${sy(v)}"/><text class="tick" x="${bounds.left-14}" y="${sy(v)+5}" text-anchor="end">${v.toFixed(dY)}</text>`;
    html+=`<text class="axis-label" x="524" y="592" text-anchor="middle">${escapeHtml(axisName.x)}</text><text class="axis-label" transform="translate(24 284) rotate(-90)" text-anchor="middle">${escapeHtml(axisName.y)}</text>`;
    if($('outlierFit').checked&&s.b1!==null){
      html+=`<defs><clipPath id="outlierFitClip"><rect x="${bounds.left}" y="${bounds.top}" width="${bounds.right-bounds.left}" height="${bounds.bottom-bounds.top}"/></clipPath></defs><line class="outlier-fit-line" clip-path="url(#outlierFitClip)" x1="${sx(dx[0])}" y1="${sy(s.b0+s.b1*dx[0])}" x2="${sx(dx[1])}" y2="${sy(s.b0+s.b1*dx[1])}"/>`;
    }
    if(!points.length)html+=`<text class="outlier-empty" x="524" y="248" text-anchor="middle">${escapeHtml(t.outlier_empty)}</text>`;
    points.forEach(p=>{
      const label=`${t.outlier_point} ${p.id}: X = ${p.x}, Y = ${p.y}. ${t.outlier_keyboard}`;
      html+=`<circle class="point outlier-point" data-id="${p.id}" cx="${sx(p.x)}" cy="${sy(p.y)}" r="8" tabindex="0" role="button" aria-label="${escapeHtml(label)}"><title>X: ${p.x}, Y: ${p.y}</title></circle>`;
    });
    svg.innerHTML=html;
  }
  function position(event) {
    // Invert the SVG matrix so clicks stay accurate even with viewBox letterboxing.
    const matrix=svg.getScreenCTM();if(!matrix)return null;
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    return {x:roundTo(scale(p.x,[bounds.left,bounds.right],dx[0],dx[1]),dx,dxStep),y:roundTo(scale(p.y,[bounds.bottom,bounds.top],dy[0],dy[1]),dy,dyStep),inside:p.x>=bounds.left&&p.x<=bounds.right&&p.y>=bounds.top&&p.y<=bounds.bottom};
  }
  svg.addEventListener('pointerdown',event=>{
    if(event.button!==0||gesture)return;
    const p=position(event),point=event.target.closest('.outlier-point');
    if(!p||(!p.inside&&!point))return;
    event.preventDefault();
    gesture={pointer:event.pointerId,id:point?Number(point.dataset.id):null,startX:event.clientX,startY:event.clientY,moved:false,before:copy()};
    svg.setPointerCapture(event.pointerId);
  });
  function move(event) {
    if(!gesture||event.pointerId!==gesture.pointer)return;
    if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>5)gesture.moved=true;
    if(gesture.moved&&gesture.id!==null){
      const p=position(event),target=points.find(p=>p.id===gesture.id);
      if(p&&target){target.x=p.x;target.y=p.y;renderOutliers();}
    }
  }
  svg.addEventListener('pointermove',move);
  svg.addEventListener('pointerup',event=>{
    if(!gesture||event.pointerId!==gesture.pointer)return;
    move(event);
    const g=gesture,p=position(event);gesture=null;
    if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
    if(g.id!==null){
      if(!g.moved){remember(g.before);points=points.filter(p=>p.id!==g.id);}
      else if(JSON.stringify(points)!==JSON.stringify(g.before))remember(g.before);
    }else if(!g.moved&&p?.inside){remember(g.before);points.push({id:nextId++,x:p.x,y:p.y});}
    renderOutliers();
  });
  function cancel() {
    if(!gesture)return;
    const g=gesture;gesture=null;points=g.before;
    if(svg.hasPointerCapture(g.pointer))svg.releasePointerCapture(g.pointer);
    renderOutliers();
  }
  svg.addEventListener('pointercancel',cancel);
  svg.addEventListener('lostpointercapture',cancel);
  window.addEventListener('blur',cancel);
  document.addEventListener('apstats:tool',event=>{if(event.detail!=='outlier')cancel();});
  svg.addEventListener('keydown',event=>{
    const target=event.target.closest('.outlier-point');if(!target)return;
    const id=Number(target.dataset.id),p=points.find(p=>p.id===id);if(!p)return;
    if(!['Delete','Backspace','Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();remember(copy());
    if(['Delete','Backspace','Enter',' '].includes(event.key))points=points.filter(p=>p.id!==id);
    else {p.x=rounded(p.x+(event.key==='ArrowRight'?.1:event.key==='ArrowLeft'?-.1:0));p.y=rounded(p.y+(event.key==='ArrowUp'?.1:event.key==='ArrowDown'?-.1:0));}
    renderOutliers();svg.querySelector(`[data-id="${id}"]`)?.focus();
  });
  /* ---------- 导入 Excel / CSV ---------- */
  let sheetRows=null;
  const numericCols=rows=>[...new Set(rows.flatMap(r=>Object.keys(r)))]
    .filter(k=>rows.filter(r=>Number.isFinite(Number(r[k]))&&String(r[k]).trim()!=='').length>=2);
  /* 轴域取数据范围外扩 5%，再向外对齐到「好看的刻度」，这样刻度不会是 3.7142 这种 */
  /* 轴域：数据范围外扩 5%，再向外对齐到「好看的刻度」。
     上界用 ceil 而不是「下界 + 10 格」，否则右边会空出一大截。 */
  function niceDomain(values){
    let lo=Math.min(...values), hi=Math.max(...values);
    if(lo===hi){lo-=1;hi+=1;}
    const pad=(hi-lo)*0.05; lo-=pad; hi+=pad;
    const raw=(hi-lo)/8, pow=Math.pow(10,Math.floor(Math.log10(raw)));
    const step=[1,2,2.5,5,10].map(m=>m*pow).find(st=>raw<=st)||10*pow;
    return [Math.floor(lo/step)*step, Math.ceil(hi/step)*step, step];
  }
  function applyImport(fileName){
    const t=translations[lang];
    const xk=$('outlierX').value, yk=$('outlierY').value;
    const pairs=sheetRows.map(r=>({x:Number(r[xk]),y:Number(r[yk])}))
                         .filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(!pairs.length){alert(t.outlier_need2);return;}
    cancel();
    remember(copy());
    const [xlo,xhi,xst]=niceDomain(pairs.map(p=>p.x));
    const [ylo,yhi,yst]=niceDomain(pairs.map(p=>p.y));
    dx=[xlo,xhi];dxStep=xst;dy=[ylo,yhi];dyStep=yst;
    axisName={x:displayVariableName(xk),y:displayVariableName(yk)};
    points=pairs.map(p=>({id:nextId++,x:roundTo(p.x,dx,dxStep),y:roundTo(p.y,dy,dyStep)}));
    renderOutliers();
    if(fileName) $('outlierStatus').textContent=
      t.outlier_imported.replace('{n}',points.length).replace('{f}',fileName);
  }
  $('outlierFile').addEventListener('change',e=>{
    const file=e.target.files[0]; if(!file)return;
    const t=translations[lang];
    const fr=new FileReader();
    fr.onload=()=>{
      try{
        const book=XLSX.read(new Uint8Array(fr.result),{type:'array'});
        sheetRows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:null});
        const cols=numericCols(sheetRows);
        if(cols.length<2){alert(t.outlier_need2);return;}
        setOptions($('outlierX'),cols,cols[0],displayVariableName);
        setOptions($('outlierY'),cols,cols[1],displayVariableName);
        $('outlierCols').hidden=false;
        applyImport(file.name);
      }catch(err){alert(t.outlier_readfail.replace('{e}',err.message));}
    };
    fr.onerror=()=>alert(t.outlier_readfail.replace('{e}',fr.error));
    fr.readAsArrayBuffer(file);
  });
  $('outlierX').addEventListener('change',()=>applyImport());
  $('outlierY').addEventListener('change',()=>applyImport());

  $('outlierUndo').addEventListener('click',()=>{cancel();if(history.length)points=history.pop();renderOutliers();});
  $('outlierClear').addEventListener('click',()=>{
    cancel();
    if(points.length){remember(copy());points=[];}
    dx=[...HAND];dy=[...HAND];dxStep=HAND_STEP;dyStep=HAND_STEP;axisName={x:'X',y:'Y'};   // 回到手画模式的固定 0–20
    $('outlierFile').value='';$('outlierCols').hidden=true;
    renderOutliers();
  });
  $('outlierFit').addEventListener('change',renderOutliers);
  document.addEventListener('apstats:language',renderOutliers);
  applyLang();
})();

