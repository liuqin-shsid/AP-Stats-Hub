/* 由 core/pages.js 的清单生成侧边栏。
   必须在所有页面脚本加载完之后调用 —— 每个页面的标题词条是在自己的文件里注册的。 */
function buildSidebar() {
  const t = translations[lang];
  let html = `<div class="sidebar-title" data-i18n="sidebar_title">${escapeHtml(t.sidebar_title)}</div>`;
  for (const group of NAV_GROUPS) {
    const pages = PAGES.filter(p => p.group === group.key);
    if (!pages.length) continue;                 // 空分组不显示
    const label = escapeHtml(t[group.labelKey] || group.labelKey);
    html += `<div class="nav-group" data-i18n="${group.labelKey}">${label}</div>`;
    html += `<nav aria-label="${label}" data-i18n-aria="${group.labelKey}">`;
    for (const p of pages) {
      html += `<button id="${p.tool}Nav" class="nav-item tool-nav" type="button"`
            + ` data-tool="${p.tool}" data-i18n="${p.titleKey}" aria-controls="${p.pageId}">`
            + `${escapeHtml(t[p.titleKey] || p.titleKey)}</button>`;
    }
    html += `</nav>`;
  }
  document.querySelector('.sidebar').innerHTML = html;
}
