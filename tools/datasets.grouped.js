/* 比较分布（Ch5）用的数据：一个定量变量 + 一个把它分成若干组的分类变量。
   levels 的顺序 = 图表与表格里的组顺序。 */
'use strict';

const num = v => (v === null || v === undefined || v === '') ? null
               : (Number.isFinite(Number(v)) ? Number(v) : null);

module.exports = [
  {
    id: 'populationGrowth',
    file: 'data/source/Ch05_Population_growth.xls',
    name: { zh: '各州人口增长率', en: 'State Population Growth' },
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
];
