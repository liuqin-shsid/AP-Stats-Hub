# AP Stats Hub

给 AP 统计课用的互动教学网站。纯静态，**双击 `index.html` 就能用** —— 不需要服务器，不需要联网，不需要构建。

数据已经预先转成 JS 放在 `data/` 里，第三方库也都在 `vendor/` 里。右上角可以切换中文 / English。

---

## 页面一览

### 数据的展示（教材 Ch3–5）

| 页面 | 内容 |
|---|---|
| **分类数据的展示** | 选一个变量 → 频数表 + 条形图 + 饼图；选两个变量 → 列联表（计数 / 行% / 列% / 总%）+ 并排条形图 + 分段条形图。数据：泰坦尼克号、电影类型与分级、血压与年龄 |
| **定量数据的展示** | 核心是**组距滑杆**——同一份数据换个组距，直方图讲的故事就不同。各州数学成绩（n=50）给直方图 / 点图 / 茎叶图 / 箱线图；信用卡月均消费（n=500）给直方图 / 累积频率曲线 / 箱线图 |
| **比较分布** | 同一份数据（各州人口增长率，分东北中西部与南部西部两组）用三种方式对比：并排箱线图、两张同刻度直方图、背靠背茎叶图 |

### 线性回归教学（教材 Ch7–8）

| 页面 | 内容 |
|---|---|
| **相关关系探究** | 拖动数据点，实时看最佳拟合线、r、R² 怎么变 |
| **散点图** | 左右对照原始数据与平移 / 缩放 / 标准化后的结果 |
| **异常值点** | 从空白坐标图开始，自己点出数据点，看单个点如何影响 r 和回归线 |
| **线性函数** | 用汉堡王餐品数据，自己拖一条线，看竖直残差、残差平方和平均残差平方 |

### 抽样分布

| 页面 | 内容 |
|---|---|
| **样本均值的抽样分布** | 总体可自由绘制，演示中心极限定理 |
| **样本比例的抽样分布** | 调整总体比例 p 与样本量 n，看 p̂ 的累积抽样分布 |

---

## 目录结构

```
index.html           入口：页面容器 + 脚本清单
style.css            全站样式
core/                共用层（见下）
pages/               每个页面一个文件
data/                网页实际读取的数据（.js，自动生成，别手改）
data/source/         数据源 Excel —— 要改数据就改这里
tools/               数据转换脚本与数据集配置
vendor/              第三方库：SheetJS、PapaParse、jStat、KaTeX
```

`core/` 里各管一摊：

| 文件 | 负责 |
|---|---|
| `dom.js` | `$`、`escapeHtml`、`setOptions` |
| `plot.js` | 坐标映射、刻度、数值格式 |
| `stats.js` | 回归、五数概括、均值标准差 |
| `i18n.js` | 中英文词条与语言切换 |
| `data.js` | 工作表数据与中英文名称映射 |
| `pages.js` | **页面与侧边栏分组的清单** |
| `router.js` | 页面切换 |
| `sidebar.js` | 依清单生成侧边栏 |
| `boot.js` | 启动：建侧边栏 → 绑定点击 → 落到第一页 |

---

## 想加一个新页面

改 3 个地方：

**1. 新建 `pages/my-page.js`**

```js
(() => {
  // 本页用到的词条写在自己文件里
  Object.assign(translations.zh, { my_title: '我的新页面' });
  Object.assign(translations.en, { my_title: 'My New Page' });

  function render() {
    $('myPage').innerHTML = `<h1>${translations[lang].my_title}</h1>`;
  }

  render();
  document.addEventListener('apstats:tool', e => { if (e.detail === 'mine') render(); });
  document.addEventListener('apstats:language', render);
})();
```

**2. `index.html` 加两行**

```html
<div id="myPage" hidden></div>              <!-- 和其它页面容器放一起 -->
<script src="pages/my-page.js"></script>     <!-- 放在 core/boot.js 之前 -->
```

**3. `core/pages.js` 的 `PAGES` 里加一条**

```js
{ tool:'mine', group:'display', pageId:'myPage', titleKey:'my_title' },
```

侧边栏会自动出现这一项。`PAGES` 的顺序就是侧边栏顺序，**第一条是打开网页的默认页**。想新建一个分组就在 `NAV_GROUPS` 里加一条。

---

## 想给某个页面加数据集

**第一步**：把 Excel 放进 `data/source/`。

**第二步**：在对应的配置文件里加一条。

| 页面 | 配置文件 |
|---|---|
| 分类数据的展示 | `tools/datasets.categorical.js` |
| 定量数据的展示 | `tools/datasets.quantitative.js` |
| 比较分布 | `tools/datasets.grouped.js` |

例如给「定量数据的展示」加一份：

```js
{
  id: 'myData',
  file: 'data/source/我的数据.xls',
  name: { zh: '我的数据', en: 'My Data' },
  note: { zh: '数据来源说明', en: 'Where it came from' },
  variable: { zh: '身高 (cm)', en: 'Height (cm)' },
  displays: ['hist', 'dot', 'stem', 'box'],   // 要显示哪几种图
  pick: r => Number(r['身高']),                // 从 Excel 行里取数值
}
```

`displays` 可选：`hist` 直方图、`dot` 点图、`stem` 茎叶图、`ogive` 累积频率曲线、`box` 箱线图。点图和茎叶图只适合小数据量（几十到一两百），数据多了改用直方图。

**第三步**：在仓库根目录跑一次转换。

```bash
npm run build:data
```

刷新网页就有了。（第一次用需要先 `npm install` 装转换脚本的依赖；网站本身不需要。）

---

## 改了现有数据怎么办

一样：改 `data/source/` 里的 Excel → 跑 `npm run build:data` → 刷新。

`data/` 下的 `.js` 是自动生成的，**不要手改**，下次转换会被覆盖。

---

## 发布到网上

仓库推到 GitHub 后，在 **Settings → Pages** 把 Source 设为 **Deploy from a branch**，分支选 `main`、目录选 `/(root)`，保存后等 1–3 分钟就有网址了。以后更新只要推代码，网址不变。

---

## 两个和教材对不上的地方

- 教材 Table 3.6 里「遇难 × 一等舱」印的是 **5.6%**，但 `122 ÷ 2201 = 5.54%`，应为 **5.5%**。本站按实际计算显示。
- 海啸地震数据（已不在站内使用）：教材按修订前的震级分析，书上最大值 9.0；现在的数据文件是修订后的版本，最大值 9.2。教材第 45 页脚注本身也提到了这次修订。

## 一个和 Excel 不一样的地方

四分位数按**教材 p.54 与 TI-83/84 的算法**：用中位数把数据劈成两半（n 为奇数时两半都排除中位数），再各取中位数。这和 Excel 的 `QUARTILE` 不是同一种算法，本站统一用前者，学生按计算器算能对上。
