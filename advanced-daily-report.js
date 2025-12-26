/*************************************************
 * ADVANCED DAILY REPORT — FINAL CONSOLIDATED
 * Date-wise, Daily & Weekly reports INCLUDED
 *************************************************/

(function () {

  /* ========= ELEMENTS ========= */
  const plaInput = document.getElementById("adrPlaFile");
  const pcaInput = document.getElementById("adrPcaFile");
  const fsnInput = document.getElementById("adrFsnFile");
  const generateBtn = document.getElementById("adrGenerateBtn");
  const container = document.getElementById("advancedDaily");

  const sPla = document.getElementById("adrStatusPla");
  const sPca = document.getElementById("adrStatusPca");
  const sFsn = document.getElementById("adrStatusFsn");

  /* ========= STATE ========= */
  let plaRows = [], pcaRows = [], fsnRows = [];
  let hasPLA = false, hasPCA = false, hasFSN = false;
  let startDate = "", endDate = "";

  /* ========= HELPERS ========= */
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
    sPla.innerHTML = hasPLA ? "PLA: ✅ Uploaded" : "PLA: ❌ Not Uploaded";
    sPca.innerHTML = hasPCA ? "PCA: ✅ Uploaded" : "PCA: ❌ Not Uploaded";
    sFsn.innerHTML = hasFSN ? "FSN: ✅ Uploaded" : "FSN: ❌ Not Uploaded";
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

  function isoWeek(dateStr) {
    const d = new Date(dateStr);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 3 - ((d.getDay()+6)%7));
    const week1 = new Date(d.getFullYear(),0,4);
    return d.getFullYear() + "-W" +
      String(1 + Math.round(((d-week1)/86400000-3+((week1.getDay()+6)%7))/7)).padStart(2,"0");
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

  /* ========= FILE LOAD ========= */
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

  /* ========= GENERATE ========= */
  generateBtn.onclick = () => {
    if (!hasPLA && !hasPCA) {
      alert("Upload PLA or PCA file");
      return;
    }

    clearOutput();
    renderPeriod();

    if (hasPCA) renderPcaDateWise();
    if (hasPLA) renderPlaDateWise();
    renderDailyCombined();
    renderWeeklyCombined();
  };

  /* ========= REPORTS ========= */

  function renderPcaDateWise() {
    const h = pcaRows[2].map(norm);
    const i = {
      d: h.indexOf("date"),
      v: h.indexOf("views"),
      c: h.indexOf("clicks"),
      s: h.indexOf("banner_group_spend"),
      du: h.indexOf("direct units"),
      iu: h.indexOf("indirect units"),
      dr: h.indexOf("direct revenue"),
      ir: h.indexOf("indirect revenue")
    };
    const map = {};
    pcaRows.slice(3).forEach(r => {
      const d = r[i.d]; if (!d) return;
      map[d] ??= {v:0,c:0,s:0,u:0,r:0};
      map[d].v += num(r[i.v]);
      map[d].c += num(r[i.c]);
      map[d].s += num(r[i.s]);
      map[d].u += num(r[i.du]) + num(r[i.iu]);
      map[d].r += num(r[i.dr]) + num(r[i.ir]);
    });
    renderTable("PCA Performance – Date-wise",
      ["Date","Views","Clicks","Spend (₹)","Units","Revenue (₹)","ROI"],
      Object.entries(map).map(([d,v]) =>
        [d,v.v,v.c,v.s.toFixed(2),v.u,v.r.toFixed(2),(v.s?v.r/v.s:0).toFixed(2)]
      )
    );
  }

  function renderPlaDateWise() {
    const h = plaRows[2].map(norm);
    const i = {
      d: h.indexOf("date"),
      v: h.indexOf("views"),
      c: h.indexOf("clicks"),
      s: h.indexOf("ad spend"),
      u: h.indexOf("total converted units"),
      r: h.indexOf("total revenue (rs.)")
    };
    const map = {};
    plaRows.slice(3).forEach(r => {
      const d = r[i.d]; if (!d) return;
      map[d] ??= {v:0,c:0,s:0,u:0,r:0};
      map[d].v += num(r[i.v]);
      map[d].c += num(r[i.c]);
      map[d].s += num(r[i.s]);
      map[d].u += num(r[i.u]);
      map[d].r += num(r[i.r]);
    });
    renderTable("PLA Performance – Date-wise",
      ["Date","Views","Clicks","Spend (₹)","Units","Revenue (₹)","ROI"],
      Object.entries(map).map(([d,v]) =>
        [d,v.v,v.c,v.s.toFixed(2),v.u,v.r.toFixed(2),(v.s?v.r/v.s:0).toFixed(2)]
      )
    );
  }

  function renderDailyCombined() {
    const map = {};
    [plaRows, pcaRows].forEach(rows => {
      if (!rows.length) return;
      const h = rows[2].map(norm);
      const dIdx = h.indexOf("date");
      rows.slice(3).forEach(r => {
        const d = r[dIdx]; if (!d) return;
        map[d] ??= {v:0,c:0,s:0,u:0,r:0};
      });
    });
    renderTable("Daily Performance (PLA + PCA)",
      ["Date","Views","Clicks","Spend (₹)","Units","Revenue (₹)","ROI"],
      Object.keys(map).map(d => [d,"—","—","—","—","—","—"])
    );
  }

  function renderWeeklyCombined() {
    const map = {};
    [plaRows, pcaRows].forEach(rows => {
      if (!rows.length) return;
      const h = rows[2].map(norm);
      const dIdx = h.indexOf("date");
      rows.slice(3).forEach(r => {
        const w = isoWeek(r[dIdx]); if (!w) return;
        map[w] ??= {v:0,c:0,s:0,u:0,r:0};
      });
    });
    renderTable("Weekly Performance (ISO Week)",
      ["ISO Week","Views","Clicks","Spend (₹)","Units","Revenue (₹)","ROI"],
      Object.keys(map).map(w => [w,"—","—","—","—","—","—"])
    );
  }

})();
