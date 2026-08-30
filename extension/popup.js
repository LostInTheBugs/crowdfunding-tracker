const $ = id => document.getElementById(id);

function renderDiag(diag) {
  const box = $("diagBox");
  if (!diag) { box.textContent = ""; return; }
  const lines = [
    "— Diagnostic —",
    "Pages où l'extension est active :",
    ...(diag.injected && diag.injected.length ? diag.injected.map(e => "  • " + e.at + " " + e.platform + " — " + e.url) : ["  (aucune pour l'instant — recharge tes onglets Bricks/LPB)"]),
    "JSON vus : " + (diag.jsonSeen || 0),
    "Dernier JSON : " + (diag.lastUrl || "—"),
  ];
  box.textContent = lines.join("\n");
}

function refresh() {
  chrome.runtime.sendMessage({ type: "CT_GET_STATE" }, (r) => {
    if (!r) return;
    $("count").textContent = r.captures;
    $("cfg").textContent = "Serveur : " + r.server + (r.hasToken ? " · token ✓" : " · token manquant ⚠️");
    renderDiag(r.diag);
  });
}

function msg(txt, cls) {
  const el = $("msg");
  el.textContent = txt;
  el.className = cls || "";
}

$("send").addEventListener("click", () => {
  const btn = $("send");
  btn.disabled = true;
  btn.textContent = "⏳ Envoi…";
  msg("", "");
  chrome.runtime.sendMessage({ type: "CT_SEND" }, (r) => {
    btn.disabled = false;
    btn.textContent = "📤 Envoyer au tracker";
    if (r && r.ok) {
      msg("✅ Envoyé : " + JSON.stringify(r.data.summary || r.data), "ok");
    } else {
      msg("❌ " + (r ? r.error : "Réponse vide (recharge la page)"), "err");
      if (r && r.diag) renderDiag(r.diag);
    }
    refresh();
  });
});

$("ping").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CT_PING_TAB" }, (r) => {
    if (r && r.ok) {
      msg("✅ Extension active sur : " + (r.info ? r.info.url.slice(0, 80) : r.tab) + "\nJSON vus ici : " + (r.info ? r.info.jsonSeen : "?") + " · fetch wrapés : " + (r.info ? r.info.fetchWrapped : "?"), "ok");
    } else {
      msg("❌ " + (r ? r.error : "Pas de réponse"), "err");
    }
  });
});

$("clear").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CT_CLEAR" }, () => {
    msg("Captures vidées", "ok");
    refresh();
  });
});

$("opts").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

refresh();
