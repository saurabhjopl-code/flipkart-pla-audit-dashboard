/*************************************************
 * DIRECT vs INDIRECT IMPACT REPORT
 * Uses Campaign Order Report CSV
 * Fully isolated
 *************************************************/

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("generateDIReportBtn");
  if (btn) btn.addEventListener("click", generateDIReport);
});

function generateDIReport() {
  const fileInput = document.getElementById("diFile");
  if (!fileInput || !fileInput.files.length) {
    alert("Upload Campaign Order Report CSV");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    const headers = rows[2];
    const data = rows.slice(3);

    const idx = {
      campaign: headers.indexOf("Campaign ID"),
      fsn: headers.indexOf("Advertised FSN ID"),
      direct: headers.indexOf("Direct Units Sold"),
      indirect: headers.indexOf("Indirect Units Sold"),
      revenue: headers.indexOf("Total Revenue (Rs.)")
    };

    for (const k in idx) {
      if (idx[k] === -1) {
        alert("CSV missing required column: " + k);
        return;
      }
    }

    const campaignMap = {};
    const fsnMap = {};

    data.forEach(r => {
      const c = r[idx.campaign];
      const f = r[idx.fsn];
      const du = +r[idx.direct] || 0;
      const iu = +r[idx.indirect] || 0;
      const rev = +r[idx.revenue] || 0;

      /* Campaign */
      if (!campaignMap[c]) {
        campaignMap[c] = { du:0, iu:0, dr:0, ir:0 };
      }

      campaignMap[c].du += du;
      campaignMap[c].iu += iu;
      campaignMap[c].dr += rev * (du / Math.max(du + iu, 1));
      campaignMap[c].ir += rev * (iu / Math.max(du + iu, 1));

      /* FSN */
      if (!fsnMap[f]) {
        fsnMap[f] = { du:0, iu:0, r:0 };
      }

      fsnMap[f].du += du;
      fsnMap[f].iu += iu;
      fsnMap[f].r += rev;
    });

    /* ===== Render Campaign Table ===== */
    const campBody = document.querySelector("#diCampaignTable tbody");
    campBody.innerHTML = "";

    Object.entries(campaignMap).forEach(([c,v]) => {
      const assist = (v.iu / Math.max(v.du + v.iu,1)) * 100;
      campBody.innerHTML += `
        <tr>
          <td>${c}</td>
          <td>${v.du}</td>
          <td>${v.iu}</td>
          <td>${assist.toFixed(1)}%</td>
          <td>${v.dr.toFixed(0)}</td>
          <td>${v.ir.toFixed(0)}</td>
        </tr>
      `;
    });

    /* ===== Render FSN Table ===== */
    const fsnBody = document.querySelector("#diFsnTable tbody");
    fsnBody.innerHTML = "";

    Object.entries(fsnMap).forEach(([f,v]) => {
      const assist = (v.iu / Math.max(v.du + v.iu,1)) * 100;
      fsnBody.innerHTML += `
        <tr>
          <td>${f}</td>
          <td>${v.du}</td>
          <td>${v.iu}</td>
          <td>${assist.toFixed(1)}%</td>
          <td>${v.r.toFixed(0)}</td>
        </tr>
      `;
    });
  };

  reader.readAsText(fileInput.files[0]);
}
