/* ===== Campaign → FSN expand / collapse (event delegation) ===== */
const fsnTable = document.getElementById("corFsnTable");

fsnTable.addEventListener("click", function (e) {
  const row = e.target.closest(".cor-campaign-row");
  if (!row) return;

  const groupId = row.dataset.group;
  const arrowCell = row.querySelector("td");
  const children = fsnTable.querySelectorAll(
    `[data-parent="${groupId}"]`
  );

  if (!children.length) return;

  const isCollapsed = children[0].classList.contains("hidden");

  children.forEach(r =>
    r.classList.toggle("hidden", !isCollapsed)
  );

  arrowCell.innerHTML = arrowCell.innerHTML.replace(
    isCollapsed ? "▶" : "▼",
    isCollapsed ? "▼" : "▶"
  );
});
