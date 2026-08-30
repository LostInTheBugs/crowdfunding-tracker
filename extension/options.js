const $ = id => document.getElementById(id);

const DEFAULT_SERVER = "http://localhost:8016";

chrome.storage.local.get(["server", "token"], (s) => {
  $("server").value = s.server || DEFAULT_SERVER;
  $("token").value = s.token || "";
});

$("save").addEventListener("click", async () => {
  const server = $("server").value.trim().replace(/\/+$/, "");
  const token = $("token").value.trim();
  await chrome.storage.local.set({ server, token });
  const el = $("msg");
  el.textContent = "✅ Enregistré";
  el.className = "ok";
  setTimeout(() => (el.textContent = ""), 2000);
});
