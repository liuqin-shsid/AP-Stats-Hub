/* 页面切换。各页面不直接操作彼此的显隐，只监听 apstats:tool 决定要不要重绘。 */
let activeTool = 'correlation';

function showTool(tool) {
  activeTool = tool;
  PAGES.forEach(p => { const el = $(p.pageId); if (el) el.hidden = p.tool !== tool; });
  document.querySelectorAll('[data-tool]').forEach(button => {
    const active = button.dataset.tool === tool;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  });
  const def = PAGES.find(p => p.tool === tool);
  if (def) document.title = `AP Stats Hub · ${translations[lang][def.titleKey]}`;
  document.dispatchEvent(new CustomEvent('apstats:tool', { detail: tool }));
}

document.querySelectorAll('[data-tool]').forEach(button =>
  button.addEventListener('click', () => showTool(button.dataset.tool)));
