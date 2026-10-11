/* 比较分布（Ch5）用的数据：一个定量变量 + 一个把它分成若干组的分类变量。
   levels 的顺序 = 图表与表格里的组顺序。
   displays 可选 'box' 并排箱线图、'hist' 同刻度直方图、'stem' 背靠背茎叶图；
   背靠背茎叶图只能放两组（茎在中间、叶往两边），组数超过 2 就别写 'stem'。 */
'use strict';

const num = v => (v === null || v === undefined || v === '') ? null
               : (Number.isFinite(Number(v)) ? Number(v) : null);

module.exports = [
  {
    id: 'populationGrowth',
    file: 'data/source/Ch05_Population_growth.xls',
    name: { zh: '各州人口增长率', en: 'State Population Growth' },
    displays: ['box', 'hist', 'stem'],
    note: { zh: '教材 Ch5 · 48 个州，按地区分成两组', en: 'Textbook Ch5 · 48 states in two regions' },
    variable: { zh: '人口增长率 (%)', en: 'Percent Change (%)' },
    groupName: { zh: '地区', en: 'Region' },
    value: r => num(r['Percent Change']),
    group: r => r['Region'],
    levels: [
      { v: 'NE/MW', zh: '东北 / 中西部', en: 'Northeast & Midwest' },
      { v: 'S/W',   zh: '南部 / 西部',   en: 'South & West' },
    ],
  },
  {
    id: 'baseball',
    file: 'data/source/Ch05_Baseball.xls',
    name: { zh: '棒球队场均得分', en: 'Baseball Runs per Game' },
    displays: ['box', 'hist', 'stem'],
    note: { zh: '教材 Ch5 · 30 支球队，按联盟分成两组', en: 'Textbook Ch5 · 30 teams in two leagues' },
    variable: { zh: '场均得分', en: 'Average Runs per Game' },
    groupName: { zh: '联盟', en: 'League' },
    value: r => num(r['Avg Runs']),
    group: r => r['League'],
    levels: [
      { v: 'American', zh: '美国联盟', en: 'American League' },
      { v: 'National', zh: '国家联盟', en: 'National League' },
    ],
  },
  {
    id: 'stereograms',
    file: 'data/source/Ch05_Stereograms.xls',
    name: { zh: '立体图的融合时间', en: 'Stereogram Fusion Time' },
    displays: ['box', 'hist', 'stem'],
    note: { zh: '教材 Ch5 · 78 名受试者看随机点立体图，记录看出隐藏图形所用的秒数；一组事先看过那个图形，另一组没有',
            en: 'Textbook Ch5 · 78 subjects viewed a random-dot stereogram; time in seconds until the hidden shape appeared. One group had been shown the shape beforehand, the other had not' },
    variable: { zh: '融合时间 (秒)', en: 'Fusion Time (seconds)' },
    groupName: { zh: '事先是否看过图形', en: 'Shown the shape first?' },
    // Excel 里存成了 47.20001 这类浮点噪声，原始数据本来只有一位小数
    value: r => { const v = num(r['fusion time']); return v === null ? null : Math.round(v * 10) / 10; },
    group: r => r['group'],
    levels: [
      { v: 'NV', zh: '没看过（NV）', en: 'Not shown (NV)' },
      { v: 'VV', zh: '看过（VV）',   en: 'Shown first (VV)' },
    ],
  },
  {
    id: 'mugs',
    file: 'data/source/Ch05_Mugs.xls',
    name: { zh: '保温杯的温度降幅', en: 'Travel Mug Temperature Drop' },
    displays: ['box', 'hist'],          // 四组，放不下背靠背茎叶图
    note: { zh: '教材 Ch5 · 四种保温杯各测 8 次，记录杯中液体温度下降了多少——降得越少越保温',
            en: 'Textbook Ch5 · four travel mugs, 8 trials each, recording how far the liquid temperature fell — less drop means better insulation' },
    variable: { zh: '温度降幅', en: 'Temperature Drop' },
    groupName: { zh: '杯子品牌', en: 'Mug' },
    value: r => num(r['Difference']),
    group: r => r['Container'],
    levels: [
      { v: 'CUPPS',     zh: 'CUPPS',     en: 'CUPPS' },
      { v: 'Nissan',    zh: 'Nissan',    en: 'Nissan' },
      { v: 'SIGG',      zh: 'SIGG',      en: 'SIGG' },
      { v: 'Starbucks', zh: 'Starbucks', en: 'Starbucks' },
    ],
  },
];
