#!/usr/bin/env node
/*
 * build-data.js —— 把 Excel 数据转成网页可直接 <script> 加载的 JS 文件。
 *
 * 为什么要这一步：
 *   浏览器在 file:// 协议下（也就是直接双击 index.html 打开时）会拒绝 fetch()
 *   读取本地文件。把数据预先转成 JS，网页就不再需要 fetch，双击即可使用，
 *   同时也不再依赖任何 CDN。
 *
 * 怎么用：
 *   1. 改完 data/source/ 里的 Excel 文件
 *   2. 在仓库根目录执行：  npm run build:data
 *   3. data/ 下的 .js 会被重新生成，刷新网页即可
 *
 * 加新数据集：在下面的 MANIFEST 里加一条即可。
 */
'use strict';
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* ---------- 清单：bundle 名 -> 若干数据源 ---------- */
const MANIFEST = {
  // 线性回归教学用到的两份数据
  regression: [
    { key: 'linearRegression', file: 'data/source/linear-regression-data.xlsx' },
    { key: 'burgerKing',       file: 'data/source/burger-king-menu-items.xls', sheets: ['第二节数据'] },
  ],
};

/* 分类数据集单独处理：需要把 Excel 里的代号翻成课堂上用的中英文标签，
   描述写在 tools/datasets.categorical.js。 */
const CATEGORICAL = require('./datasets.categorical.js');

/* ---------- 工具 ---------- */
function readWorkbook(relPath, onlySheets) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) throw new Error(`找不到数据源：${relPath}`);
  const book = XLSX.read(fs.readFileSync(abs), { type: 'buffer' });
  const names = onlySheets ? book.SheetNames.filter(n => onlySheets.includes(n)) : book.SheetNames;
  const missing = (onlySheets || []).filter(n => !book.SheetNames.includes(n));
  if (missing.length) throw new Error(`${relPath} 缺少工作表：${missing.join('、')}`);

  const sheets = {};
  for (const name of names) {
    sheets[name] = XLSX.utils.sheet_to_json(book.Sheets[name], { defval: null });
  }
  return { sheetNames: names, sheets };
}

function build(bundle, sources) {
  const payload = {};
  let rowCount = 0;
  for (const src of sources) {
    const wb = readWorkbook(src.file, src.sheets);
    payload[src.key] = wb;
    for (const n of wb.sheetNames) rowCount += wb.sheets[n].length;
    console.log(`  ✓ ${src.file}  工作表 ${wb.sheetNames.length} 个`);
  }

  const body = JSON.stringify(payload, null, 0);
  const out =
    `/* 本文件由 tools/build-data.js 自动生成，请勿手改。\n` +
    `   数据源见 data/source/，改完 Excel 后执行： npm run build:data */\n` +
    `window.APSTATS_DATA = window.APSTATS_DATA || {};\n` +
    `window.APSTATS_DATA.${bundle} = ${body};\n`;

  const dest = path.join(ROOT, 'data', `${bundle}.js`);
  fs.writeFileSync(dest, out, 'utf8');
  console.log(`  → data/${bundle}.js  (${(out.length / 1024).toFixed(0)} KB, 共 ${rowCount} 行)\n`);
}

/* ---------- 分类数据集 ---------- */
/* 行用「取值在 levels 里的下标」编码，既紧凑又保证顺序稳定。
   任何一个取值不在 levels 里（含空值）的整行丢弃，并打印出来以免悄悄丢数据。 */
function buildCategorical() {
  const sets = {}, order = [];
  let failed = false;

  for (const cfg of CATEGORICAL) {
    const abs = path.join(ROOT, cfg.file);
    if (!fs.existsSync(abs)) { console.error(`  \u2717 找不到 ${cfg.file}`); failed = true; continue; }
    const book = XLSX.read(fs.readFileSync(abs), { type: 'buffer' });
    const rawRows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: null });

    const index = cfg.columns.map(c => new Map(c.levels.map((l, i) => [String(l.v), i])));
    const rows = [];
    let dropped = 0;
    for (const raw of rawRows) {
      const encoded = cfg.columns.map((c, ci) => {
        const cell = raw[c.key];
        return cell === null || cell === undefined ? -1 : (index[ci].get(String(cell)) ?? -1);
      });
      if (encoded.includes(-1)) { dropped++; continue; }
      rows.push(encoded);
    }

    // 未在 levels 中声明的取值要报出来，否则会被静默丢掉
    for (const [ci, c] of cfg.columns.entries()) {
      const seen = new Set(rawRows.map(r => r[c.key]).filter(v => v !== null && v !== undefined).map(String));
      const unknown = [...seen].filter(v => !index[ci].has(v));
      if (unknown.length) { console.error(`  \u2717 ${cfg.id}.${c.key} 有未声明的取值：${unknown.join('、')}`); failed = true; }
    }

    sets[cfg.id] = {
      name: cfg.name, note: cfg.note, n: rows.length,
      columns: cfg.columns.map(c => ({ key: c.key, name: c.name, levels: c.levels.map(l => ({ zh: l.zh, en: l.en })) })),
      rows,
    };
    order.push(cfg.id);
    console.log(`  \u2713 ${cfg.file}  ${rows.length} 行` + (dropped ? `（丢弃 ${dropped} 行缺失值）` : ''));
  }

  const out =
    `/* 本文件由 tools/build-data.js 自动生成，请勿手改。\n` +
    `   数据源见 data/source/，改完 Excel 后执行： npm run build:data */\n` +
    `window.APSTATS_DATA = window.APSTATS_DATA || {};\n` +
    `window.APSTATS_DATA.display = ${JSON.stringify({ categorical: { order, sets } })};\n`;
  fs.writeFileSync(path.join(ROOT, 'data', 'display.js'), out, 'utf8');
  console.log(`  \u2192 data/display.js  (${(out.length / 1024).toFixed(0)} KB)\n`);
  return failed;
}

/* ---------- 主流程 ---------- */
let failed = false;
console.log('[display · 分类数据]');
if (buildCategorical()) failed = true;

for (const [bundle, sources] of Object.entries(MANIFEST)) {
  console.log(`[${bundle}]`);
  try {
    build(bundle, sources);
  } catch (err) {
    failed = true;
    console.error(`  ✗ ${err.message}\n`);
  }
}
process.exit(failed ? 1 : 0);
