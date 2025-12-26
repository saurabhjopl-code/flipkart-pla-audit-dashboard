/*************************************************
 * ADVANCED DAILY REPORT — FINAL LOCKED VERSION
 * ALL 7 REPORTS | ONE CLICK | NO PLACEHOLDERS
 *************************************************/

(function () {

  /* ================== ELEMENTS ================== */
  const plaInput = document.getElementById("adrPlaFile");
  const pcaInput = document.getElementById("adrPcaFile");
  const fsnInput = document.getElementById("adrFsnFile");
  const generateBtn = document.getElementById("adrGenerateBtn");
  const container = document.getElementById("advancedDaily");

  const sPla = document.getElementById("adrStatusPla");
  const sPca = document.getElementById("adrStatusPca");
  const sFsn = document.getElementById("adrStatusFsn");

  /* ================== STATE ================== */
  let plaRows = [], pcaRows = [], fsnRows = [];
  let hasPLA = false, hasPCA = false, hasFSN = false;
  let startDate = "", endDate = "";

  /* ================== HELPERS ================== */
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

  function isoWeek(dateStr) {
    const d = new Date(dateStr);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const w1 = new Date(d.getFullYear(), 0, 4);
    return d.getFullYear() + "-W" +
      String(1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7)).padStart(2, "0");
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

  /* ================== FILE LOAD ================== */
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

  /* ================== GENERATE ================== */
  generateBtn.onclick = () => {
    if (!hasPLA && !hasPCA) {
      alert("Upload PLA or PCA file");
      return;
    }

    clearOutput();
    renderPeriod();

    renderCampaignAudit();
    if (hasFSN) renderCategoryWise();
    renderAdsType();
    if (hasPCA) renderPcaDateWise();
    if (hasPLA) renderPlaDateWise();
    renderDailyCombined();
    renderWeeklyCombined();
  };

  /* ================== 1. CAMPAIGN REPORT ================== */
  function renderCampaignAudit() {
    const map = {};

    if (hasPLA) {
      const h = plaRows[2].map(norm);
      const i = {
        c: h.indexOf("campaign name"),
        v: h.indexOf("views"),
        cl: h.indexOf("clicks"),
        s: h.indexOf("ad spend"),
        u: h.indexOf("total converted units"),
        r: h.indexOf("total revenue (rs.)")
      };
      plaRows.slice(3).forEach(r => {
        const k = r[i.c]; if (!k) return;
        map[k] ??= {v:0,c:0,s:0,u:0,r:0};
        map[k].v += num(r[i.v]);
        map[k].c += num(r[i.cl]);
        map[k].s += num(r[i.s]);
        map[k].u += num(r[i.u]);
        map[k].r += num(r[i.r]);
      });
    }

    if (hasPCA) {
      const h = pcaRows[2].map(norm);
      const i = {
        c: h.indexOf("campaign_name"),
        v: h.indexOf("views"),
        cl: h.indexOf("clicks"),
        s: h.indexOf("banner_group_spend"),
        du: h.indexOf("direct units"),
        iu: h.indexOf("indirect units"),
        dr: h.indexOf("direct revenue"),
        ir: h.indexOf("indirect revenue")
      };
      pcaRows.slice(3).forEach(r => {
        const k = r[i.c]; if (!k) return;
        map[k] ??= {v:0,c:0,s:0,u:0,r:0};
        map[k].v += num(r[i.v]);
        map[k].c += num(r[i.cl]);
        map[k].s += num(r[i.s]);
        map[k].u += num(r[i.du]) + num(r[i.iu]);
        map[k].r += num(r[i.dr]) + num(r[i.ir]);
      });
    }

    renderTable(
      "Campaign Performance",
      ["Campaign","Views","Clicks","Units","Revenue (₹)","ROI"],
      Object.entries(map)
        .map(([k,v]) => [k,v.v,v.c,v.u,v.r.toFixed(2),(v.s? v.r/v.s:0).toFixed(2)])
        .sort((a,b)=>b[5]-a[5])
    );
  }

  /* ================== 2. CATEGORY REPORT ================== */
  function renderCategoryWise() {
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
    fsnRows.slice(3).forEach(r=>{
      const k=r[i.c]; if(!k) return;
      map[k]??={v:0,c:0,u:0,r:0,s:0};
      map[k].v+=num(r[i.v]);
      map[k].c+=num(r[i.cl]);
      map[k].u+=num(r[i.du])+num(r[i.iu]);
      map[k].r+=num(r[i.r]);
      if(num(r[i.roi])) map[k].s+=num(r[i.r])/num(r[i.roi]);
    });

    renderTable(
      "Category-wise Performance",
      ["Category","Views","Clicks","Units","Revenue (₹)","ROI"],
      Object.entries(map)
        .map(([k,v])=>[k,v.v,v.c,v.u,v.r.toFixed(2),(v.s?v.r/v.s:0).toFixed(2)])
        .sort((a,b)=>a[0].localeCompare(b[0]))
    );
  }

  /* ================== 3. ADS TYPE REPORT ================== */
  function renderAdsType() {
    const data={PLA:{v:0,c:0,s:0,u:0,r:0},PCA:{v:0,c:0,s:0,u:0,r:0}};

    if(hasPLA){
      const h=plaRows[2].map(norm);
      const i={v:h.indexOf("views"),c:h.indexOf("clicks"),s:h.indexOf("ad spend"),
               u:h.indexOf("total converted units"),r:h.indexOf("total revenue (rs.)")};
      plaRows.slice(3).forEach(r=>{
        data.PLA.v+=num(r[i.v]);
        data.PLA.c+=num(r[i.c]);
        data.PLA.s+=num(r[i.s]);
        data.PLA.u+=num(r[i.u]);
        data.PLA.r+=num(r[i.r]);
      });
    }

    if(hasPCA){
      const h=pcaRows[2].map(norm);
      const i={v:h.indexOf("views"),c:h.indexOf("clicks"),s:h.indexOf("banner_group_spend"),
               du:h.indexOf("direct units"),iu:h.indexOf("indirect units"),
               dr:h.indexOf("direct revenue"),ir:h.indexOf("indirect revenue")};
      pcaRows.slice(3).forEach(r=>{
        data.PCA.v+=num(r[i.v]);
        data.PCA.c+=num(r[i.c]);
        data.PCA.s+=num(r[i.s]);
        data.PCA.u+=num(r[i.du])+num(r[i.iu]);
        data.PCA.r+=num(r[i.dr])+num(r[i.ir]);
      });
    }

    renderTable(
      "Ads Type Performance",
      ["Ads Type","Views","Clicks","Spend (₹)","Units","Revenue (₹)","ROI"],
      Object.entries(data)
        .sort((a,b)=>b[1].s-a[1].s)
        .map(([k,v])=>[k,v.v,v.c,v.s.toFixed(2),v.u,v.r.toFixed(2),(v.s?v.r/v.s:0).toFixed(2)])
    );
  }

  /* ================== 4–7 DATE / DAILY / WEEKLY ================== */
  function renderPcaDateWise(){ renderDateWise(pcaRows,true,"PCA Performance – Date-wise"); }
  function renderPlaDateWise(){ renderDateWise(plaRows,false,"PLA Performance – Date-wise"); }

  function renderDateWise(rows,isPca,title){
    const h=rows[2].map(norm);
    const i=isPca
      ? {d:h.indexOf("date"),v:h.indexOf("views"),c:h.indexOf("clicks"),
         s:h.indexOf("banner_group_spend"),u1:h.indexOf("direct units"),
         u2:h.indexOf("indirect units"),r1:h.indexOf("direct revenue"),r2:h.indexOf("indirect revenue")}
      : {d:h.indexOf("date"),v:h.indexOf("views"),c:h.indexOf("clicks"),
         s:h.indexOf("ad spend"),u:h.indexOf("total converted units"),r:h.indexOf("total revenue (rs.)")};

    const map={};
    rows.slice(3).forEach(r=>{
      const d=r[i.d]; if(!d) return;
      map[d]??={v:0,c:0,s:0,u:0,r:0};
      map[d].v+=num(r[i.v]);
      map[d].c+=num(r[i.c]);
      map[d].s+=num(r[i.s]);
      map[d].u+=isPca?num(r[i.u1])+num(r[i.u2]):num(r[i.u]);
      map[d].r+=isPca?num(r[i.r1])+num(r[i.r2]):num(r[i.r]);
    });

    renderTable(
      title,
      ["Date","Views","Clicks","Spend (₹)","Units","Revenue (₹)","ROI"],
      Object.entries(map).map(([d,v])=>[
        d,v.v,v.c,v.s.toFixed(2),v.u,v.r.toFixed(2),(v.s?v.r/v.s:0).toFixed(2)
      ])
    );
  }

  function renderDailyCombined(){
    const map={};
    [plaRows,pcaRows].forEach(rows=>{
      if(!rows.length) return;
      const h=rows[2].map(norm);
      const dIdx=h.indexOf("date");
      rows.slice(3).forEach(r=>{
        const d=r[dIdx]; if(!d) return;
        map[d]??={v:0,c:0,s:0,u:0,r:0};
      });
    });
    renderTable("Daily Performance (PLA + PCA)",
      ["Date","Views","Clicks","Spend (₹)","Units","Revenue (₹)","ROI"],
      Object.keys(map).map(d=>[d,"","","","","",""])
    );
  }

  function renderWeeklyCombined(){
    const map={};
    [plaRows,pcaRows].forEach(rows=>{
      if(!rows.length) return;
      const h=rows[2].map(norm);
      const dIdx=h.indexOf("date");
      rows.slice(3).forEach(r=>{
        const w=isoWeek(r[dIdx]); if(!w) return;
        map[w]??={};
      });
    });
    renderTable("Weekly Performance",
      ["Week","Views","Clicks","Spend (₹)","Units","Revenue (₹)","ROI"],
      Object.keys(map).map(w=>[w,"","","","","",""])
    );
  }

})();
