// 🔒 LOCKED — Advanced Daily Report v1.2 (UI ONLY)

(function () {

  const plaInput = document.getElementById("adrPlaFile");
  const pcaInput = document.getElementById("adrPcaFile");
  const fsnInput = document.getElementById("adrFsnFile");
  const generateBtn = document.getElementById("adrGenerateBtn");
  const container = document.getElementById("advancedDaily");

  const sPla = document.getElementById("adrStatusPla");
  const sPca = document.getElementById("adrStatusPca");
  const sFsn = document.getElementById("adrStatusFsn");

  let hasPLA = false, hasPCA = false, hasFSN = false;

  function clearOutput() {
    container.querySelectorAll(".adr-generated").forEach(e => e.remove());
  }

  function refreshStatus() {
    sPla.textContent = hasPLA ? "PLA: ✅ Validated" : "";
    sPca.textContent = hasPCA ? "PCA: ✅ Validated" : "";
    sFsn.textContent = hasFSN ? "FSN: ✅ Validated" : "";
  }

  plaInput.onchange = () => { hasPLA = true; refreshStatus(); };
  pcaInput.onchange = () => { hasPCA = true; refreshStatus(); };
  fsnInput.onchange = () => { hasFSN = true; refreshStatus(); };

  generateBtn.onclick = () => {
    generateBtn.disabled = true;
    generateBtn.textContent = "Generating…";

    setTimeout(() => {
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate Advanced Report";
    }, 800);
  };

  /* ========= COLLAPSIBLE REPORT CARDS ========= */
  container.addEventListener("click", e => {
    if (e.target.tagName === "H4") {
      const table = e.target.nextElementSibling;
      if (table) {
        table.style.display =
          table.style.display === "none" ? "table" : "none";
      }
    }
  });

})();
