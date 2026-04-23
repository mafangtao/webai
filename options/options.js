import { getConfig, setConfig, setPrompts, resetPrompts } from "../background/storage.js";

let cfg;
let MODELS = [];
let onlyFree = false;

async function init() {
  cfg = await getConfig();
  bindTabs();
  renderOpenRouter();
  renderBailian();
  renderBackend();
  await loadModels(false);
  renderDefaultModel();
  renderRows();
}

function renderBackend() {
  const url = document.getElementById("beUrl");
  const tok = document.getElementById("beToken");
  const state = document.getElementById("beState");
  url.value = cfg.backend.url || "";
  tok.value = cfg.backend.token || "";
  document.getElementById("beSave").onclick = async () => {
    cfg = await setConfig({ backend: { url: url.value.trim(), token: tok.value.trim() } });
    state.textContent = "✓ 已保存";
    state.style.color = "#059669";
  };
  document.getElementById("beTest").onclick = async () => {
    state.textContent = "测试中…"; state.style.color = "#6b7280";
    const r = await chrome.runtime.sendMessage({ type: "WEBAI_TEST_BACKEND" });
    state.textContent = r.message;
    state.style.color = r.ok ? "#059669" : "#b91c1c";
  };
  document.getElementById("beRefreshCats").onclick = async () => {
    state.textContent = "拉取分类…"; state.style.color = "#6b7280";
    const r = await chrome.runtime.sendMessage({ type: "WEBAI_FETCH_CATEGORIES" });
    if (r.ok) {
      cfg = await getConfig();
      state.textContent = `✓ 已缓存 ${r.categories.length} 个分类: ${r.categories.map(c=>c.name).join(", ").slice(0,200)}`;
      state.style.color = "#059669";
    } else {
      state.textContent = "失败: " + r.error;
      state.style.color = "#b91c1c";
    }
  };
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach(t => {
    t.onclick = async () => {
      const prov = t.dataset.prov;
      // Clear stale per-prompt model ids from the previous provider so they fall back to defaultModel
      const clearedPrompts = cfg.prompts.map(p => ({ ...p, model: "" }));
      cfg = await setConfig({ auth: { ...cfg.auth, provider: prov }, prompts: clearedPrompts, defaultModel: "" });
      activateTab(prov);
      await loadModels(false);
      renderDefaultModel();
      renderRows();
    };
  });
  activateTab(cfg.auth.provider);
}
function activateTab(prov) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.prov === prov));
  document.querySelectorAll(".pane").forEach(p => p.classList.toggle("active", p.dataset.pane === prov));
}

function renderOpenRouter() {
  const k = document.getElementById("orKey");
  k.value = cfg.auth.openrouter.apiKey || "";
  updateORState();
  document.getElementById("loginOR").onclick = async () => {
    document.getElementById("orState").textContent = "浏览器授权中…";
    const r = await chrome.runtime.sendMessage({ type: "WEBAI_LOGIN_OPENROUTER" });
    if (r?.ok) { cfg = await getConfig(); k.value = cfg.auth.openrouter.apiKey; updateORState(); await loadModels(true); renderDefaultModel(); renderRows(); }
    else document.getElementById("orState").textContent = "失败: " + (r?.error || "");
  };
  document.getElementById("saveOR").onclick = async () => {
    cfg = await setConfig({ auth: { ...cfg.auth, openrouter: { ...cfg.auth.openrouter, apiKey: k.value.trim() } } });
    updateORState(); await loadModels(true); renderDefaultModel(); renderRows();
  };
  document.getElementById("testOR").onclick = async () => {
    const out = document.getElementById("orTest");
    out.textContent = "测试中…";
    const r = await chrome.runtime.sendMessage({ type: "WEBAI_TEST_API", provider: "openrouter" });
    out.textContent = r.message;
    out.style.color = r.ok ? "#059669" : "#b91c1c";
  };
  document.getElementById("logoutOR").onclick = async () => {
    await chrome.runtime.sendMessage({ type: "WEBAI_LOGOUT", provider: "openrouter" });
    cfg = await getConfig(); k.value = ""; updateORState();
  };
}
function updateORState() {
  const key = cfg.auth.openrouter.apiKey;
  document.getElementById("orState").textContent = key
    ? `已配置 ${cfg.auth.openrouter.email ? `(${cfg.auth.openrouter.email}) ` : ""}${key.slice(0,10)}…${key.slice(-4)}`
    : "未配置";
}

function renderBailian() {
  const k = document.getElementById("baiKey");
  k.value = cfg.auth.bailian.apiKey || "";
  updateBaiState();
  document.getElementById("saveBai").onclick = async () => {
    cfg = await setConfig({ auth: { ...cfg.auth, bailian: { apiKey: k.value.trim() } } });
    updateBaiState(); await loadModels(true); renderDefaultModel(); renderRows();
  };
  document.getElementById("testBai").onclick = async () => {
    const out = document.getElementById("baiTest");
    out.textContent = "测试中…（会发送一条 ping 给 qwen-turbo）";
    const r = await chrome.runtime.sendMessage({ type: "WEBAI_TEST_API", provider: "bailian" });
    out.textContent = r.message;
    out.style.color = r.ok ? "#059669" : "#b91c1c";
  };
  document.getElementById("logoutBai").onclick = async () => {
    await chrome.runtime.sendMessage({ type: "WEBAI_LOGOUT", provider: "bailian" });
    cfg = await getConfig(); k.value = ""; updateBaiState();
  };
}
function updateBaiState() {
  const key = cfg.auth.bailian.apiKey;
  document.getElementById("baiState").textContent = key ? `已配置 ${key.slice(0,8)}…${key.slice(-4)}` : "未配置";
}

async function loadModels(force) {
  const state = document.getElementById("modelsState");
  const provider = cfg.auth.provider;
  state.textContent = "加载中…";
  const r = await chrome.runtime.sendMessage({ type: "WEBAI_FETCH_MODELS", provider });
  if (r?.ok) {
    MODELS = r.models;
    await setConfig({ availableModels: MODELS });
    cfg.availableModels = MODELS;
    const freeN = MODELS.filter(m => m.free).length;
    state.textContent = `共 ${MODELS.length} 个模型（${freeN} 免费）· 来源：${provider}`;
  } else {
    MODELS = [];
    state.textContent = "加载失败: " + (r?.error || "unknown");
  }
}

document.getElementById("refreshModels").onclick = () => loadModels(true).then(() => { renderDefaultModel(); renderRows(); });
document.getElementById("onlyFree").onchange = e => { onlyFree = e.target.checked; renderDefaultModel(); renderRows(); };

function filtered() { return onlyFree ? MODELS.filter(m => m.free) : MODELS; }

function buildSelect(value, allowInherit = false) {
  const sel = document.createElement("select");
  if (allowInherit) {
    const o = document.createElement("option");
    o.value = ""; o.textContent = "（继承默认）";
    sel.appendChild(o);
  }
  const list = filtered();
  const free = list.filter(m => m.free);
  const paid = list.filter(m => !m.free);
  const group = (label, arr) => {
    if (!arr.length) return;
    const g = document.createElement("optgroup"); g.label = label;
    for (const m of arr) {
      const o = document.createElement("option");
      o.value = m.id;
      const price = m.free ? "FREE" :
        (m.promptPrice || m.completionPrice
          ? `$${(m.promptPrice*1e6).toFixed(2)}/M in · $${(m.completionPrice*1e6).toFixed(2)}/M out`
          : "");
      o.textContent = price ? `${m.name} — ${price}` : m.name;
      g.appendChild(o);
    }
    sel.appendChild(g);
  };
  group("免费", free);
  group("付费", paid);
  if (value && !list.some(m => m.id === value)) {
    const o = document.createElement("option"); o.value = value; o.textContent = value + " (自定义)";
    sel.appendChild(o);
  }
  sel.value = value || "";
  return sel;
}

function renderDefaultModel() {
  const old = document.getElementById("defaultModel");
  const fresh = buildSelect(cfg.defaultModel || "");
  fresh.id = "defaultModel";
  fresh.style.minWidth = "360px";
  fresh.onchange = () => { cfg.defaultModel = fresh.value; setConfig({ defaultModel: fresh.value }); };
  old.parentNode.replaceChild(fresh, old);
}

function renderRows() {
  const rowsEl = document.getElementById("rows");
  rowsEl.innerHTML = "";
  cfg.prompts.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "prompt-row";
    row.draggable = true;
    row.dataset.idx = idx;
    row.innerHTML = `
      <button class="star-btn ${p.default ? "on" : ""}" title="设为默认">★</button>
      <input type="text" class="sc-input" placeholder="/cmd" />
      <div>
        <input type="text" class="title-input" placeholder="标题" />
        <textarea placeholder="system prompt"></textarea>
      </div>
      <div class="model-slot"></div>
      <div class="drag" title="拖动">⋮⋮</div>
      <button class="del" title="删除">✕</button>`;
    const starBtn = row.querySelector(".star-btn");
    const scInput = row.querySelector(".sc-input");
    const titleInput = row.querySelector(".title-input");
    const sysInput = row.querySelector("textarea");
    const modelSlot = row.querySelector(".model-slot");
    const delBtn = row.querySelector(".del");

    scInput.value = p.shortcut || "";
    titleInput.value = p.title || "";
    sysInput.value = p.system || "";

    const modelSel = buildSelect(p.model || "", true);
    modelSel.onchange = () => { p.model = modelSel.value; setPrompts(cfg.prompts); };
    modelSlot.appendChild(modelSel);

    starBtn.onclick = () => { cfg.prompts.forEach(x => x.default = false); p.default = true; setPrompts(cfg.prompts); renderRows(); };
    scInput.oninput = () => { p.shortcut = scInput.value; setPrompts(cfg.prompts); };
    titleInput.oninput = () => { p.title = titleInput.value; setPrompts(cfg.prompts); };
    sysInput.oninput = () => { p.system = sysInput.value; setPrompts(cfg.prompts); };
    delBtn.onclick = () => { cfg.prompts.splice(idx, 1); setPrompts(cfg.prompts); renderRows(); };

    row.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", idx); row.style.opacity = "0.4"; });
    row.addEventListener("dragend", () => row.style.opacity = "1");
    row.addEventListener("dragover", e => e.preventDefault());
    row.addEventListener("drop", e => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData("text/plain"));
      if (from === idx) return;
      const [moved] = cfg.prompts.splice(from, 1);
      cfg.prompts.splice(idx, 0, moved);
      setPrompts(cfg.prompts); renderRows();
    });

    rowsEl.appendChild(row);
  });
}

document.getElementById("addRow").onclick = () => {
  cfg.prompts.push({ id: "p_" + Date.now(), shortcut: "/new", title: "新提示词", system: "system prompt…", model: "" });
  setPrompts(cfg.prompts); renderRows();
};
document.getElementById("resetPrompts").onclick = async () => {
  if (!confirm("重置为默认提示词？自定义会被清除。")) return;
  await resetPrompts();
  cfg = await getConfig(); renderRows();
};

init();
