// ============================================================
// Crowdfunding Tracker Sync — content script (v1.4)
// Capture :
//  1) les réponses JSON (fetch + XHR) — quand l'app en fait
//  2) le DOM structuré : cards liste (LPB / Bricks portfolio),
//     page projet (h1 + montants), en cliquant automatiquement
//     les ONGLETS (Bricks : En cours / Remboursés / Terminés)
//     et les boutons « Charger plus » (LPB).
// NE MODIFIE RIEN de durable sur les pages (clics de navigation).
// ============================================================

(() => {
  let jsonSeen = 0;
  let fetchWrapped = 0;
  let domSent = 0;
  const host = location.hostname;
  const platform = host.includes("bricks") ? "bricks" : "lapremierebrique";

  function notify(type, payload) {
    try {
      chrome.runtime.sendMessage({ type, payload }).catch(() => {});
    } catch (e) {}
  }

  // ---------- wrapper fetch (réponses JSON) ----------
  const _fetch = window.fetch.bind(window);
  window.fetch = async function (...args) {
    fetchWrapped++;
    let url = "";
    try { url = typeof args[0] === "string" ? args[0] : (args[0]?.url || ""); } catch (e) {}
    const res = await _fetch(...args).catch((e) => { throw e; });
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("json")) {
        const clone = res.clone();
        const data = await clone.json().catch(() => null);
        if (data !== null) {
          jsonSeen++;
          notify("CT_CAPTURE", { url, body: data, status: res.status, platform, ts: Date.now() });
        }
      }
    } catch (e) {}
    return res;
  };

  // ---------- wrapper XMLHttpRequest (réponses JSON) ----------
  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__ctUrl = url || "";
    return _open.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const url = this.__ctUrl || "";
    this.addEventListener("load", function () {
      try {
        const ct = this.getResponseHeader("content-type") || "";
        if (ct.includes("json")) {
          let data = null;
          try { data = JSON.parse(this.responseText); } catch (e) {}
          if (data !== null) {
            jsonSeen++;
            notify("CT_CAPTURE", { url, body: data, status: this.status, platform, ts: Date.now() });
          }
        }
      } catch (e) {}
    });
    return _send.apply(this, args);
  };

  // ---------- utilitaires ----------
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const normName = (s) => (s || "").replace(/\s+/g, " ").trim();

  async function autoScroll() {
    try {
      for (let i = 0; i < 10; i++) {
        const before = window.scrollY;
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(300);
        if (i > 2 && window.scrollY === before) break;
        if (i > 2 && window.scrollY === document.body.scrollHeight) break;
      }
    } catch (e) {}
  }

  function clickTabs() {
    // Vrais onglets de statut UNIQUEMENT : role=tab, data-tab, Mantine.
    // JAMAIS de <a> avec href (externe ou non) — évite les liens Zendesk/aide.
    const els = document.querySelectorAll('[role="tab"], [data-tab], .mantine-Tabs-tab');
    const candidates = [];
    for (const el of els) {
      // exclure si l'élément ou un ancêtre est un lien <a href=...> (n'importe quel href)
      let node = el;
      let isLink = false;
      while (node && node !== document.documentElement) {
        if (node.tagName === "A" && node.hasAttribute("href")) { isLink = true; break; }
        node = node.parentElement;
      }
      if (isLink) continue;
      const t = normName(el.textContent);
      if (!t || t.length > 40) continue;
      if (/aide|help|support|zendesk|comprendre|mécanisme|mecanisme/i.test(t)) continue;
      let vis = false;
      try { vis = el.offsetParent !== null || el.getClientRects().length > 0; } catch (e) {}
      if (!vis) continue;
      // statut exact (mot entier) : « Remboursés (2) », « En cours », « Terminés »…
      if (/(^|\s)(en cours|actifs?|active|remboursés?|repaid|terminés?|completed|clos|closed|collecte|collecting|funded|financés?|investis?|historique|history|en attente|pending)(\s*\(\d+\))?($|\s)/i.test(t)) {
        candidates.push({ el, t });
      }
    }
    const seen = new Set();
    const clicked = [];
    for (const c of candidates) {
      if (seen.has(c.t)) continue;
      seen.add(c.t);
      // ne pas cliquer l'onglet déjà actif
      const sel = c.el.getAttribute("aria-selected");
      if (sel === "true") continue;
      try { c.el.click(); } catch (e) {}
      clicked.push(c.t);
    }
    return clicked;
  }

  function clickLoadMore() {
    // Boutons « Charger plus / Voir plus » — jamais de lien <a href>
    const els = document.querySelectorAll("button, [role='button']");
    for (const el of els) {
      let isLink = false;
      let node = el;
      while (node && node !== document.documentElement) {
        if (node.tagName === "A" && node.hasAttribute("href")) { isLink = true; break; }
        node = node.parentElement;
      }
      if (isLink) continue;
      const t = normName(el.textContent);
      if (!t || t.length > 60) continue;
      if (/charger plus|voir plus|afficher plus|load more|voir davantage|afficher davantage|charger davantage|show more/i.test(t)) {
        try { el.click(); } catch (e) {}
        return true;
      }
    }
    return false;
  }

  // Onglet actif avant les clics (pour restaurer la vue de l'utilisateur)
  function activeTab() {
    try {
      const el = document.querySelector('[role="tab"][aria-selected="true"], .mantine-Tabs-tab[data-active], .mantine-Tabs-tab[aria-selected="true"]');
      if (el) return { el, t: normName(el.textContent) };
    } catch (e) {}
    return null;
  }

  function collectLpbCards() {
    // cards liste LPB : a[href*="/fr/investissements/"]
    const out = [];
    const seen = new Set();
    const links = document.querySelectorAll('a[href*="/fr/investissements/"]');
    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const m = href.match(/\/fr\/investissements\/(\d+)/);
      if (!m) continue;
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      const h3 = a.querySelector("h3") || a.querySelector("h2") || a.querySelector("[class*='title']");
      const name = h3 ? normName(h3.textContent) : "";
      if (!name) continue;
      const txt = a.innerText || "";
      const card = { name };
      const mi = txt.match(/Montant investi\s*([\d\s.,]+)\s*€/i);
      if (mi) card.invested = parseFloat(mi[1].replace(/\s/g, "").replace(",", "."));
      const badge = a.querySelector(".badge");
      if (badge) card.status = normName(badge.textContent);
      const dt = txt.match(/le\s+(\d{1,2}\s+\w+\s+\d{4})/);
      if (dt) card.date = dt[1];
      const st = card.status || "";
      const endM = st.match(/Terminé le\s+(\d{1,2}\s+\w+\.?\s+\d{4})/i) || st.match(/Remboursé(?: le)?\s*(?:(\d{1,2}\s+\w+\.?\s+\d{4}))?/i);
      if (endM && endM[1]) card.end_date = endM[1];
      // Taux UNIQUEMENT avec label explicite (sinon rendement cumulé)
      const rt = txt.match(/(?:taux|rendement annuel|rendement brut|annuel|par an)\s*:?\s*([\d.,]+)\s*%/i);
      if (rt) card.rate = parseFloat(rt[1].replace(",", "."));
      // Durée UNIQUEMENT avec label « durée » et sans « restant »
      const dm = txt.match(/(?:durée de vie du contrat|durée du contrat|durée totale|durée prévue|durée du projet|durée)\s*:?\s*(\d{1,3})\s*mois/i);
      if (dm && !/restant|restante|il y a/i.test(txt)) card.duration_months = parseInt(dm[1], 10);
      out.push(card);
    }
    return out;
  }

  function collectBricksCards() {
    // 1) cards de liste : liens portfolio-project/<uuid>
    const out = [];
    const seen = new Set();
    const links = document.querySelectorAll('a[href*="portfolio-project/"], a[href*="portfolio/properties"]');
    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const m = href.match(/portfolio-project\/([0-9a-f-]{36})/) || href.match(/portfolio\/properties[^"]*propertyId=([0-9a-f-]{36})/);
      if (!m) continue;
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      const h = a.querySelector("h3") || a.querySelector("h2") || a.querySelector("[class*='title']") || a.querySelector(".fw-semibold");
      const name = h ? normName(h.textContent) : "";
      if (!name) continue;
      const txt = a.innerText || "";
      const card = { name };
      const mi = txt.match(/(?:Investi|Montant investi|investissement)\s*:?\s*([\d][\d\s.,]*)\s*€/i) || txt.match(/([\d][\d\s.,]*)\s*€/);
      if (mi) card.invested = parseFloat(mi[1].replace(/\s/g, "").replace(",", "."));
      const st = normName(a.querySelector(".badge") ? a.querySelector(".badge").textContent : "");
      if (st) card.status = st;
      // Taux UNIQUEMENT avec label explicite (sinon « 31,4 % » = rendement cumulé)
      const rt = txt.match(/(?:taux|rendement annuel|rendement brut|annuel|par an)\s*:?\s*([\d.,]+)\s*%/i);
      if (rt) card.rate = parseFloat(rt[1].replace(",", "."));
      // Durée UNIQUEMENT avec label « durée » et sans « restant »
      const dm = txt.match(/(?:durée de vie du contrat|durée du contrat|durée totale|durée prévue|durée du projet|durée)\s*:?\s*(\d{1,3})\s*mois/i);
      if (dm && !/restant|restante|il y a/i.test(txt)) card.duration_months = parseInt(dm[1], 10);
      out.push(card);
    }
    // 2) page projet unique : h1/h2 = nom (le vrai contenu est souvent dans une IFRAME)
    if (!out.length) {
      // 2a) essayer les iframes same-origin (contenu projet Bricks)
      try {
        for (const f of document.querySelectorAll("iframe")) {
          const doc = f.contentDocument;
          if (!doc) continue;
          const h1 = doc.querySelector("h1") || doc.querySelector("h2");
          const pname = h1 ? normName(h1.textContent) : "";
          if (pname && pname.length > 2 && pname.length < 120 && !/^(mes |mon |portfolio|investissements|accueil)/i.test(pname)) {
            const txt = (doc.body ? doc.body.innerText : "") || "";
            const card = { name: pname, _from_iframe: true };
            if (/royalt/i.test(txt.slice(0, 3000))) card.contract_type = "royalty";
            const invMatch = txt.match(/(?:Investi|Montant investi|Capital investi|investissement)\s*:?\s*([\d][\d\s.,]*)\s*€/i);
            if (invMatch) {
              card.invested = parseFloat(invMatch[1].replace(/\s/g, "").replace(",", "."));
            } else {
              const amounts = [...txt.matchAll(/([\d][\d\s.,]*)\s*€/g)].map(m => parseFloat(m[1].replace(/\s/g, "").replace(",", "."))).filter(v => v >= 1);
              if (amounts.length) {
                card.invested = Math.max(...amounts);
                card._amounts = [...new Set(amounts)].slice(0, 20);
              }
            }
            const rt = txt.match(/(?:taux|rendement annuel|rendement brut|annuel|par an)\s*:?\s*([\d.,]+)\s*%/i);
            if (rt) card.rate = parseFloat(rt[1].replace(",", "."));
            const dm = txt.match(/(?:durée de vie du contrat|durée du contrat|durée totale|durée prévue|durée du projet|durée)\s*:?\s*(\d{1,3})\s*mois/i);
            if (dm && !/restant|restante|il y a/i.test(txt)) card.duration_months = parseInt(dm[1], 10);
            // Revenus cumulés → interest_received
            const rc = txt.match(/revenus cumulés\s*:?\s*[+]?([\d][\d\s.,]*)\s*€/i);
            if (rc) card.interest_received = parseFloat(rc[1].replace(/\s/g, "").replace(",", "."));
            // Échéance : « Remboursement final X € <Mois> <Année> » ou mot-clé + date
            const endM = txt.match(/Remboursement final\s*[\d\s.,]*€?\s*([a-zA-Zéû]+\.?)\s+(\d{4})/i)
              || txt.match(/(?:Échéance|écheance|Jusqu'au|jusqu'au|Remboursement prévu|remboursement prévu|Maturité|maturité|Date de fin|date de fin|Terminé le|terminé le)\s*:?\s*(\d{1,2}\s+\w+\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i);
            if (endM) card.end_date = (endM[1] && endM[2]) ? (endM[1] + " " + endM[2]) : endM[1];
            out.push(card);
          }
        }
      } catch (e) {}
      // 2b) sinon, h1/h2 du document courant
      if (!out.length) {
        const h1 = document.querySelector("h1") || document.querySelector("h2");
        const pname = h1 ? normName(h1.textContent) : "";
        if (pname && pname.length > 2 && pname.length < 120 && !/^(mes |mon |portfolio|investissements|accueil)/i.test(pname)) {
          const txt = document.body ? document.body.innerText : "";
          const card = { name: pname };
          if (/royalt/i.test(txt.slice(0, 3000))) card.contract_type = "royalty";
          const invMatch = txt.match(/(?:Investi|Montant investi|Capital investi|investissement)\s*:?\s*([\d][\d\s.,]*)\s*€/i);
          if (invMatch) {
            card.invested = parseFloat(invMatch[1].replace(/\s/g, "").replace(",", "."));
          } else {
            const amounts = [...txt.matchAll(/([\d][\d\s.,]*)\s*€/g)].map(m => parseFloat(m[1].replace(/\s/g, "").replace(",", "."))).filter(v => v >= 1);
            if (amounts.length) {
              card.invested = Math.max(...amounts);
              card._amounts = [...new Set(amounts)].slice(0, 20);
            }
          }
          const rt = txt.match(/(?:taux|rendement annuel|rendement brut|annuel|par an)\s*:?\s*([\d.,]+)\s*%/i);
          if (rt) card.rate = parseFloat(rt[1].replace(",", "."));
          const dm = txt.match(/(?:durée de vie du contrat|durée du contrat|durée totale|durée prévue|durée du projet|durée)\s*:?\s*(\d{1,3})\s*mois/i);
          if (dm && !/restant|restante|il y a/i.test(txt)) card.duration_months = parseInt(dm[1], 10);
          const endM = txt.match(/(?:Échéance|écheance|Jusqu'au|jusqu'au|Remboursement prévu|remboursement prévu|Maturité|maturité|Date de fin|date de fin|Terminé le|terminé le)\s*:?\s*(\d{1,2}\s+\w+\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i);
          if (endM) card.end_date = endM[1];
          out.push(card);
        }
      }
    }
    return out;
  }

  // ---------- extraction DOM complète (onglets + charger plus + fusion) ----------
  async function extractDom() {
    const body = {};
    try {
      await autoScroll();

      let allCards = [];
      let allTexts = [];
      const isLpbDetail = /\/fr\/investissements\/\d+/.test(location.pathname);

      const collect = () => {
        if (platform === "bricks" && !isLpbDetail) {
          allCards = allCards.concat(collectBricksCards());
        } else if (!isLpbDetail) {
          allCards = allCards.concat(collectLpbCards());
        } else {
          allCards = allCards.concat(collectBricksCards()); // page détail LPB → générique h1
        }
        const t = (document.body ? document.body.innerText : "").replace(/\n{3,}/g, "\n\n").slice(0, 60000);
        if (t.length > 50) allTexts.push(t);
      };

      collect();

      // « Charger plus » (LPB) : boucle jusqu'à épuisement
      for (let i = 0; i < 12; i++) {
        const before = allCards.length;
        const clicked = clickLoadMore();
        if (!clicked) break;
        await sleep(1100);
        await autoScroll();
        collect();
        if (allCards.length === before) break;
      }

      // fusion + dédup par nom
      const seenCards = new Set();
      const cards = [];
      for (const c of allCards) {
        const k = normName(c.name).toLowerCase();
        if (!k || seenCards.has(k)) continue;
        seenCards.add(k);
        cards.push(c);
      }

      if (cards.length) {
        if (platform === "bricks") body.cards = cards;
        else body.lpb_cards = cards;
      }
      // texte fusionné (dédup grossier : on garde le plus long)
      // Bricks : inner_text UNIQUEMENT sur les pages PROJET (portfolio-project/<uuid>
      // ou portfolio/properties?propertyId=) — la page Suivi/revenues pollue
      // (« Restant X mois », rendements cumulés…)
      const isBricksProjectPage = platform === "bricks" && (
        /portfolio-project\/[0-9a-f-]{36}/.test(location.href)
        || /portfolio\/properties\?[^#]*propertyId=/.test(location.href)
      );
      if (allTexts.length && (platform !== "bricks" || cards.length || isBricksProjectPage)) {
        let best = "";
        for (const t of allTexts) if (t.length > best.length) best = t;
        body.inner_text = best.slice(0, 60000);
      }
      if (isBricksProjectPage) body._bricks_project_page = true;
    } catch (e) {}
    if (Object.keys(body).length) {
      domSent++;
      notify("CT_CAPTURE", { url: location.href, body: { _dom: body }, status: 200, platform, ts: Date.now() });
    }
  }

  // Déclenche l'extraction DOM après le rendu (délai) + sur les navigations SPA
  let domTimer = null;
  function scheduleDom() {
    clearTimeout(domTimer);
    domTimer = setTimeout(extractDom, 1800);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleDom);
  } else {
    scheduleDom();
  }
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleDom();
    }
  }).observe(document.documentElement, { subtree: true, childList: true });

  // ---------- ping de diagnostic ----------
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "CT_PING") {
      sendResponse({ ok: true, jsonSeen, fetchWrapped, domSent, url: location.href, platform });
    }
    if (msg && msg.type === "CT_FORCE_CAPTURE") {
      extractDom();
      sendResponse({ ok: true, domSent });
    }
    return true;
  });

  notify("CT_INJECTED", { url: location.href, platform });
})();
