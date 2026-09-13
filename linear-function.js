/* Explore vertical residuals and mean squared residuals with Burger King menu data. */
(() => {
  Object.assign(translations.zh, {
    linear_title:'线性函数',
    linear_desc:'用自己选择的直线观察竖直残差、残差平方与平均残差平方。',
    linear_standardize:'开启标准化模式', linear_reset:'重新选线',
    linear_mean_point:'双均值点 (x̄, ȳ)', linear_equation:'当前直线',
    linear_raw_msr:'原始数据 MSR = Σ(y − ŷ)²/(n − 1)', linear_std_msr:'标准化 MSR = Σ(zᵧ − ẑᵧ)²/(n − 1)',
    linear_metrics_aria:'直线与平均残差平方统计',
    linear_raw_title:'原始数据：脂肪与蛋白质',
    linear_std_title:'标准化数据',
    linear_raw_aria:'汉堡王餐品脂肪和蛋白质散点图',
    linear_std_aria:'标准化脂肪和蛋白质散点图',
    linear_loading:'正在读取汉堡王数据…',
    linear_load_error:'无法读取 burger-king-menu-items.xls。',
    linear_choose_first:'请在图内按住鼠标并拖出一小段，松开后生成完整直线。',
    linear_vertical:'线段太接近竖直，不能表示为 y = a + bx；请横向多拖一些。',
    linear_residuals:'直线已经形成。红色竖线是残差 d；可以在任意位置重新拖出一条直线。',
    linear_snapped:'已吸附到双均值点。残差正方形已经显示；拖动紫色圆环旋转直线，观察 MSR。',
    linear_point:'餐品', linear_fat:'脂肪', linear_protein:'蛋白质',
    linear_mean_label:'双均值点', linear_rotate:'拖动旋转直线',
    linear_msr_wait:'吸附双均值点后显示',
  });
  Object.assign(translations.en, {
    linear_title:'Linear Function',
    linear_desc:'Use a line you choose to explore vertical residuals, residual squares, and their mean.',
    linear_standardize:'Show standardized mode', linear_reset:'Choose a new line',
    linear_mean_point:'Mean point (x̄, ȳ)', linear_equation:'Current line',
    linear_raw_msr:'Raw MSR = Σ(y − ŷ)²/(n − 1)', linear_std_msr:'Standardized MSR = Σ(zᵧ − ẑᵧ)²/(n − 1)',
    linear_metrics_aria:'Line and mean squared residual statistics',
    linear_raw_title:'Raw data: fat and protein',
    linear_std_title:'Standardized data',
    linear_raw_aria:'Burger King menu fat and protein scatterplot',
    linear_std_aria:'Standardized fat and protein scatterplot',
    linear_loading:'Loading Burger King data…',
    linear_load_error:'Could not read burger-king-menu-items.xls.',
    linear_choose_first:'Press and drag a short segment anywhere in the plot; release to create the full line.',
    linear_vertical:'That segment is too close to vertical for y = a + bx. Drag farther sideways.',
    linear_residuals:'The line is drawn. Red vertical segments are residuals d. Drag anywhere to replace it with another line.',
    linear_snapped:'Snapped to the mean point. Residual squares are shown. Drag the purple ring to rotate the line and watch MSR.',
    linear_point:'Item', linear_fat:'Fat', linear_protein:'Protein',
    linear_mean_label:'Mean point', linear_rotate:'Drag to rotate the line',
    linear_msr_wait:'shown after snapping to mean point',
  });

  const rawSvg=$('linearRawChart'), stdSvg=$('linearStdChart');
  const size={w:620,h:500,m:{left:70,right:20,top:25,bottom:66}};
  let data=[], stats=null, line=null, loadState='loading', rotate=null, drawing=null;
  let rawDomains={x:[0,1],y:[0,1]}, stdDomains={x:[-1,1],y:[-1,1]};

  const meanSd=(values)=>{
    const mean=values.reduce((sum,value)=>sum+value,0)/values.length;
    const sd=Math.sqrt(values.reduce((sum,value)=>sum+(value-mean)**2,0)/(values.length-1));
    return {mean,sd};
  };
  const compact=value=>Number.isFinite(value)?Number(value.toPrecision(6)).toString():'—';
  const safeDomain=values=>{
    let d=domain(values);
    const span=d[1]-d[0];
    return [d[0]-span*.02,d[1]+span*.02];
  };
  const standardized=()=>data.map(p=>({...p,x:(p.x-stats.x.mean)/stats.x.sd,y:(p.y-stats.y.mean)/stats.y.sd}));
  const standardizedLine=()=>line?{
    slope:line.slope*stats.x.sd/stats.y.sd,
    intercept:(line.intercept+line.slope*stats.x.mean-stats.y.mean)/stats.y.sd,
    snapped:line.snapped,
  }:null;
  const quadrantClass=p=>Math.abs(p.x)<=1e-12||Math.abs(p.y)<=1e-12?'quadrant-axis':(p.x>0)===(p.y>0)?'quadrant-same':'quadrant-opposite';
  const msr=(points,currentLine)=>points.reduce((sum,p)=>sum+(p.y-(currentLine.intercept+currentLine.slope*p.x))**2,0)/(points.length-1);
  const lineEquation=currentLine=>{
    if(!currentLine)return '—';
    const sign=currentLine.intercept<0?'−':'+';
    return `ŷ = ${compact(currentLine.slope)}x ${sign} ${compact(Math.abs(currentLine.intercept))}`;
  };
  function updateHint(kind,name='') {
    const t=translations[lang];
    $('linearHint').textContent=(t[kind]||'').replace('{name}',name);
  }
  function updateMetrics() {
    const t=translations[lang];
    $('linearMean').textContent=stats&&line?.snapped?`(${compact(stats.x.mean)}, ${compact(stats.y.mean)})`:'—';
    $('linearEquation').textContent=lineEquation(line);
    $('linearRawMsr').textContent=line?.snapped?compact(msr(data,line)):t.linear_msr_wait;
    const zLine=standardizedLine();
    $('linearStdMsr').textContent=zLine?.snapped?compact(msr(standardized(),zLine)):t.linear_msr_wait;
  }
  function rotationHandle(currentLine,dx,dy,standard) {
    if(!currentLine?.snapped)return null;
    const cx=standard?0:stats.x.mean;
    const cy=standard?0:stats.y.mean;
    const maxDx=(dx[1]-dx[0])*.30;
    const yLimited=Math.abs(currentLine.slope)>1e-12?(dy[1]-dy[0])*.30/Math.abs(currentLine.slope):maxDx;
    const delta=Math.max((dx[1]-dx[0])*.08,Math.min(maxDx,yLimited));
    return {cx,cy,x:cx+delta,y:cy+currentLine.slope*delta};
  }
  function drawChart(svg,points,dx,dy,currentLine,{standard=false}={}) {
    const {w,h,m}=size,t=translations[lang];
    const sx=value=>scale(value,dx,m.left,w-m.right),sy=value=>scale(value,dy,h-m.bottom,m.top);
    const clip=`${svg.id}Clip`;
    let html=`<defs><clipPath id="${clip}"><rect x="${m.left}" y="${m.top}" width="${w-m.right-m.left}" height="${h-m.bottom-m.top}"/></clipPath></defs>`;
    ticks(dx[0],dx[1],6).forEach(v=>{const x=sx(v);html+=`<line class="grid" x1="${x}" y1="${m.top}" x2="${x}" y2="${h-m.bottom}"/><text class="tick" x="${x}" y="${h-m.bottom+23}" text-anchor="middle">${fmt(v)}</text>`;});
    ticks(dy[0],dy[1],6).forEach(v=>{const y=sy(v);html+=`<line class="grid" x1="${m.left}" y1="${y}" x2="${w-m.right}" y2="${y}"/><text class="tick" x="${m.left-10}" y="${y+5}" text-anchor="end">${fmt(v)}</text>`;});
    html+=`<path class="axis" fill="none" d="M ${m.left} ${m.top} V ${h-m.bottom} H ${w-m.right}"/>`;
    if(standard){
      html+=`<line class="zero-line" x1="${sx(0)}" x2="${sx(0)}" y1="${m.top}" y2="${h-m.bottom}"/><line class="zero-line" x1="${m.left}" x2="${w-m.right}" y1="${sy(0)}" y2="${sy(0)}"/>`;
    }
    if(currentLine){
      html+=`<g clip-path="url(#${clip})">`;
      if(currentLine.snapped){
        points.forEach((p,index)=>{
          const predicted=currentLine.intercept+currentLine.slope*p.x;
          const side=Math.abs(sy(p.y)-sy(predicted));
          const x=sx(p.x),y=Math.min(sy(p.y),sy(predicted));
          const squareX=x+side<=w-m.right?x:x-side;
          html+=`<rect class="residual-square" x="${squareX}" y="${y}" width="${side}" height="${side}"><title>d² = ${compact((p.y-predicted)**2)}</title></rect>`;
        });
      }
      points.forEach(p=>{
        const predicted=currentLine.intercept+currentLine.slope*p.x;
        html+=`<line class="residual-line" x1="${sx(p.x)}" x2="${sx(p.x)}" y1="${sy(p.y)}" y2="${sy(predicted)}"><title>d = ${compact(p.y-predicted)}</title></line>`;
      });
      html+=`<line class="student-line" x1="${sx(dx[0])}" y1="${sy(currentLine.intercept+currentLine.slope*dx[0])}" x2="${sx(dx[1])}" y2="${sy(currentLine.intercept+currentLine.slope*dx[1])}"/></g>`;
    }
    if(currentLine?.snapped){
      const mean=standard?{x:0,y:0}:{x:stats.x.mean,y:stats.y.mean};
      html+=`<rect class="linear-mean-point" x="${sx(mean.x)-6}" y="${sy(mean.y)-6}" width="12" height="12" transform="rotate(45 ${sx(mean.x)} ${sy(mean.y)})"><title>${t.linear_mean_label}: (${compact(mean.x)}, ${compact(mean.y)})</title></rect>`;
    }
    points.forEach((p,index)=>{
      const classes=['linear-data-point'];
      if(standard)classes.push(quadrantClass(p));
      const name=escapeHtml(p.name);
      html+=`<circle class="${classes.join(' ')}" cx="${sx(p.x)}" cy="${sy(p.y)}" r="5.5"><title>${t.linear_point}: ${name}; X (${t.linear_fat}) = ${compact(p.x)}, Y (${t.linear_protein}) = ${compact(p.y)}</title></circle>`;
    });
    const handle=rotationHandle(currentLine,dx,dy,standard);
    if(handle){
      html+=`<line class="rotation-handle-arm" x1="${sx(handle.cx)}" y1="${sy(handle.cy)}" x2="${sx(handle.x)}" y2="${sy(handle.y)}"/><circle class="rotation-handle" data-role="rotate" cx="${sx(handle.x)}" cy="${sy(handle.y)}" r="10" tabindex="0"><title>${t.linear_rotate}</title></circle>`;
    }
    html+=`<text class="linear-axis-title" x="${(m.left+w-m.right)/2}" y="${h-18}" text-anchor="middle">${standard?'z Fat / z 脂肪':`${t.linear_fat} (g)`}</text><text class="linear-axis-title" transform="translate(17 ${(m.top+h-m.bottom)/2}) rotate(-90)" text-anchor="middle">${standard?'z Protein / z 蛋白质':`${t.linear_protein} (g)`}</text>`;
    svg.innerHTML=html;
  }
  function renderLinear() {
    const t=translations[lang];
    if(loadState!=='ready'){
      const message=loadState==='error'?t.linear_load_error:t.linear_loading;
      [rawSvg,stdSvg].forEach(svg=>svg.innerHTML=`<text class="linear-empty" x="310" y="245" text-anchor="middle">${escapeHtml(message)}</text>`);
      $('linearHint').textContent=message;updateMetrics();return;
    }
    rawDomains={x:safeDomain(data.map(p=>p.x)),y:safeDomain(data.map(p=>p.y))};
    const z=standardized();
    stdDomains={x:safeDomain(z.map(p=>p.x).concat(0)),y:safeDomain(z.map(p=>p.y).concat(0))};
    drawChart(rawSvg,data,rawDomains.x,rawDomains.y,line);
    if($('linearStandardize').checked)drawChart(stdSvg,z,stdDomains.x,stdDomains.y,standardizedLine(),{standard:true});
    updateMetrics();
  }
  function pointerData(event,svg,domains) {
    const matrix=svg.getScreenCTM();if(!matrix)return null;
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    return {x:scale(p.x,[size.m.left,size.w-size.m.right],domains.x[0],domains.x[1]),y:scale(p.y,[size.h-size.m.bottom,size.m.top],domains.y[0],domains.y[1])};
  }
  function finishDrawing(standard,start,end) {
    const domains=standard?stdDomains:rawDomains;
    if(Math.abs(end.x-start.x)<(domains.x[1]-domains.x[0])*.015){updateHint('linear_vertical');renderLinear();return;}
    let slope=(end.y-start.y)/(end.x-start.x),intercept=start.y-slope*start.x;
    const nearMean=standard
      ? Math.abs(intercept)<=.03*(stdDomains.y[1]-stdDomains.y[0])
      : Math.abs(intercept+slope*stats.x.mean-stats.y.mean)<=.03*(rawDomains.y[1]-rawDomains.y[0]);
    if(standard){
      const rawSlope=slope*stats.y.sd/stats.x.sd;
      const rawIntercept=stats.y.mean+stats.y.sd*intercept-rawSlope*stats.x.mean;
      slope=rawSlope;intercept=rawIntercept;
    }
    if(nearMean)intercept=stats.y.mean-slope*stats.x.mean;
    line={slope,intercept,snapped:nearMean};
    updateHint(nearMean?'linear_snapped':'linear_residuals');renderLinear();
  }
  [rawSvg,stdSvg].forEach((svg,chartIndex)=>{
    svg.addEventListener('pointerdown',event=>{
      if(loadState!=='ready')return;
      event.preventDefault();
      if(event.target.closest('[data-role="rotate"]')&&line?.snapped){
        rotate={pointer:event.pointerId,standard:chartIndex===1};svg.setPointerCapture(event.pointerId);return;
      }
      const standard=chartIndex===1,domains=standard?stdDomains:rawDomains,start=pointerData(event,svg,domains);
      if(!start)return;
      drawing={pointer:event.pointerId,standard,start,end:start};
      const draft=document.createElementNS('http://www.w3.org/2000/svg','line');
      const matrix=svg.getScreenCTM(),local=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
      draft.setAttribute('class','drawing-line');draft.setAttribute('x1',local.x);draft.setAttribute('y1',local.y);draft.setAttribute('x2',local.x);draft.setAttribute('y2',local.y);svg.appendChild(draft);
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove',event=>{
      if(rotate&&rotate.pointer===event.pointerId){
        const domains=rotate.standard?stdDomains:rawDomains,p=pointerData(event,svg,domains);
        if(!p)return;
        const center=rotate.standard?{x:0,y:0}:{x:stats.x.mean,y:stats.y.mean};
        if(Math.abs(p.x-center.x)<(domains.x[1]-domains.x[0])*.015)return;
        let slope=(p.y-center.y)/(p.x-center.x);
        if(rotate.standard)slope=slope*stats.y.sd/stats.x.sd;
        line={slope,intercept:stats.y.mean-slope*stats.x.mean,snapped:true};
        updateHint('linear_snapped');renderLinear();return;
      }
      if(!drawing||drawing.pointer!==event.pointerId)return;
      const domains=drawing.standard?stdDomains:rawDomains,p=pointerData(event,svg,domains);
      if(!p)return;
      drawing.end=p;
      const matrix=svg.getScreenCTM(),local=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
      const draft=svg.querySelector('.drawing-line');if(draft){draft.setAttribute('x2',local.x);draft.setAttribute('y2',local.y);}
    });
    svg.addEventListener('pointerup',event=>{
      if(rotate&&rotate.pointer===event.pointerId){
        rotate=null;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);return;
      }
      if(!drawing||drawing.pointer!==event.pointerId)return;
      const completed=drawing;drawing=null;
      if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
      const domains=completed.standard?stdDomains:rawDomains,end=pointerData(event,svg,domains)||completed.end;
      const dx=(end.x-completed.start.x)/(domains.x[1]-domains.x[0]),dy=(end.y-completed.start.y)/(domains.y[1]-domains.y[0]);
      if(Math.hypot(dx,dy)<.015){renderLinear();return;}
      finishDrawing(completed.standard,completed.start,end);
    });
    svg.addEventListener('pointercancel',()=>{rotate=null;drawing=null;renderLinear();});
  });
  $('linearStandardize').addEventListener('change',()=>{
    const on=$('linearStandardize').checked;
    $('linearStdPanel').hidden=!on;$('linearStdMetric').hidden=!on;
    document.querySelector('.linear-metrics').classList.toggle('standardized',on);
    $('linearCharts').classList.toggle('standardized',on);renderLinear();
  });
  $('linearReset').addEventListener('click',()=>{line=null;rotate=null;drawing=null;updateHint('linear_choose_first');renderLinear();});
  document.addEventListener('apstats:language',()=>{
    if(loadState==='ready'){
      if(line?.snapped)updateHint('linear_snapped');else if(line)updateHint('linear_residuals');else updateHint('linear_choose_first');
    }
    renderLinear();
  });
  fetch('burger-king-menu-items.xls').then(response=>{
    if(!response.ok)throw new Error('Data request failed');return response.arrayBuffer();
  }).then(buffer=>{
    const book=XLSX.read(buffer,{type:'array'}),sheet=book.Sheets['第二节数据'];
    if(!sheet)throw new Error('Lesson 2 sheet missing');
    const rows=XLSX.utils.sheet_to_json(sheet,{defval:null});
    data=rows.map((row,index)=>({id:index+1,name:String(row['餐品名称']||''),x:Number(row['脂肪（g）']),y:Number(row['蛋白质（g）'])})).filter(p=>p.name&&Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(data.length<2)throw new Error('Not enough numeric rows');
    stats={x:meanSd(data.map(p=>p.x)),y:meanSd(data.map(p=>p.y))};
    loadState='ready';updateHint('linear_choose_first');renderLinear();
  }).catch(()=>{loadState='error';renderLinear();});
  applyLang();
})();
