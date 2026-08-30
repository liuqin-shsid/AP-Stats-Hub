/* AP Stats 小站：双语支持 + 列名 & Sheet 名称翻译（带容错） */
const $ = (id) => document.getElementById(id);
const chart = $('chart');
const W = 1000, H = 610, M = { left:86, right:38, top:32, bottom:75 };
let sheets = {}, original = [], current = [], xKey = '', yKey = '', dragging = null;

// ---------- 多语言词库 ----------
const LANG = {
    zh: {
        brand: 'AP Stats 小站',
        subtitle: '统计学习互动工具',
        sidebarTitle: '学习工具',
        navItem: '线性回归教学',
        pageTitle: '线性回归教学',
        pageDesc: '拖动数据点，观察最佳拟合线、相关系数与 R² 的变化。',
        selectCase: '选择案例',
        xVariable: 'X 变量',
        yVariable: 'Y 变量',
        showFitLine: '显示拟合直线',
        deleteMode: '删除模式',
        resetData: '重置数据',
        loadingData: '正在读取数据…',
        hintDefault: '提示：直接拖动蓝色数据点；开启删除模式后，点击数据点即可删除。',
        hintDelete: '删除模式已开启：点击红色数据点即可删除。',
        noData: '没有数据点，请点击“重置数据”。',
        countPrefix: '数据点：',
        equationPrefix: '最佳拟合直线: ',
        metricsR: 'R',
        metricsR2: 'R²',
        metricsSlope: '斜率',
        metricsIntercept: '截距',
        metricsAtLeast: '至少需要 2 个数据点进行线性回归。',
        fitHidden: '拟合直线已隐藏。',
        footerCopyright: '© 2026',
        footerEmail: 'liuqin@shsid.org'
    },
    en: {
        brand: 'AP Stats Hub',
        subtitle: 'Interactive Learning Tool',
        sidebarTitle: 'Learning Tools',
        navItem: 'Linear Regression',
        pageTitle: 'Linear Regression',
        pageDesc: 'Drag data points to observe changes in best-fit line, correlation coefficient and R².',
        selectCase: 'Select Dataset',
        xVariable: 'X Variable',
        yVariable: 'Y Variable',
        showFitLine: 'Show Fit Line',
        deleteMode: 'Delete Mode',
        resetData: 'Reset Data',
        loadingData: 'Loading data…',
        hintDefault: 'Hint: drag blue points; turn on Delete Mode to remove points.',
        hintDelete: 'Delete Mode ON: click red points to delete.',
        noData: 'No data points. Click "Reset Data".',
        countPrefix: 'Data points: ',
        equationPrefix: 'Best Fit Line: ',
        metricsR: 'R',
        metricsR2: 'R²',
        metricsSlope: 'Slope',
        metricsIntercept: 'Intercept',
        metricsAtLeast: 'At least 2 data points needed for linear regression.',
        fitHidden: 'Fit line hidden.',
        footerCopyright: '© 2026',
        footerEmail: 'liuqin@shsid.org'
    }
};

// ---------- Excel 列名中英对照 ----------
const COLUMN_MAP = {
    '海拔高度 (m)': { zh: '海拔高度 (m)', en: 'Elevation (m)' },
    '气温 (°C)': { zh: '气温 (°C)', en: 'Temperature (°C)' },
    '冰淇淋销量 (件/周)': { zh: '冰淇淋销量 (件/周)', en: 'Ice Cream Sales (units/week)' },
    '空调销量 (台/周)': { zh: '空调销量 (台/周)', en: 'Air Conditioner Sales (units/week)' },
    '年龄 (岁)': { zh: '年龄 (岁)', en: 'Age (years)' },
    '握力 (kg)': { zh: '握力 (kg)', en: 'Grip Strength (kg)' },
    '血液酒精浓度 (%)': { zh: '血液酒精浓度 (%)', en: 'Blood Alcohol Concentration (%)' },
    '反应时间 (秒)': { zh: '反应时间 (秒)', en: 'Reaction Time (seconds)' },
    '身高 (cm)': { zh: '身高 (cm)', en: 'Height (cm)' },
    '体重 (kg)': { zh: '体重 (kg)', en: 'Weight (kg)' },
    '鞋码 (码)': { zh: '鞋码 (码)', en: 'Shoe Size (US)' },
    '平均学分绩点 (GPA)': { zh: '平均学分绩点 (GPA)', en: 'GPA' },
    '每周计算机使用时长 (小时)': { zh: '每周计算机使用时长 (小时)', en: 'Weekly Computer Use (hours)' },
    '学习效果综合评分': { zh: '学习效果综合评分', en: 'Learning Effect Score' },
    '每周学习时长 (小时)': { zh: '每周学习时长 (小时)', en: 'Study Hours (hours/week)' },
    '期末考试成绩 (分)': { zh: '期末考试成绩 (分)', en: 'Final Exam Score (points)' },
    '性别': { zh: '性别', en: 'Gender' }
};

// ---------- Excel Sheet 名称中英对照 ----------
const SHEET_MAP = {
    '1.海拔-气温': { zh: '1.海拔-气温', en: '1. Elevation-Temperature' },
    '2.冰淇淋-空调销量': { zh: '2.冰淇淋-空调销量', en: '2. Ice Cream-Air Conditioner Sales' },
    '3.年龄-握力': { zh: '3.年龄-握力', en: '3. Age-Grip Strength' },
    '4.酒精浓度-反应时间': { zh: '4.酒精浓度-反应时间', en: '4. Alcohol Concentration-Reaction Time' },
    '5.身高-体重': { zh: '5.身高-体重', en: '5. Height-Weight' },
    '身高-体重分析': { zh: '身高-体重分析', en: 'Height-Weight Analysis' },
    '6.鞋码-GPA': { zh: '6.鞋码-GPA', en: '6. Shoe Size-GPA' },
    '7.计算机使用-学习效果': { zh: '7.计算机使用-学习效果', en: '7. Computer Use-Learning Effect' },
    '8.学习时长-考试成绩': { zh: '8.学习时长-考试成绩', en: '8. Study Hours-Exam Scores' }
};

// ---------- 获取翻译（带容错：忽略空格差异） ----------
function getTranslation(map, key, lang) {
    let result = map[key]?.[lang];
    if (!result) {
        // 去除所有空格后再尝试匹配
        const normalized = key.replace(/\s/g, '');
        for (const [k, v] of Object.entries(map)) {
            if (k.replace(/\s/g, '') === normalized) {
                result = v[lang];
                break;
            }
        }
    }
    return result || key;
}

function getColumnName(key) {
    return getTranslation(COLUMN_MAP, key, currentLang);
}

function getSheetDisplayName(key) {
    return getTranslation(SHEET_MAP, key, currentLang);
}

let currentLang = 'zh';

// ---------- 核心切换函数 ----------
function switchLanguage(lang) {
    currentLang = lang;
    // 更新所有 data-i18n 静态元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (LANG[lang][key]) {
            el.textContent = LANG[lang][key];
        }
    });
    // 切换按钮文字
    document.getElementById('langToggle').textContent = lang === 'zh' ? 'English' : '中文';
    // 刷新所有下拉菜单显示（Sheet名和列名）
    refreshAllSelects();
    // 重新渲染图表（轴标签、统计信息等）
    render();
}

// 刷新所有下拉菜单的显示文本（不改变选中值）
function refreshAllSelects() {
    const selects = [$('sheetSelect'), $('xSelect'), $('ySelect')];
    selects.forEach(sel => {
        const options = sel.options;
        for (let i = 0; i < options.length; i++) {
            const val = options[i].value;
            const displayFn = sel.id === 'sheetSelect' ? getSheetDisplayName : getColumnName;
            options[i].text = displayFn(val);
        }
    });
}

// ---------- 原有功能函数（修改） ----------
function numericColumns(rows) {
    if (!rows.length) return [];
    return Object.keys(rows[0]).filter(k => rows.some(r => Number.isFinite(Number(r[k]))));
}

function setOptions(select, values, selection) {
    const isSheet = select.id === 'sheetSelect';
    const displayFn = isSheet ? getSheetDisplayName : getColumnName;
    select.innerHTML = values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(displayFn(v))}</option>`).join('');
    if (selection && values.includes(selection)) select.value = selection;
}

function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }

function loadSheet(name) {
    const rows = sheets[name] || [];
    const cols = numericColumns(rows);
    setOptions($('xSelect'), cols, cols[0]);
    setOptions($('ySelect'), cols, cols[1] || cols[0]);
    xKey = $('xSelect').value;
    yKey = $('ySelect').value;
    original = rows.map(r => ({ x: Number(r[xKey]), y: Number(r[yKey]) })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    current = original.map(p => ({ ...p }));
    render();
}

function updateVariables() {
    xKey = $('xSelect').value;
    yKey = $('ySelect').value;
    const rows = sheets[$('sheetSelect').value] || [];
    original = rows.map(r => ({ x: Number(r[xKey]), y: Number(r[yKey]) })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    current = original.map(p => ({ ...p }));
    render();
}

function regression(points) {
    const n = points.length;
    if (n < 2) return null;
    const mx = points.reduce((s, p) => s + p.x, 0) / n,
        my = points.reduce((s, p) => s + p.y, 0) / n;
    let sxx = 0, syy = 0, sxy = 0;
    points.forEach(p => { const dx = p.x - mx, dy = p.y - my;
        sxx += dx * dx; syy += dy * dy; sxy += dx * dy; });
    if (!sxx || !syy) return null;
    const slope = sxy / sxx, intercept = my - slope * mx, r = sxy / Math.sqrt(sxx * syy);
    return { slope, intercept, r, r2: r * r };
}

function domain(values) { let lo = Math.min(...values), hi = Math.max(...values); if (lo === hi) { lo -= 1; hi += 1; } const pad = (hi - lo) * .1; return [lo - pad, hi + pad]; }
function scale(v, d, a, b) { return a + (v - d[0]) * (b - a) / (d[1] - d[0]); }
function fmt(v) { const a = Math.abs(v); return a >= 1000 ? v.toFixed(0) : a >= 10 ? v.toFixed(2) : v.toFixed(3); }
function ticks(lo, hi, count = 6) { return Array.from({ length: count }, (_, i) => lo + (hi - lo) * i / (count - 1)); }

function render() {
    const deleteMode = $('deleteToggle').checked;
    const hintEl = $('hint');
    if (deleteMode) {
        hintEl.className = 'hint danger';
        hintEl.textContent = LANG[currentLang].hintDelete;
    } else {
        hintEl.className = 'hint';
        hintEl.textContent = LANG[currentLang].hintDefault;
    }

    const fit = regression(current);
    $('count').textContent = LANG[currentLang].countPrefix + current.length;

    const eqEl = $('equation');
    const metEl = $('metrics');
    if (fit && $('fitToggle').checked) {
        const sign = fit.intercept >= 0 ? '+' : '−';
        eqEl.textContent = LANG[currentLang].equationPrefix + `ŷ = ${fit.slope.toFixed(4)}x ${sign} ${Math.abs(fit.intercept).toFixed(4)}`;
        metEl.textContent = `${LANG[currentLang].metricsR}: ${fit.r.toFixed(4)}　|　${LANG[currentLang].metricsR2}: ${fit.r2.toFixed(4)}　|　${LANG[currentLang].metricsSlope}: ${fit.slope.toFixed(4)}　|　${LANG[currentLang].metricsIntercept}: ${fit.intercept.toFixed(4)}`;
    } else {
        eqEl.textContent = LANG[currentLang].equationPrefix + '—';
        metEl.textContent = current.length < 2 ? LANG[currentLang].metricsAtLeast : LANG[currentLang].fitHidden;
    }

    if (!current.length) {
        chart.innerHTML = `<text x="500" y="300" text-anchor="middle" class="axis-label">${LANG[currentLang].noData}</text>`;
        return;
    }

    const dx = domain(current.map(p => p.x)), dy = domain(current.map(p => p.y));
    const sx = v => scale(v, dx, M.left, W - M.right), sy = v => scale(v, dy, H - M.bottom, M.top);

    let html = '';
    ticks(dx[0], dx[1]).forEach(v => { const x = sx(v);
        html += `<line class="grid" x1="${x}" y1="${M.top}" x2="${x}" y2="${H-M.bottom}"/><text class="tick" x="${x}" y="${H-M.bottom+24}" text-anchor="middle">${fmt(v)}</text>`; });
    ticks(dy[0], dy[1]).forEach(v => { const y = sy(v);
        html += `<line class="grid" x1="${M.left}" y1="${y}" x2="${W-M.right}" y2="${y}"/><text class="tick" x="${M.left-12}" y="${y+5}" text-anchor="end">${fmt(v)}</text>`; });
    html += `<line class="axis" x1="${M.left}" y1="${H-M.bottom}" x2="${W-M.right}" y2="${H-M.bottom}"/><line class="axis" x1="${M.left}" y1="${M.top}" x2="${M.left}" y2="${H-M.bottom}"/>`;

    if (fit && $('fitToggle').checked) {
        const x1 = dx[0], x2 = dx[1];
        html += `<line class="fit-line" x1="${sx(x1)}" y1="${sy(fit.slope*x1+fit.intercept)}" x2="${sx(x2)}" y2="${sy(fit.slope*x2+fit.intercept)}"/>`;
    }

    // 轴标签使用翻译后的列名
    html += `<text class="axis-label" x="${(M.left+W-M.right)/2}" y="${H-18}" text-anchor="middle">${escapeHtml(getColumnName(xKey))}</text>
             <text class="axis-label" transform="translate(22 ${(M.top+H-M.bottom)/2}) rotate(-90)" text-anchor="middle">${escapeHtml(getColumnName(yKey))}</text>`;

    current.forEach((p, i) => html += `<circle class="point${deleteMode?' delete':''}" data-index="${i}" cx="${sx(p.x)}" cy="${sy(p.y)}" r="6"/>`);
    chart.innerHTML = html;

    chart.querySelectorAll('.point').forEach(el => el.addEventListener('mousedown', event => {
        event.preventDefault(); event.stopPropagation();
        const i = Number(el.dataset.index);
        if ($('deleteToggle').checked) { current.splice(i, 1); render(); return; }
        dragging = { i, dx, dy };
    }));
}

function pointerToData(event) { const r = chart.getBoundingClientRect(); return { px: (event.clientX - r.left) * W / r.width, py: (event.clientY - r.top) * H / r.height }; }

chart.addEventListener('mousemove', event => { if (!dragging) return; const p = pointerToData(event);
    current[dragging.i].x = scale(p.px, [M.left, W - M.right], dragging.dx[0], dragging.dx[1]);
    current[dragging.i].y = scale(p.py, [H - M.bottom, M.top], dragging.dy[0], dragging.dy[1]);
    render(); });
window.addEventListener('mouseup', () => dragging = null);

// 事件绑定
$('sheetSelect').addEventListener('change', e => loadSheet(e.target.value));
$('xSelect').addEventListener('change', updateVariables);
$('ySelect').addEventListener('change', updateVariables);
$('fitToggle').addEventListener('change', render);
$('deleteToggle').addEventListener('change', render);
$('resetButton').addEventListener('click', () => { current = original.map(p => ({ ...p })); render(); });

// 语言切换
document.getElementById('langToggle').addEventListener('click', function() {
    const nextLang = currentLang === 'zh' ? 'en' : 'zh';
    switchLanguage(nextLang);
});

// 读取 Excel
fetch('linear-regression-data.xlsx').then(r => r.arrayBuffer()).then(buffer => {
    const book = XLSX.read(buffer, { type: 'array' });
    book.SheetNames.forEach(name => { sheets[name] = XLSX.utils.sheet_to_json(book.Sheets[name], { defval: null }); });
    setOptions($('sheetSelect'), book.SheetNames, book.SheetNames[0]);
    $('sheetSelect').disabled = false;
    $('xSelect').disabled = false;
    $('ySelect').disabled = false;
    loadSheet(book.SheetNames[0]);
    // 初始化为中文
    switchLanguage('zh');
}).catch(() => {
    $('sheetSelect').innerHTML = '<option>数据文件读取失败</option>';
    $('hint').className = 'hint danger';
    $('hint').textContent = '无法读取数据文件。请确认 linear-regression-data.xlsx 与 index.html 位于同一文件夹。';
});