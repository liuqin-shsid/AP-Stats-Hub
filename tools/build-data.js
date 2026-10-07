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

/* ---------- 主流程 ---------- */
let failed = false;
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
