/* ---------- TAB SWITCH ---------- */
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

/* ---------- CSV PARSER ---------- */
function parseCSV(text){
  return text.trim().split("\n").map(r=>r.split(","));
}

/* ---------- DAILY ---------- */
function generateDaily(){
  const f = dailyFile.files[0];
  if(!f) return alert("Upload Daily CSV");
  const r = new FileReader();
  r.onload = ()=>{
    const rows = parseCSV(r.result);
    dailyTable.innerHTML = rows.slice(3).map(r=>`
      <tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>
    `).join("");
  };
  r.readAsText(f);
}

/* ---------- PLACEMENT ---------- */
function generatePlacement(){
  const f = placementFile.files[0];
  if(!f) return alert("Upload Placement CSV");
  const r = new FileReader();
  r.onload = ()=>{
    const rows = parseCSV(r.result);
    placementTable.innerHTML = rows.slice(3).map(r=>`
      <tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>
    `).join("");
  };
  r.readAsText(f);
}

/* ---------- TRAFFIC ---------- */
function generateTraffic(){
  const f = trafficFile.files[0];
  if(!f) return alert("Upload Traffic CSV");
  const r = new FileReader();
  r.onload = ()=>{
    const rows = parseCSV(r.result);
    trafficTable.innerHTML = rows.slice(3).map(r=>`
      <tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>
    `).join("");
  };
  r.readAsText(f);
}
