/* Independent comparison tool; shares the workbook and language with Correlation Explorer. */
(() => {
  Object.assign(translations.zh, {
    scatter_title:'散点图', scatter_desc:'左右对照原始数据与变换结果，探索平移、缩放与标准化。',
    scatter_reset:'重置调整', scatter_original:'原始数据', scatter_adjusted:'调整后',
    scatter_original_aria:'原始数据散点图', scatter_adjusted_aria:'调整后散点图',
    transform_title:'数据缩放与平移', transform_note:'先平移，再缩放。点击“减去均值”和“乘以标准差倒数”可完成标准化；快捷按钮使用精确值。',
    x_scale:'X 缩放', y_scale:'Y 缩放', x_shift:'X 平移', y_shift:'Y 平移',
    scatter_hint:'左图数据与坐标范围固定；右图坐标轴自动适配变换结果，请对照轴上数值观察变化。',
    scatter_empty:'当前变量没有有效数值配对。',
    mean_label:'均值', sd_label:'样本标准差', sample_note:'标准差使用 n − 1 作为分母；统计量基于当前图中的有效数值配对。',
    subtract_x:'减去 x̄', subtract_y:'减去 ȳ', reciprocal_x:'乘以 1/sₓ', reciprocal_y:'乘以 1/sᵧ',
    no_sd:'点数不足或标准差为 0，无法标准化。',
    standardized_x:'标准化 X（无单位）', standardized_y:'标准化 Y（无单位）',

    undefined_r:'未定义（点数不足或变量为常数）',
  });
  Object.assign(translations.en, {
    scatter_title:'Scatterplot', scatter_desc:'Compare original and transformed data to explore shifting, scaling, and standardization.',
    scatter_reset:'Reset adjustments', scatter_original:'Original data', scatter_adjusted:'Transformed data',
    scatter_original_aria:'Original data scatterplot', scatter_adjusted_aria:'Transformed data scatterplot',
    transform_title:'Scale and shift data', transform_note:'Shift first, then scale. Use the mean and reciprocal standard deviation buttons to standardize. Buttons apply exact values.',
    x_scale:'X scale', y_scale:'Y scale', x_shift:'X shift', y_shift:'Y shift',
    scatter_hint:'The original plot and its axes stay fixed. The transformed plot auto-fits its data; compare the axis values to see the changes.',
    scatter_empty:'No valid numeric pairs for these variables.',
    mean_label:'Mean', sd_label:'Sample standard deviation', sample_note:'Standard deviations use n − 1. Statistics use the valid numeric pairs in each plot.',
    subtract_x:'Subtract x̄', subtract_y:'Subtract ȳ', reciprocal_x:'Multiply by 1/sₓ', reciprocal_y:'Multiply by 1/sᵧ',
    no_sd:'Standardization requires at least two points and a nonzero standard deviation.',
    standardized_x:'Standardized X (unitless)', standardized_y:'Standardized Y (unitless)',

    undefined_r:'undefined (too few points or a constant variable)',
  });
  let activeTool='correlation', points=[], baseX=[-1,1], baseY=[-1,1];
  let originalStats={x:{mean:NaN,sd:NaN},y:{mean:NaN,sd:NaN}};
  let dataReady=false, dataError=false;
  const defaults={scaleX:1, shiftX:0, scaleY:1, shiftY:0};
  const values={...defaults};
  const ids=Object.keys(defaults);
  const slider=(id,key,shortcut)=>`<div class="slider-control"><div class="slider-row"><label for="${id}" data-i18n="${key}"></label><input id="${id}" type="range" min="-3" max="3" step="any" list="${id}Marks" value="${defaults[id]}" disabled><output for="${id}" id="${id}Value"></output></div><datalist id="${id}Marks"></datalist><div class="slider-shortcut"><span id="${id}Target"></span><button id="${id}Shortcut" class="secondary-button" type="button" data-i18n="${shortcut}" disabled></button></div></div>`;
  $('scatterSliders').innerHTML=`
    <fieldset class="slider-group"><legend data-i18n="transform_title"></legend><p class="group-note" data-i18n="transform_note"></p>
      <div class="transform-columns"><div>${slider('shiftX','x_shift','subtract_x')}${slider('scaleX','x_scale','reciprocal_x')}</div>
      <div>${slider('shiftY','y_shift','subtract_y')}${slider('scaleY','y_scale','reciprocal_y')}</div></div>
      <p id="transformFormula" class="transform-formula"></p>
    </fieldset>`;
  ['Original','Adjusted'].forEach(side=>{
    const summary=document.createElement('div');
    summary.id=`scatter${side}Summary`;summary.className='distribution-summary';
    $(`scatter${side}Stats`).after(summary);
  });

  function moments(data,key) {
    if (!data.length) return {mean:NaN,sd:NaN};
    const anchor=data[0][key];
    const mean=anchor+data.reduce((sum,p)=>sum+(p[key]-anchor),0)/data.length;
    const sd=data.length<2?NaN:Math.sqrt(data.reduce((sum,p)=>sum+(p[key]-mean)**2,0)/(data.length-1));
    return {mean,sd};
  }
  function precise(value) {
    if (!Number.isFinite(value)) return '—';
    return Number(value.toPrecision(7)).toString();
  }
  function targetFor(id) {
    const stats=originalStats[id.endsWith('X')?'x':'y'];
    return id.startsWith('shift')?-stats.mean:stats.sd>0?1/stats.sd:NaN;
  }
  function configureSliders() {
    ids.forEach(id=>{
      const axis=id.endsWith('X')?'x':'y', stats=originalStats[axis];
      const data=points.map(p=>p[axis]);
      const span=data.length?Math.max(...data)-Math.min(...data):1;
      const target=targetFor(id);
      const extent=id.startsWith('shift')?Math.max(span*2,Math.abs(stats.mean)*1.2||0,1):Math.max(3,Number.isFinite(target)?target*1.2:0);
      $(id).min=-extent;$(id).max=extent;
      $(id).disabled=!points.length;
      $(`${id}Marks`).innerHTML=`<option value="0" label="0"></option>${Number.isFinite(target)?`<option value="${target}" label="${precise(target)}"></option>`:''}`;
    });
  }

  function showTool(tool) {
    activeTool=tool;
    dragging=null;
    $('correlationPage').hidden=tool!=='correlation';
    $('scatterPage').hidden=tool!=='scatter';
    $('outlierPage').hidden=tool!=='outlier';
    $('linearPage').hidden=tool!=='linear';
    document.querySelectorAll('[data-tool]').forEach(button=>{
      const active=button.dataset.tool===tool;
      button.classList.toggle('active',active);
      if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
    document.title=`AP Stats Hub · ${translations[lang][{scatter:'scatter_title',outlier:'outlier_title',linear:'linear_title',correlation:'heading_title'}[tool]]}`;
    document.dispatchEvent(new CustomEvent('apstats:tool',{detail:tool}));
  }
  document.querySelectorAll('[data-tool]').forEach(button=>button.addEventListener('click',()=>showTool(button.dataset.tool)));

  function numericValue(value) {
    if (value===null || value===undefined || typeof value==='boolean' || (typeof value==='string' && !value.trim())) return NaN;
    return Number(value);
  }
  function columns(rows) {
    return [...new Set(rows.flatMap(row=>Object.keys(row)))].filter(key=>rows.some(row=>Number.isFinite(numericValue(row[key]))));
  }
  function refreshLabels() {
    if (!dataReady) return;
    const sheet=$('scatterSheet').value;
    setOptions($('scatterSheet'),Object.keys(sheets),sheet,displaySheetName);
    const cols=columns(sheets[sheet] || []);
    setOptions($('scatterX'),cols,$('scatterX').value,displayVariableName);
    setOptions($('scatterY'),cols,$('scatterY').value,displayVariableName);
  }
  function selectSheet() {
    const cols=columns(sheets[$('scatterSheet').value] || []);
    setOptions($('scatterX'),cols,cols[0],displayVariableName);
    setOptions($('scatterY'),cols,cols[1] || cols[0],displayVariableName);
    selectVariables();
  }
  function selectVariables() {
    points=(sheets[$('scatterSheet').value] || []).map(row=>({x:numericValue(row[$('scatterX').value]),y:numericValue(row[$('scatterY').value])})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
    originalStats={x:moments(points,'x'),y:moments(points,'y')};
    configureSliders();
    reset();
  }
  function reset() {
    Object.assign(values,defaults);
    ids.forEach(id=>$(id).value=values[id]);
    baseX=points.length?domain(points.map(p=>p.x)):[-1,1];
    baseY=points.length?domain(points.map(p=>p.y)):[-1,1];
    draw();
  }
  function transformed() {
    return points.map(p=>({x:(p.x+values.shiftX)*values.scaleX,y:(p.y+values.shiftY)*values.scaleY}));
  }
  function isStandardized(axis) {
    const s=originalStats[axis.toLowerCase()];
    return s.sd>0 && values[`shift${axis}`]===-s.mean && values[`scale${axis}`]===1/s.sd;
  }
  // Treat floating-point residue around zero as lying on an axis.
  function quadrantClass(p) {
    if(Math.abs(p.x)<=1e-12 || Math.abs(p.y)<=1e-12)return 'quadrant-axis';
    return (p.x>0)===(p.y>0)?'quadrant-same':'quadrant-opposite';
  }
  function drawPlot(id,data,dx,dy,isAdjusted) {
    const svg=$(id), t=translations[lang];
    if (!data.length) { svg.innerHTML=`<text x="310" y="220" text-anchor="middle" class="axis-label">${escapeHtml(dataError?t.load_error_option:!dataReady?t.loading:t.scatter_empty)}</text>`; return; }
    const w=620,h=470,m={left:80,right:24,top:22,bottom:80};
    const sx=v=>scale(v,dx,m.left,w-m.right), sy=v=>scale(v,dy,h-m.bottom,m.top);
    const standardized=isAdjusted && isStandardized('X') && isStandardized('Y');
    let html=`<defs><clipPath id="${id}Clip"><rect x="${m.left}" y="${m.top}" width="${w-m.right-m.left}" height="${h-m.bottom-m.top}"/></clipPath></defs>`;
    ticks(...dx,5).forEach(v=>{const x=sx(v); html+=`<line class="grid" x1="${x}" y1="${m.top}" x2="${x}" y2="${h-m.bottom}"/><text class="tick" x="${x}" y="${h-m.bottom+23}" text-anchor="middle">${fmt(v)}</text>`;});
    ticks(...dy,5).forEach(v=>{const y=sy(v); html+=`<line class="grid" x1="${m.left}" y1="${y}" x2="${w-m.right}" y2="${y}"/><text class="tick" x="${m.left-10}" y="${y+4}" text-anchor="end">${fmt(v)}</text>`;});
    html+=`<path class="axis" fill="none" d="M ${m.left} ${m.top} V ${h-m.bottom} H ${w-m.right}"/>`;
    if(standardized) {
      html+=`<g class="standardized-axes"><line x1="${sx(0)}" x2="${sx(0)}" y1="${m.top}" y2="${h-m.bottom}"/><line x1="${m.left}" x2="${w-m.right}" y1="${sy(0)}" y2="${sy(0)}"/></g>`;
      html+=`<text class="zero-axis-label" x="${sx(0)+7}" y="${m.top+14}">X = 0</text><text class="zero-axis-label" x="${w-m.right-5}" y="${sy(0)-7}" text-anchor="end">Y = 0</text>`;
    }
    const axisLabel=axis=>{
      const s=originalStats[axis.toLowerCase()];
      if(isAdjusted && s.sd>0 && values[`shift${axis}`]===-s.mean && values[`scale${axis}`]===1/s.sd) return t[`standardized_${axis.toLowerCase()}`];
      return displayVariableName($(`scatter${axis}`).value)+(isAdjusted?` (${axis}′)`:'');
    };
    const xLabel=escapeHtml(axisLabel('X')),yLabel=escapeHtml(axisLabel('Y'));
    html+=`<text class="axis-label" x="${(m.left+w-m.right)/2}" y="${h-20}" text-anchor="middle">${xLabel}</text><text class="axis-label" transform="translate(18 ${(m.top+h-m.bottom)/2}) rotate(-90)" text-anchor="middle">${yLabel}</text>`;
    html+=`<g clip-path="url(#${id}Clip)">`;
    data.forEach(p=>{html+=`<circle class="point${isAdjusted?' adjusted-point':''}${standardized?' '+quadrantClass(p):''}" cx="${sx(p.x)}" cy="${sy(p.y)}" r="4.5"><title>X: ${p.x}, Y: ${p.y}</title></circle>`;});
    svg.innerHTML=html+'</g>';
  }
  function draw() {
    const t=translations[lang], right=transformed();
    ids.forEach(id=>{
      const shifting=id.startsWith('shift'), axis=id.endsWith('X')?'x':'y';
      const output=precise(values[id])+(shifting?'':'×');
      $(`${id}Value`).textContent=output;$(id).setAttribute('aria-valuetext',output);
      const symbol=axis==='x'?'x̄':'ȳ', sd=axis==='x'?'sₓ':'sᵧ', target=targetFor(id);
      $(`${id}Target`).textContent=shifting?`${symbol} = ${precise(originalStats[axis].mean)}`:`1/${sd} = ${precise(target)}`;
      const button=$(`${id}Shortcut`);
      button.disabled=!points.length||!Number.isFinite(target);
      button.title=button.disabled?t.no_sd:`${translations[lang][shifting?`subtract_${axis}`:`reciprocal_${axis}`]}: ${precise(target)}`;
      button.setAttribute('aria-pressed',String(Number.isFinite(target)&&values[id]===target));
    });
    const formula=(axis,factor,shift)=>{
      const s=originalStats[axis.toLowerCase()];
      if (s.sd>0 && shift===-s.mean && factor===1/s.sd) return `${axis}′ = (${axis} − ${axis==='X'?'x̄':'ȳ'}) / ${axis==='X'?'sₓ':'sᵧ'}`;
      return `${axis}′ = ${precise(factor)} × (${axis} ${shift<0?'−':'+'} ${precise(Math.abs(shift))})`;
    };
    $('transformFormula').textContent=`${formula('X',values.scaleX,values.shiftX)}　|　${formula('Y',values.scaleY,values.shiftY)}`;
    const stats=data=>{
      const constant=data.length && (data.every(p=>p.x===data[0].x)||data.every(p=>p.y===data[0].y));
      const fit=constant?null:regression(data);
      return `${t.count_label}${data.length}　|　r: ${fit?fit.r.toFixed(4):t.undefined_r}`;
    };
    $('scatterOriginalStats').textContent=stats(points);
    $('scatterAdjustedStats').textContent=stats(right);
    const summary=(data)=>{
      const x=moments(data,'x'), y=moments(data,'y');
      const mean=v=>Math.abs(v)<1e-12?'0':precise(v);
      return `<div>${t.mean_label}: x̄ = ${mean(x.mean)}　|　ȳ = ${mean(y.mean)}</div><div>${t.sd_label}: sₓ = ${precise(x.sd)}　|　sᵧ = ${precise(y.sd)}</div>`;
    };
    $('scatterOriginalSummary').innerHTML=summary(points);
    $('scatterAdjustedSummary').innerHTML=summary(right);
    $('scatterOriginalSummary').title=t.sample_note;
    $('scatterAdjustedSummary').title=t.sample_note;
    $('scatterHint').textContent=dataError?t.load_error_hint:!dataReady?t.loading:t.scatter_hint;
    $('scatterHint').className='hint'+(dataError?' danger':'');
    drawPlot('scatterOriginal',points,baseX,baseY,false);
    drawPlot('scatterAdjusted',right,right.length?domain(right.map(p=>p.x)):baseX,right.length?domain(right.map(p=>p.y)):baseY,true);
  }
  ids.forEach(id=>$(id).addEventListener('input',()=>{values[id]=Number($(id).value);draw();}));
  ids.forEach(id=>$(`${id}Shortcut`).addEventListener('click',()=>{
    const target=targetFor(id);
    if (!Number.isFinite(target)) return;
    values[id]=target;$(id).value=target;draw();
  }));
  $('scatterSheet').addEventListener('change',selectSheet);
  $('scatterX').addEventListener('change',selectVariables);
  $('scatterY').addEventListener('change',selectVariables);
  $('scatterReset').addEventListener('click',reset);
  document.addEventListener('apstats:language',()=>{
    refreshLabels();showTool(activeTool);draw();
    if (dataError) {
      ['sheetSelect','scatterSheet'].forEach(id=>$(id).innerHTML=`<option>${translations[lang].load_error_option}</option>`);
      $('hint').className='hint danger';$('hint').textContent=translations[lang].load_error_hint;
    }
  });
  function initData() {
    dataReady=true;
    setOptions($('scatterSheet'),Object.keys(sheets),Object.keys(sheets)[0],displaySheetName);
    ['scatterSheet','scatterX','scatterY','scatterReset'].forEach(id=>$(id).disabled=false);
    selectSheet();
  }
  document.addEventListener('apstats:data',initData);
  document.addEventListener('apstats:error',()=>{dataError=true;$('scatterSheet').innerHTML=`<option>${translations[lang].load_error_option}</option>`;draw();});
  if (Object.keys(sheets).length) initData();
  applyLang();
})();

