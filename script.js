/* ================= TAB SWITCH ================= */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* ================= CSV PARSER ================= */
function parseCSV(text) {
  return text
    .trim()
    .split("\n")
    .map(r => r.split(",").map(v => v.trim()));
}

/* ================= COMMON TABLE RENDER ================= */
function renderTable(tableId, rows) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = rows.map(r =>
    `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`
  ).join("");
}

/* ================= DAILY ================= */
function generateDaily() {
  const file = dailyFile.files[0];
  if (!file) return alert("Upload Daily CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    renderTable("dailyTable", rows.slice(2)); // show headers + data
  };
  reader.readAsText(file);
}

/* ================= PLACEMENT ================= */
function generatePlacement() {
  const file = placementFile.files[0];
  if (!file) return alert("Upload Placement CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    renderTable("placementTable", rows.slice(2));
  };
  reader.readAsText(file);
}

/* ================= TRAFFIC ================= */
function generateTraffic() {
  const file = trafficFile.files[0];
  if (!file) return alert("Upload Traffic CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    renderTable("trafficTable", rows.slice(2));
  };
  reader.readAsText(file);
}

/* ================= KEYWORD ================= */
function generateKeyword() {
  const file = keywordFile.files[0];
  if (!file) return alert("Upload Keyword CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    renderTable("keywordTable", rows.slice(2));
  };
  reader.readAsText(file);
}
