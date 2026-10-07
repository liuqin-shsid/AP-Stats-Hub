/* 分类数据集的描述：变量的中英文名、取值的中英文标签与显示顺序。
   Excel 里存的是 D/S、1/2/3/C 这类代号，这里翻成课堂上用的说法。
   levels 的顺序 = 表格列顺序和图例顺序，按教材的排法。 */
'use strict';

module.exports = [
  {
    id: 'titanic',
    file: 'data/source/Ch03_Titanic.xls',
    name: { zh: '泰坦尼克号', en: 'Titanic' },
    note: { zh: '教材 Ch3 主例 · 2201 名乘客与船员', en: 'Textbook Ch3 · 2201 passengers and crew' },
    columns: [
      { key: 'Class', name: { zh: '船票等级', en: 'Ticket Class' }, levels: [
        { v: 1,   zh: '一等舱', en: 'First' },
        { v: 2,   zh: '二等舱', en: 'Second' },
        { v: 3,   zh: '三等舱', en: 'Third' },
        { v: 'C', zh: '船员',   en: 'Crew' },
      ]},
      { key: 'Survived', name: { zh: '是否生还', en: 'Survival' }, levels: [
        { v: 'S', zh: '生还', en: 'Alive' },
        { v: 'D', zh: '遇难', en: 'Dead' },
      ]},
      { key: 'Age', name: { zh: '年龄段', en: 'Age' }, levels: [
        { v: 'A', zh: '成人', en: 'Adult' },
        { v: 'C', zh: '儿童', en: 'Child' },
      ]},
      { key: 'Gender', name: { zh: '性别', en: 'Sex' }, levels: [
        { v: 'M', zh: '男', en: 'Male' },
        { v: 'F', zh: '女', en: 'Female' },
      ]},
    ],
  },
  {
    id: 'movies',
    file: 'data/source/Ch03_Movies_Genre_Rating.xls',
    name: { zh: '电影：类型与分级', en: 'Movies: Genre and Rating' },
    note: { zh: '教材 Ch3 · 122 部电影', en: 'Textbook Ch3 · 122 movies' },
    columns: [
      { key: 'Genre', name: { zh: '类型', en: 'Genre' }, levels: [
        { v: 'Action/Adventure', zh: '动作/冒险', en: 'Action/Adventure' },
        { v: 'Comedy',           zh: '喜剧',      en: 'Comedy' },
        { v: 'Drama',            zh: '剧情',      en: 'Drama' },
        { v: 'Thriller/Horror',  zh: '惊悚/恐怖', en: 'Thriller/Horror' },
      ]},
      { key: 'Rating', name: { zh: '分级', en: 'Rating' }, levels: [
        { v: 'G',     zh: 'G',     en: 'G' },
        { v: 'PG',    zh: 'PG',    en: 'PG' },
        { v: 'PG-13', zh: 'PG-13', en: 'PG-13' },
        { v: 'R',     zh: 'R',     en: 'R' },
      ]},
    ],
  },
  {
    id: 'bloodPressure',
    file: 'data/source/Ch03_Blood_Pressure.xls',
    name: { zh: '血压与年龄', en: 'Blood Pressure and Age' },
    note: { zh: '教材 Ch3 练习 31 · 474 名员工', en: 'Textbook Ch3 Exercise 31 · 474 employees' },
    columns: [
      { key: 'Age', name: { zh: '年龄段', en: 'Age Group' }, levels: [
        { v: 'Under 30', zh: '30 岁以下',  en: 'Under 30' },
        { v: '30 - 49',  zh: '30–49 岁',   en: '30–49' },
        { v: 'Over 50',  zh: '50 岁以上',  en: 'Over 50' },
      ]},
      { key: 'Blood pressure', name: { zh: '血压水平', en: 'Blood Pressure' }, levels: [
        { v: 'Low',    zh: '偏低', en: 'Low' },
        { v: 'Normal', zh: '正常', en: 'Normal' },
        { v: 'High',   zh: '偏高', en: 'High' },
      ]},
    ],
  },
];
