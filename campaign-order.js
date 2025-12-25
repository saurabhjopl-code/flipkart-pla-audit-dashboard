/*************************************************
 * CAMPAIGN ORDER REPORT
 * Fully isolated module
 * Headers are FIXED and FINAL
 *************************************************/

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("generateCampaignOrderBtn");
  if (btn) {
    btn.addEventListener("click", generateCampaignOrderReport);
  }
});

function generateCampaignOrderReport() {
  const fileInput = document.getElementById("campaignOrderFile");
  if (!fileInput || !fileInput.files.length) {
    alert("Upload Campaign Order Report CSV");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = () => {
    const rows = parseCSV(reader.result);

    /* ================= HEADER (FIXED CONTRACT) ================= */
    // Header row is ALWAYS index 2
    const headers = rows[2];
    const data = rows.slice(3);

    const idx = {
      campaign: headers.indexOf("Campaign ID"),
      adgroup: headers.indexOf("AdGroup Name"), // not used but validated
      advFsn: headers.indexOf("Advertised FSN ID"),
      purFsn: headers.indexOf("Purchased FSN ID"),
      date: headers.indexOf("Date"),
      direct: headers.indexOf("Direct Units Sold"),
      indirect: headers.indexOf("Indirect Units Sold"),
      revenue: headers.indexOf("Total Revenue (Rs.)")
    };

    /* ================= HARD VALIDATION ================= */
    for (const [key, value] of Object.entries(idx)) {
      if (value === -1) {
        alert(
          `Campaign Order CSV structure mismatch.\nMissing header: ${key}`
        );
        return;
      }
    }

    /* ================= AGGREGATION ================= */
    const campaignMap = {};
    const fsnMap = {};
    const dateMap = {};

    data.forEach(r => {
      const campaign = r[idx.campaign];
      if (!campaign) return;

      const advFsn = r[idx.advFsn];
      const purFsn = r[idx.purFsn];
      const date = r[idx.date];

      const du = +r[idx.direct] || 0;
      const iu = +r[idx.indirect] || 0;
      const units = du + iu;
      const revenue = +r[idx.revenue] || 0;

      /* Campaign Summary */
      if (!campaignMap[campaign]) {
        campaignMap[campaign] = {
          orders: 0,
          direct: 0,
          indirect: 0,
          units: 0,
          revenue: 0,
          fsns: {}
        };
      }

      campaignMap[campaign].orders++;
      campaignMap[campaign].direct += du;
      campaignMap[campaign].indirect += iu;
      campaignMap[campaign].units += units;
      campaignMap[campaign].revenue += revenue;

      /* Campaign → FSN */
      if (!campaignMap[campaign].fsns[advFsn]) {
        campaignMap[campaign].fsns[advFsn] = {
          orders: 0,
          units: 0,
          revenue: 0
        };
      }

      campaignMap[campaign].fsns[advFsn].orders++;
      campaignMap[campaign].fsns[advFsn].units += units;
      campaignMap[campaign].fsns[advFsn].revenue += revenue;

      /* FSN Contribution */
      if (!fsnMap[advFsn]) {
        fsnMap[advFsn] = {
          advFsn,
          purFsn,
          orders: 0,
          units: 0,
          revenue: 0
        };
      }

      fsnMap[advFsn].orders++;
      fsnMap[advFsn].units += units;
      fsnMap[advFsn].revenue += revenue;

      /* Date Trend */
      if (!dateMap[date]) {
        dateMap[date] = { orders: 0, units: 0, revenue: 0 };
      }

      dateMap[date].orders++;
      dateMap[date].units += units;
      dateMap[date].revenue += revenue;
    });

    /* ================= RENDER ================= */

    // Campaign Summary
    const campBody = document.querySelector("#corCampaignTable tbody");
    campBody.innerHTML = "";
    Object.entries(campaignMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .forEach(([c, v]) => {
        campBody.innerHTML += `
          <tr>
            <td>${c}</td>
            <td>${v.orders}</td>
            <td>${v.direct}</td>
            <td>${v.indirect}</td>
            <td>${v.units}</td>
            <td>${v.revenue.toFixed(0)}</td>
          </tr>`;
      });

    // Campaign → FSN
    const fsnBody = document.querySelector("#corFsnTable tbody");
    fsnBody.innerHTML = "";
    Object.entries(campaignMap).forEach(([c, v]) => {
      Object.entries(v.fsns).forEach(([fsn, x]) => {
        fsnBody.innerHTML += `
          <tr>
            <td>${c} → ${fsn}</td>
            <td>${x.orders}</td>
            <td>${x.units}</td>
            <td>${x.revenue.toFixed(0)}</td>
          </tr>`;
      });
    });

    // Date Trend
    const dateBody = document.querySelector("#corDateTable tbody");
    dateBody.innerHTML = "";
    Object.entries(dateMap)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .forEach(([d, v]) => {
        dateBody.innerHTML += `
          <tr>
            <td>${d}</td>
            <td>${v.orders}</td>
            <td>${v.units}</td>
            <td>${v.revenue.toFixed(0)}</td>
          </tr>`;
      });
  };

  reader.readAsText(file);
}
