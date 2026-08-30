// ============================================================
// Crowdfunding Tracker Sync — service worker (background) v1.1
// Stocke les captures dans chrome.storage.local + diagnostics.
// ============================================================

const DEFAULT_SERVER = "http://localhost:8016";
const MAX_CAPTURES = 800;

async function getState() {
  const s = await chrome.storage.local.get(["captures", "server", "token", "diag"]);
  return {
    captures: s.captures || [],
    server: s.server || DEFAULT_SERVER,
    token: s.token || "",
    diag: s.diag || { injected: [], jsonSeen: 0, lastUrl: "" },
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  if (msg.type === "CT_CAPTURE") {
    (async () => {
      const { captures } = await getState();
      const p = msg.payload || {};
      captures.push({ url: String(p.url || "").slice(0, 600), body: p.body, status: p.status, platform: p.platform, ts: p.ts });
      const dedup = new Map();
      for (const c of captures) dedup.set(c.url, c);
      const list = [...dedup.values()].slice(-MAX_CAPTURES);
      const diag = (await getState()).diag;
      diag.jsonSeen = (diag.jsonSeen || 0) + 1;
      diag.lastUrl = String(p.url || "").slice(0, 200);
      await chrome.storage.local.set({ captures: list, diag });
      await updateBadge(list.length);
      sendResponse({ ok: true, n: list.length });
    })();
    return true;
  }

  if (msg.type === "CT_INJECTED") {
    (async () => {
      const { diag } = await getState();
      const p = msg.payload || {};
      const entry = { url: (p.url || "").slice(0, 200), platform: p.platform || "", at: new Date().toLocaleTimeString("fr-FR") };
      const arr = diag.injected || [];
      if (!arr.some(e => e.url === entry.url)) arr.push(entry);
      diag.injected = arr.slice(-10);
      await chrome.storage.local.set({ diag });
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.type === "CT_SEND") {
    (async () => {
      const { captures, server, token } = await getState();
      if (!captures.length) {
        sendResponse({ ok: false, error: "Aucune capture. Recharge les pages Bricks/LPB (F5) puis navigue dans tes investissements.", diag: (await getState()).diag });
        return;
      }
      if (!token) { sendResponse({ ok: false, error: "Token manquant : ouvre les Options de l'extension et colle le token (Paramètres de l'app)." }); return; }
      try {
        const res = await fetch(server + "/api/scrape/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Sync-Token": token },
          body: JSON.stringify({ captures }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || ("HTTP " + res.status));
        await chrome.storage.local.set({ captures: [] });
        await updateBadge(0);
        sendResponse({ ok: true, data });
      } catch (e) {
        sendResponse({ ok: false, error: String(e.message || e) });
      }
    })();
    return true;
  }

  if (msg.type === "CT_GET_STATE") {
    (async () => {
      const s = await getState();
      sendResponse({ captures: s.captures.length, server: s.server, hasToken: !!s.token, diag: s.diag });
    })();
    return true;
  }

  if (msg.type === "CT_CLEAR") {
    (async () => {
      await chrome.storage.local.set({ captures: [], diag: { injected: [], jsonSeen: 0, lastUrl: "" } });
      await updateBadge(0);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.type === "CT_PING_TAB") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) { sendResponse({ ok: false, error: "Aucun onglet actif" }); return; }
        const resp = await chrome.tabs.sendMessage(tab.id, { type: "CT_PING" });
        sendResponse({ ok: true, tab: tab.url, info: resp });
      } catch (e) {
        sendResponse({ ok: false, error: "Content script non injecté sur cet onglet (recharge la page) : " + String(e.message || e) });
      }
    })();
    return true;
  }

  if (msg.type === "CT_FORCE_TAB") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) { sendResponse({ ok: false, error: "Aucun onglet actif" }); return; }
        const resp = await chrome.tabs.sendMessage(tab.id, { type: "CT_FORCE_CAPTURE" });
        sendResponse({ ok: true, tab: tab.url, info: resp });
      } catch (e) {
        sendResponse({ ok: false, error: String(e.message || e) });
      }
    })();
    return true;
  }
});

async function updateBadge(n) {
  try {
    await chrome.action.setBadgeText({ text: n ? String(n) : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#f97316" });
  } catch (e) {}
}

chrome.runtime.onInstalled.addListener(() => updateBadge(0));
