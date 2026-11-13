// Self-driving demo / e2e smoke: open index.html?fast=1&drive=1 and the whole check-in
// answers itself by tapping (no mic needed). Pure test utility, like window.__say /
// window.__creatorConfirm — it no-ops without the ?drive=1 param and never touches data
// collection. Final state is written to document.title (E2E_PASS / E2E_ERR) so a headless
// browser can assert on it:
//   chrome --headless=new --dump-dom --virtual-time-budget=60000 \
//     "http://localhost:8765/index.html?fast=1&drive=1" | grep -o "E2E_[A-Z]*[^<]*"
if (new URLSearchParams(location.search).has("drive")) {
  const $ = (s) => document.querySelector(s);
  const tick = setInterval(() => {
    try {
      if (window.__lastRecord) {
        clearInterval(tick);
        const r = window.__lastRecord;
        const ok = r.persona && r.scales && r.tasks && r.postcard && r.persona_editor;
        document.title = (ok ? "E2E_PASS" : "E2E_ERR missing keys") + ` m${r.month} ${Object.keys(r).join(",")}`;
        return;
      }
      if (!$("#setup").hidden && $("#pid")) {
        $("#pid").value = "E2E-1"; $("#income").value = "4000"; $("#consent").checked = true;
        $("#setup-form").dispatchEvent(new Event("submit", { cancelable: true }));
        return;
      }
      if (!$("#creator").hidden) {
        const n = $("#iname");
        if (n && !n.value) n.value = "Momo";
        window.__creatorConfirm?.();
        return;
      }
      const bb = $("#bubbles");
      if (bb && !bb.hidden) { // thought-bubble board: answer each thought, then continue
        const todo = bb.querySelector(".bubble:not(.done)");
        const cont = bb.querySelector(".bcont");
        if (todo) todo.click();
        else if (cont && !cont.disabled) cont.click();
        return;
      }
      const dock = $("#dock .dock-inner");
      if (!dock) return;
      const send = dock.querySelector(".send");
      const ta = dock.querySelector("textarea");
      const num = dock.querySelector('input[type="number"]');
      const ranges = [...dock.querySelectorAll('input[type="range"]')];
      const opts = [...dock.querySelectorAll(".opt")];
      const fire = (el) => el.dispatchEvent(new Event("input", { bubbles: true }));
      if (ta) { ta.value = "I started a new job and I moved to a new apartment"; fire(ta); if (send && !send.disabled) send.click(); return; }
      if (num) { num.value = "35"; fire(num); if (send && !send.disabled) send.click(); return; }
      if (ranges.length) { for (const r of ranges) { r.value = r.max; fire(r); } if (send && !send.disabled) send.click(); return; }
      if (opts.length) {
        if (send) { // multi-select: click options until the Done button unlocks
          for (const o of opts) { if (send.disabled) o.click(); else break; }
          if (!send.disabled) send.click();
        } else opts[0].click(); // single choice
      }
    } catch (e) { document.title = "E2E_ERR " + e.message; clearInterval(tick); }
  }, 120);
}
