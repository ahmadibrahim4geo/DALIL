/**
 * Popup Redirector / Launcher to Spatial Dashboard
 */
document.addEventListener("DOMContentLoaded", () => {
  const language = localStorage.getItem("dalil_lang") === "en" ? "en" : "ar";
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  if (language === "en") {
    document.title = "DALIL";
    const fields = [[".brand-title","DALIL"],[".brand-sub","Discovery and Acquisition of Location Information & Listings"],[".brand-desc","Study areas, grid surveys and licensed GIS data exports."],["#btnOpen","Open workspace"]];
    fields.forEach(([selector,text]) => { const element = document.querySelector(selector); if (element) element.textContent = text; });
  }
  const btnOpen = document.getElementById("btnOpen");

  function openDashboard() {
    chrome.runtime.sendMessage({ action: "OPEN_DASHBOARD" }, () => {
      window.close();
    });
  }

  if (btnOpen) {
    btnOpen.addEventListener("click", openDashboard);
  }

  // التوجيه التلقائي الفوري إلى الداشبورد
  openDashboard();
});
