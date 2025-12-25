/*************************************************
 * CAMPAIGN ORDER REPORT
 * Fully isolated module
 *
 * FIXED HEADER CONTRACT (DO NOT CHANGE):
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
  if (btn) btn.addEventListener("click", generateCampaignOrderReport);
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

    for (const [k, v] of Object.entries(idx)) {
      if (v === -1) {
        alert("Campaign Order CSV missing header: " + k);
        return;
      }
    }

    /* ===== Aggregation ===== */
    const campaignMap = {};
    const dateMap = {};

    data.forEach(r => {
      const c = r[idx.campaign];
      if (!c) return;

      const fsn = r[idx.advFsn];
      const date = r[idx.date];

      const du = +r[idx.direct] || 0;
      const iu = +r[idx.indirect] || 0;
      const units = du + iu;
      const rev = +r[idx.revenue] || 0;

      /* Campaign */
      if (!campaignMap[c]) {
        campaignMap[c] = {
          orders: 0,
          direct: 0,
          indirect: 0,
          units: 0,
          revenue: 0,
          fsns: {}
        };
      }

      campaignMap[c].orders++;
      campaignMap[c].direct += du;
      campaignMap[c].indirect += iu;
      campaignMap[c].units += units;
      campaignMap[c].revenue += rev;

      /* Campaign → FSN */
      if (!campaignMap[c].fsns[fsn]) {
        campaignMap[c].fsns[fsn] = {
          orders: 0,
          units: 0,
          revenue: 0
        };
      }

      campaignMap[c].fsns[fsn].orders++;
      campaignMap[c].fsns[fsn].units += units;
      campaignMap[c].fsns[fsn].revenue += rev;

      /* Date */
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
      dateMap[date].revenue += rev;
    });

    /* ================= CAMPAIGN SUMMARY ================= */
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

    /* ================= CAMPAIGN → FSN (EXPAND / COLLAPSE) ================= */
    const fsnBody = document.querySelector("#corFsnTable tbody");
    fsnBody.innerHTML = "";

    let gid = 0;

    Object.entries(campaignMap).forEach(([c, v]) => {
      const g = "grp_" + gid++;

      fsnBody.innerHTML += `
        <tr class="cor-campaign-row" data-group="${g}">
          <td style="cursor:pointer;font-weight:600">▶ ${c}</td>
          <td>${v.orders}</td>
          <td>${v.units}</td>
          <td>${v.revenue.toFixed(0)}</td>
        </tr>`;

      Object.entries(v.fsns).forEach(([fsn, x]) => {
        fsnBody.innerHTML += `
          <tr class="cor-fsn-row hidden" data-parent="${g}">
            <td style="padding-left:22px">${fsn}</td>
            <td>${x.orders}</td>
            <td>${x.units}</td>
            <td>${x.revenue.toFixed(0)}</td>
          </tr>`;
      });
    });

    document.querySelectorAll(".cor-campaign-row").forEach(row => {
      row.onclick = () => {
        const g = row.dataset.group;
        const cell = row.querySelector("td");
        const children = document.querySelectorAll(`[data-parent="${g}"]`);
        const collapsed = children[0]?.classList.contains("hidden");

        children.forEach(r =>
          r.classList.toggle("hidden", !collapsed)
        );

        cell.innerHTML = cell.innerHTML.replace(
          collapsed ? "▶" : "▼",
          collapsed ? "▼" : "▶"
        );
      };
    });

    /* ================= ORDER DATE TREND ================= */
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
          </tr>`;
      });

    /* ================= DIRECT vs INDIRECT IMPACT ================= */

    // Campaign level
    const diCampBody = document.querySelector("#diCampaignTable tbody");
    diCampBody.innerHTML = "";

    Object.entries(campaignMap).forEach(([c, v]) => {
      const assist =
        (v.indirect / Math.max(v.direct + v.indirect, 1)) * 100;

      const directRev =
        v.revenue * (v.direct / Math.max(v.direct + v.indirect, 1));
      const indirectRev =
        v.revenue * (v.indirect / Math.max(v.direct + v.indirect, 1));

      diCampBody.innerHTML += `
        <tr>
          <td>${c}</td>
          <td>${v.direct}</td>
          <td>${v.indirect}</td>
          <td>${assist.toFixed(1)}%</td>
          <td>${directRev.toFixed(0)}</td>
          <td>${indirectRev.toFixed(0)}</td>
        </tr>`;
    });

    // FSN level (proxy split)
    const diFsnBody = document.querySelector("#diFsnTable tbody");
    diFsnBody.innerHTML = "";

    Object.entries(campaignMap).forEach(([_, v]) => {
      const assistRatio =
        v.indirect / Math.max(v.direct + v.indirect, 1);

      Object.entries(v.fsns).forEach(([fsn, x]) => {
        diFsnBody.innerHTML += `
          <tr>
            <td>${fsn}</td>
            <td>${Math.round(x.units * (1 - assistRatio))}</td>
            <td>${Math.round(x.units * assistRatio)}</td>
            <td>${(assistRatio * 100).toFixed(1)}%</td>
            <td>${x.revenue.toFixed(0)}</td>
          </tr>`;
      });
    });
  };

  reader.readAsText(fileInput.files[0]);
}
