/*************************************************
 * KEYWORD REPORTS — FINAL EXTENDED VERSION
 * CORE TABS REMAIN LOCKED
 *************************************************/

function keywordSegmentByROI(roi) {
  if (roi >= 7) return ["🟢 Scale", "Increase bids"];
  if (roi >= 5) return ["🟠 Optimize", "Test"];
  if (roi >= 3) return ["🟡 Caution", "Reduce"];
  return ["🔴 Kill", "Pause"];
}

function num(v) {
  if (!v) return 0;
  return Number(v.toString().replace(/₹|,/g, "").trim()) || 0;
}

function generateKeywordReport() {
  const file = document.getElementById("keywordFile").files[0];
  if (!file) return alert("Upload Keyword CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    /* Report Period */
    const period = extractReportPeriod(rows);
    keywordPeriod.innerHTML =
      `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;

    const headers = rows[2];
    const data = rows.slice(3);
    const h = name => headers.indexOf(name);

    const idx = {
      keyword: h("attributed_keyword"),
      views: h("Views"),
      clicks: h("Clicks"),
      spend: h("SUM(cost)"),
      directUnits: h("Direct Units Sold"),
      indirectUnits: h("Indirect Units Sold"),
      directRevenue: h("Direct Revenue"),
      indirectRevenue: h("Indirect Revenue")
    };

    const kw = {};
    let totalSpend = 0;
    let totalRevenue = 0;

    data.forEach(r => {
      const k = r[idx.keyword];
      if (!k) return;

      const spend = num(r[idx.spend]);
      const views = num(r[idx.views]);
      const clicks = num(r[idx.clicks]);
      const du = num(r[idx.directUnits]);
      const iu = num(r[idx.indirectUnits]);
      const dr = num(r[idx.directRevenue]);
      const ir = num(r[idx.indirectRevenue]);

      const units = du + iu;
      const revenue = dr + ir;

      totalSpend += spend;
      totalRevenue += revenue;

      if (!kw[k]) {
        kw[k] = { spend:0, revenue:0, units:0, views:0, clicks:0, dr:0, ir:0 };
      }

      Object.assign(kw[k], {
        spend: kw[k].spend + spend,
        revenue: kw[k].revenue + revenue,
        units: kw[k].units + units,
        views: kw[k].views + views,
        clicks: kw[k].clicks + clicks,
        dr: kw[k].dr + dr,
        ir: kw[k].ir + ir
      });
    });

    /* ========== Executive Summary ========== */
    const topRevenue = Object.entries(kw)
      .sort((a,b)=>b[1].revenue-a[1].revenue)
      .slice(0,10)
      .map(x=>x[0]).join(", ");

    const topWaste = Object.entries(kw)
      .filter(x=>x[1].spend>0 && x[1].units===0)
      .sort((a,b)=>b[1].spend-a[1].spend)
      .slice(0,10)
      .map(x=>x[0]).join(", ");

    keywordExecutive.innerHTML = `
      <div class="kpi">Total Spend<br>₹${totalSpend.toFixed(0)}</div>
      <div class="kpi">Total Revenue<br>₹${totalRevenue.toFixed(0)}</div>
      <div class="kpi">Overall ROI<br>${(totalRevenue/totalSpend||0).toFixed(2)}</div>
      <div class="kpi">Top Revenue Keywords<br>${topRevenue || "-"}</div>
      <div class="kpi">Top Waste Keywords<br>${topWaste || "-"}</div>
    `;

    /* ========== ROI Segmentation (LOCKED) ========== */
    kwSegment.querySelector("tbody").innerHTML =
      Object.entries(kw).map(([k,v])=>{
        const roi = v.spend ? v.revenue/v.spend : 0;
        const [seg,act] = keywordSegmentByROI(roi);
        return `<tr>
          <td>${k}</td><td>${v.spend.toFixed(0)}</td>
          <td>${v.revenue.toFixed(0)}</td><td>${v.units}</td>
          <td>${roi.toFixed(2)}</td><td>${seg}</td><td>${act}</td>
        </tr>`;
      }).join("");

    /* ========== Direct vs Indirect Impact ========== */
    kwAssist.querySelector("tbody").innerHTML =
      Object.entries(kw).map(([k,v])=>{
        const total = v.dr + v.ir;
        const assist = total ? (v.ir/total)*100 : 0;
        const role = assist>=50?"🤝 Assister":(v.dr/total)>=0.7?"🎯 Closer":"⚖ Balanced";
        return `<tr>
          <td>${k}</td><td>${v.dr.toFixed(0)}</td><td>${v.ir.toFixed(0)}</td>
          <td>${total.toFixed(0)}</td><td>${assist.toFixed(1)}%</td><td>${role}</td>
        </tr>`;
      }).join("");

    /* ========== Waste Analysis ========== */
    kwWaste.querySelector("tbody").innerHTML =
      Object.entries(kw).filter(([k,v])=>v.spend>0 && v.units===0)
      .map(([k,v])=>`<tr>
        <td>${k}</td><td>${v.spend.toFixed(0)}</td>
        <td>${v.clicks}</td><td>${v.units}</td>
        <td>${v.revenue.toFixed(0)}</td>
        <td>Hard Waste</td><td>Pause</td>
      </tr>`).join("");

    /* ========== Funnel Health ========== */
    kwFunnel.querySelector("tbody").innerHTML =
      Object.entries(kw).map(([k,v])=>{
        const ctr = v.views ? (v.clicks/v.views)*100 : 0;
        const cvr = v.clicks ? (v.units/v.clicks)*100 : 0;
        let d="Healthy";
        if(v.views>1000 && ctr<1) d="Low Relevance";
        else if(ctr>3 && cvr<5) d="Conversion Issue";
        return `<tr>
          <td>${k}</td><td>${v.views}</td>
          <td>${ctr.toFixed(2)}%</td><td>${cvr.toFixed(2)}%</td><td>${d}</td>
        </tr>`;
      }).join("");

    /* ========== Trend (Not Available) ========== */
    kwDay.querySelector("tbody").innerHTML =
      `<tr><td colspan="5">Trend not available — Date column not present</td></tr>`;
    kwWeek.querySelector("tbody").innerHTML =
      `<tr><td colspan="5">Trend not available — Date column not present</td></tr>`;
  };

  reader.readAsText(file);
}
