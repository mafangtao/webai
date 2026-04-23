import { getConfig } from "./storage.js";
import { streamChat } from "./openai_client.js";
import { loginOpenRouter, logout, fetchModels, testApi } from "./auth.js";
import { testBackend, fetchCategories, createCategory, saveItem } from "./notes.js";

const PARENT_ID = "webai-root";

// Serialize menu rebuilds so concurrent callers don't race with each other
// (which produces "Cannot create item with duplicate id" errors).
let menuOp = Promise.resolve();
let menuPending = false;

function scheduleRebuildMenus() {
  if (menuPending) return;
  menuPending = true;
  menuOp = menuOp.then(async () => {
    menuPending = false;
    try {
      await new Promise((res) => chrome.contextMenus.removeAll(res));
      const cfg = await getConfig();
      await new Promise((res) =>
        chrome.contextMenus.create({ id: PARENT_ID, title: "AI 分析", contexts: ["selection"] }, res)
      );
      const starred = cfg.prompts.find(p => p.default);
      const ordered = starred ? [starred, ...cfg.prompts.filter(p => p !== starred)] : cfg.prompts;
      for (const p of ordered) {
        await new Promise((res) =>
          chrome.contextMenus.create({
            id: `webai-prompt-${p.id}`,
            parentId: PARENT_ID,
            title: `${p.default ? "★ " : ""}${p.title}  ${p.shortcut || ""}`,
            contexts: ["selection"]
          }, res)
        );
      }
      // clear lastError if any
      void chrome.runtime.lastError;
    } catch (e) {
      console.warn("[WebAI] rebuildMenus error:", e);
    }
  });
  return menuOp;
}

chrome.runtime.onInstalled.addListener(scheduleRebuildMenus);
chrome.runtime.onStartup.addListener(scheduleRebuildMenus);

// Options page writes config on every keystroke; coalesce rapid changes.
let rebuildDebounce = null;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.config) return;
  clearTimeout(rebuildDebounce);
  rebuildDebounce = setTimeout(scheduleRebuildMenus, 400);
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || !info.menuItemId?.startsWith?.("webai-prompt-")) return;
  const promptId = info.menuItemId.slice("webai-prompt-".length);
  chrome.tabs.sendMessage(tab.id, {
    type: "WEBAI_ANALYZE",
    promptId,
    selectionText: info.selectionText || ""
  });
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "webai-stream") return;
  const controller = new AbortController();
  let cancelled = false;
  port.onDisconnect.addListener(() => {
    cancelled = true;
    controller.abort();
  });
  port.onMessage.addListener(async (msg) => {
    if (msg.type !== "START") return;
    try {
      const cfg = await getConfig();
      const prompt = cfg.prompts.find(p => p.id === msg.promptId);
      if (!prompt) throw new Error(`未知提示词: ${msg.promptId}`);
      const model = prompt.model || cfg.defaultModel;
      if (!model) throw new Error("尚未选择模型：请到选项页设置默认模型。");
      port.postMessage({ type: "META", model, title: prompt.title, shortcut: prompt.shortcut });
      for await (const chunk of streamChat({
        model,
        system: prompt.system,
        user: msg.selectionText,
        signal: controller.signal
      })) {
        if (cancelled) return;
        port.postMessage({ type: "CHUNK", text: chunk });
      }
      port.postMessage({ type: "DONE" });
    } catch (e) {
      if (!cancelled) port.postMessage({ type: "ERROR", message: String(e.message || e) });
    } finally {
      try { port.disconnect(); } catch {}
    }
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "WEBAI_LOGIN_OPENROUTER") {
    loginOpenRouter().then(r => sendResponse({ ok: true, ...r }))
      .catch(e => sendResponse({ ok: false, error: String(e.message || e) }));
    return true;
  }
  if (msg?.type === "WEBAI_LOGOUT") {
    logout(msg.provider).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "WEBAI_OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return;
  }
  if (msg?.type === "WEBAI_FETCH_MODELS") {
    fetchModels(msg.provider).then(models => sendResponse({ ok: true, models }))
      .catch(e => sendResponse({ ok: false, error: String(e.message || e) }));
    return true;
  }
  if (msg?.type === "WEBAI_TEST_API") {
    testApi(msg.provider).then(r => sendResponse(r));
    return true;
  }
  if (msg?.type === "WEBAI_TEST_BACKEND") {
    testBackend().then(r => sendResponse(r));
    return true;
  }
  if (msg?.type === "WEBAI_FETCH_CATEGORIES") {
    fetchCategories().then(cats => sendResponse({ ok: true, categories: cats }))
      .catch(e => sendResponse({ ok: false, error: String(e.message || e) }));
    return true;
  }
  if (msg?.type === "WEBAI_CREATE_CATEGORY") {
    createCategory(msg.name).then(cat => sendResponse({ ok: true, category: cat }))
      .catch(e => sendResponse({ ok: false, error: String(e.message || e) }));
    return true;
  }
  if (msg?.type === "WEBAI_SAVE_ITEM") {
    saveItem(msg.payload).then(r => sendResponse(r))
      .catch(e => sendResponse({ ok: false, error: String(e.message || e) }));
    return true;
  }
  if (msg?.type === "WEBAI_RUN_ONCE") {
    runPromptOnce(msg.shortcut, msg.text).then(r => sendResponse(r))
      .catch(e => sendResponse({ ok: false, error: String(e.message || e) }));
    return true;
  }
});

async function runPromptOnce(shortcut, text) {
  const cfg = await getConfig();
  const prompt = cfg.prompts.find(p => p.shortcut === shortcut);
  if (!prompt) return { ok: false, error: `未找到提示词 ${shortcut}` };
  const model = prompt.model || cfg.defaultModel;
  if (!model) return { ok: false, error: "未选择默认模型" };
  let out = "";
  try {
    for await (const chunk of streamChat({ model, system: prompt.system, user: text })) {
      out += chunk;
    }
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
  return { ok: true, text: out.trim() };
}
