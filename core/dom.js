/* DOM 小工具：被所有页面共用。 */
const $ = (id) => document.getElementById(id);

function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

/* 填充 <select>；labeler 用于中英文标签切换，值本身不变。 */
function setOptions(select, values, selection, labeler = v => v) {
  select.innerHTML = values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(labeler(v))}</option>`).join('');
  if (selection && values.includes(selection)) select.value = selection;
}
