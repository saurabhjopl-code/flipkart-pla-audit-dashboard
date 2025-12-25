/*************************************************
 * CAMPAIGN ORDER REPORT
 * Fully isolated module
 * HEADER CONTRACT (FINAL – DO NOT CHANGE):
 *
 * Campaign ID
 * AdGroup Name
 * Listing ID
 * Product Name
 * Advertised FSN ID
 * Date
 * order_id
 * AdGroup CPC
 * Expected ROI
 * Purchased FSN ID
 * Total Revenue (Rs.)
 * Direct Units Sold
 * Indirect Units Sold
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

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    /* ===== Fixed header row ===== */
    const headers = rows[2];
    const data = rows.slice(3);

    const idx = {
      campaign: headers.indexOf("Campaign ID"),
      advFsn: headers.indexOf("Advertised FSN ID"),
      date: headers.indexOf("Date"),
      direct: headers.indexOf("Direct Units Sold"),
      indirect: headers.indexOf("Indirect Units Sold"),
      revenue: headers.indexOf("Total Revenue (Rs.)")
    };

    /* ===== Hard validation ===== */
    for (const [k, v] of Object.entries(idx)) {
      if (v === -1) {
        alert(
          "Campaign Order CSV structure mismatch.\nMissing header: " + k
        );
        return;
      }
    }

    /* ===== Aggregation ===== */
    const campaignMap = {};
    const dateMap = {};

    data.forEach(r => {
      const campaign = r[idx.campaign];
      if (!campaign) return;

      const advFsn = r[idx.advFsn];
      const date = r[idx.date];

      const du = +r[idx.direct] || 0;
      const iu = +r[idx.indirect] || 0;
      const units = du + iu;
      const revenue = +r[idx.revenue] || 0;

      /* Campaign */
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

      /* Campaign → Advertised FSN */
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

      /* Date Trend */
      if (!dateMap[date]) {
        dateMap[date] = {
          orders: 0,
          direct: 0,
          indirect: 0,
          units: 0,
          revenue: 0
        };
      }

      dateMap[date].orders++;
      dateMap[date].direct += du;
      dateMap[date].indirect += iu;
      dateMap[date].units += units;
      dateMap[date].revenue += revenue;
    });

    /* ===== Render Campaign Summary ===== */
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
          </tr>
        `;
      });

    /* ===== Render Campaign → FSN (Expand / Collapse) ===== */
    const fsnBody = document.querySelector("#corFsnTable tbody");
    fsnBody.innerHTML = "";

    let gid = 0;

    Object.entries(campaignMap).forEach(([campaign, v]) => {
      const groupId = "cor_grp_" + gid++;

      // Parent row (Campaign)
      fsnBody.innerHTML += `
        <tr class="cor-campaign-row" data-group="${groupId}">
          <td style="font-weight:600; cursor:pointer">▶ ${campaign}</td>
          <td>${v.orders}</td>
          <td>${v.units}</td>
          <td>${v.revenue.toFixed(0)}</td>
        </tr>
      `;

      // Child rows (Advertised FSN) – collapsed by default
      Object.entries(v.fsns).forEach(([fsn, x]) => {
        fsnBody.innerHTML += `
          <tr class="cor-fsn-row hidden" data-parent="${groupId}">
            <td style="padding-left:22px">${fsn}</td>
            <td>${x.orders}</td>
            <td>${x.units}</td>
            <td>${x.revenue.toFixed(0)}</td>
          </tr>
        `;
      });
    });

    // Toggle expand / collapse
    document.querySelectorAll(".cor-campaign-row").forEach(row => {
      row.addEventListener("click", () => {
        const g = row.dataset.group;
        const cell = row.querySelector("td");
        const children = document.querySelectorAll(
          `[data-parent="${g}"]`
        );

        const collapsed = children[0]?.classList.contains("hidden");

        children.forEach(r =>
          r.classList.toggle("hidden", !collapsed)
        );

        cell.innerHTML = cell.innerHTML.replace(
          collapsed ? "▶" : "▼",
          collapsed ? "▼" : "▶"
        );
      });
    });

    /* ===== Render Order Date Trend ===== */
    const dateBody = document.querySelector("#corDateTable tbody");
    dateBody.innerHTML = "";

    Object.entries(dateMap)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .forEach(([d, v]) => {
        dateBody.innerHTML += `
          <tr>
            <td>${d}</td>
            <td>${v.orders}</td>
            <td>${v.direct}</td>
            <td>${v.indirect}</td>
            <td>${v.units}</td>
            <td>${v.revenue.toFixed(0)}</td>
          </tr>
        `;
      });
  };

  reader.readAsText(fileInput.files[0]);
}
