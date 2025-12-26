/*************************************************
 * ADVANCED DAILY REPORT — FINAL CORRECTIONS
 * (Report Period, Category Sort, Daily & Weekly)
 *************************************************/

(function () {

  /* ================= ELEMENTS ================= */
  const plaInput = document.getElementById("adrPlaFile");
  const pcaInput = document.getElementById("adrPcaFile");
  const fsnInput = document.getElementById("adrFsnFile");
  const generateBtn = document.getElementById("adrGenerateBtn");
  const container = document.getElementById("advancedDaily");

  const sPla = document.getElementById("adrStatusPla");
  const sPca = document.getElementById("adrStatusPca");
  const sFsn = document.getElementById("adrStatusFsn");

  /* ================= STATE ================= */
  let plaRows = [], pcaRows = [], fsnRows = [];
  let hasPLA = false, hasPCA = false, hasFSN = false;
  let startDate = "", endDate = "";

  /* ================= HELPERS ================= */
  const norm = v => v.replace(/\ufeff/g, "").trim().toLowerCase();
  const num = v => Number(String(v).replace(/[^0-9.-]/g, "")) || 0;

  function parseCSV(text) {
    const rows = [];
    let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (c === '"' && q && n === '"') { cur += '"'; i++; }
      else if (c === '"') q = !q;
      else if (c === "," && !q) { row.push(cur.trim()); cur = ""; }
      else if (c === "\n" && !q) { row.push(cur.trim()); rows.push(row); row = []; cur = ""; }
      else cur += c;
    }
    row.push(cur.trim());
    rows.push(row);
    return rows;
  }

  function clearOutput() {
    container.querySelectorAll(".adr-generated").forEach(e => e.remove());
  }

  function refreshStatus() {
    sPla.textContent = hasPLA ? "PLA: ✅ Uploaded" : "PLA: ❌ Not Uploaded";
    sPca.textContent = hasPCA ? "PCA: ✅ Uploaded" : "PCA: ❌ Not Uploaded";
    sFsn.textContent = hasFSN ? "FSN: ✅ Uploaded" : "FSN: ❌ Not Uploaded";
  }

  function extractDates(rows) {
    startDate = rows?.[0]?.[0] || "";
    endDate = rows?.[1]?.[0] || "";
  }

  function renderPeriod() {
    const d = document.createElement("div");
    d.className = "adr-generated";
    d.innerHTML = `<strong>Report Period:</strong> ${startDate} → ${endDate}`;
    container.appendChild(d);
  }

  function mondaySundayRange(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = x =>
      x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    return `${fmt(monday)} – ${fmt(sunday)}`;
  }

  function renderTable(title, headers, rows) {
    const wrap = document.createElement("div");
    wrap.className = "adr-generated";
    let html = `<h4>${title}</h4><table><thead><tr>`;
    headers.forEach(h => html += `<th>${h}</th>`);
    html += `</tr></thead><tbody>`;
    rows.forEach(r => {
      html += "<tr>";
      r.forEach(c => html += `<td>${c}</td>`);
      html += "</tr>";
    });
    html += "</tbody></table>";
    wrap.innerHTML = html;
    container.appendChild(wrap);
  }

  /* ================= FILE LOAD ================= */
  plaInput.onchange = async () => {
    plaRows = parseCSV(await plaInput.files[0].text());
    hasPLA = plaRows.length > 3;
    extractDates(plaRows);
    refreshStatus();
  };

  pcaInput.onchange = async () => {
    pcaRows = parseCSV(await pcaInput.files[0].text());
    hasPCA = pcaRows.length > 3;
    extractDates(pcaRows);
    refreshStatus();
  };

  fsnInput.onchange = async () => {
    fsnRows = parseCSV(await fsnInput.files[0].text());
    hasFSN = fsnRows.length > 3;
    refreshStatus();
  };

  /* ================= GENERATE ================= */
  generateBtn.onclick = () => {
    clearOutput();
    renderPeriod();
    renderCategoryWise();
    renderDailyCombined();
    renderWeeklyCombined();
  };

  /* ================= CATEGORY (ROI SORT) ================= */
  function renderCategoryWise() {
    if (!hasFSN) return;

    const h = fsnRows[2].map(norm);
    const i = {
      c: h.indexOf("adgroup name"),
      v: h.indexOf("views"),
      cl: h.indexOf("clicks"),
      du: h.indexOf("direct units sold"),
      iu: h.indexOf("indirect units sold"),
      r: h.indexOf("total revenue (rs.)"),
      roi: h.indexOf("roi")
    };

    const map = {};
    fsnRows.slice(3).forEach(r => {
      const k = r[i.c];
      if (!k) return;
      map[k] ??= { v:0, c:0, u:0, r:0, s:0 };
      map[k].v += num(r[i.v]);
      map[k].c += num(r[i.cl]);
      map[k].u += num(r[i.du]) + num(r[i.iu]);
      map[k].r += num(r[i.r]);
      if (num(r[i.roi])) map[k].s += num(r[i.r]) / num(r[i.roi]);
    });

    renderTable(
      "Category-wise Performance",
      ["Category","Views","Clicks","Units","Revenue (₹)","ROI"],
      Object.entries(map)
        .map(([k,v]) => [k,v.v,v.c,v.u,v.r.toFixed(2),(v.s?v.r/v.s:0).toFixed(2)])
        .sort((a,b)=>b[5]-a[5])
    );
  }

  /* ================= DAILY (PLA + PCA) ================= */
  function renderDailyCombined() {
    const map = {};

    function add(d,v,c,s,u,r){
      map[d] ??= {v:0,c:0,s:0,u:0,r:0};
      map[d].v+=v; map[d].c+=c; map[d].s+=s; map[d].u+=u; map[d].r+=r;
    }

    if (hasPLA) {
      const h = plaRows[2].map(norm);
      const i = { d:h.indexOf("date"), v:h.indexOf("views"), c:h.indexOf("clicks"),
                  s:h.indexOf("ad spend"), u:h.indexOf("total converted units"),
                  r:h.indexOf("total revenue (rs.)") };
      plaRows.slice(3).forEach(r=>{
        add(r[i.d], num(r[i.v]), num(r[i.c]), num(r[i.s]), num(r[i.u]), num(r[i.r]));
      });
    }

    if (hasPCA) {
      const h = pcaRows[2].map(norm);
      const i = { d:h.indexOf("date"), v:h.indexOf("views"), c:h.indexOf("clicks"),
                  s:h.indexOf("banner_group_spend"), du:h.indexOf("direct units"),
                  iu:h.indexOf("indirect units"), dr:h.indexOf("direct revenue"),
                  ir:h.indexOf("indirect revenue") };
      pcaRows.slice(3).forEach(r=>{
        add(r[i.d], num(r[i.v]), num(r[i.c]), num(r[i.s]),
            num(r[i.du])+num(r[i.iu]), num(r[i.dr])+num(r[i.ir]));
      });
    }

    renderTable(
      "Daily Performance (PLA + PCA)",
      ["Date","Views","Clicks","Spend (₹)","Units","Revenue (₹)","ROI"],
      Object.entries(map)
        .sort((a,b)=>a[0].localeCompare(b[0]))
        .map(([d,v])=>[
          d,v.v,v.c,v.s.toFixed(2),v.u,v.r.toFixed(2),(v.s?v.r/v.s:0).toFixed(2)
        ])
    );
  }

  /* ================= WEEKLY (MON–SUN) ================= */
  function renderWeeklyCombined() {
    const map = {};

    function addWeek(d,v,c,s,u,r){
      const w = mondaySundayRange(d);
      map[w] ??= {v:0,c:0,s:0,u:0,r:0};
      map[w].v+=v; map[w].c+=c; map[w].s+=s; map[w].u+=u; map[w].r+=r;
    }

    if (hasPLA) {
      const h = plaRows[2].map(norm);
      const i = { d:h.indexOf("date"), v:h.indexOf("views"), c:h.indexOf("clicks"),
                  s:h.indexOf("ad spend"), u:h.indexOf("total converted units"),
                  r:h.indexOf("total revenue (rs.)") };
      plaRows.slice(3).forEach(r=>{
        addWeek(r[i.d], num(r[i.v]), num(r[i.c]), num(r[i.s]), num(r[i.u]), num(r[i.r]));
      });
    }

    if (hasPCA) {
      const h = pcaRows[2].map(norm);
      const i = { d:h.indexOf("date"), v:h.indexOf("views"), c:h.indexOf("clicks"),
                  s:h.indexOf("banner_group_spend"), du:h.indexOf("direct units"),
                  iu:h.indexOf("indirect units"), dr:h.indexOf("direct revenue"),
                  ir:h.indexOf("indirect revenue") };
      pcaRows.slice(3).forEach(r=>{
        addWeek(r[i.d], num(r[i.v]), num(r[i.c]), num(r[i.s]),
                num(r[i.du])+num(r[i.iu]), num(r[i.dr])+num(r[i.ir]));
      });
    }

    renderTable(
      "Weekly Performance",
      ["Week","Views","Clicks","Spend (₹)","Units","Revenue (₹)","ROI"],
      Object.entries(map).map(([w,v])=>[
        w,v.v,v.c,v.s.toFixed(2),v.u,v.r.toFixed(2),(v.s?v.r/v.s:0).toFixed(2)
      ])
    );
  }

})();
