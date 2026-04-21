import { getConfig, setConfig, BAILIAN_MODELS } from "./storage.js";

const OR_AUTHZ = "https://openrouter.ai/auth";
const OR_EXCHANGE = "https://openrouter.ai/api/v1/auth/keys";

const PROVIDERS = {
  openrouter: {
    base: "https://openrouter.ai/api/v1",
    getKey: (cfg) => cfg.auth.openrouter.apiKey,
    extraHeaders: () => ({
      "HTTP-Referer": "https://github.com/webai-extension",
      "X-Title": "WebAI Extension"
    }),
    missingKeyMsg: "未登录 OpenRouter / 未填 Key，请先到选项页授权。",
    async test(key) {
      const r = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` }
      });
      if (!r.ok) return { ok: false, message: `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}` };
      const { data } = await r.json();
      const limit = data?.limit == null ? "无限" : `$${data.limit}`;
      const used = data?.usage != null ? `$${Number(data.usage).toFixed(4)}` : "?";
      return { ok: true, message: `✓ OpenRouter Key 有效 · 已用 ${used} / 额度 ${limit}` };
    },
    async listModels(key) {
      const headers = key ? { Authorization: `Bearer ${key}` } : {};
      const r = await fetch("https://openrouter.ai/api/v1/models", { headers });
      if (!r.ok) throw new Error(`获取模型列表失败 ${r.status}`);
      const { data } = await r.json();
      return data.map(m => {
        const pp = Number(m.pricing?.prompt || 0);
        const cp = Number(m.pricing?.completion || 0);
        return {
          id: m.id,
          name: m.name || m.id,
          context: m.context_length,
          promptPrice: pp,
          completionPrice: cp,
          free: (pp === 0 && cp === 0) || /:free$/.test(m.id)
        };
      });
    }
  },

  bailian: {
    base: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    getKey: (cfg) => cfg.auth.bailian.apiKey,
    extraHeaders: () => ({}),
    missingKeyMsg: "未配置阿里云百炼 API Key，请在选项页填入。",
    async test(key) {
      const r = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: "qwen-turbo", max_tokens: 4, messages: [{ role: "user", content: "ping" }] })
      });
      if (!r.ok) return { ok: false, message: `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}` };
      const j = await r.json();
      const reply = j.choices?.[0]?.message?.content || "(空)";
      return { ok: true, message: `✓ 百炼 Key 有效 · qwen-turbo 回复: ${reply}` };
    },
    async listModels(key) {
      const known = Object.fromEntries(BAILIAN_MODELS.map(m => [m.id, m]));
      if (key) {
        try {
          const r = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/models", {
            headers: { Authorization: `Bearer ${key}` }
          });
          if (r.ok) {
            const { data } = await r.json();
            if (Array.isArray(data) && data.length) {
              return data.map(m => ({
                id: m.id,
                name: known[m.id]?.name || m.id,
                context: null,
                promptPrice: 0, completionPrice: 0,
                free: !!known[m.id]?.free,
                note: known[m.id]?.note || ""
              }));
            }
          }
        } catch (e) {
          console.warn("[WebAI] Bailian /models fetch failed, using built-in list:", e);
        }
      }
      return BAILIAN_MODELS.map(m => ({
        id: m.id, name: m.name, context: null,
        promptPrice: 0, completionPrice: 0,
        free: !!m.free, note: m.note || ""
      }));
    }
  }
};

function descriptor(name) {
  const d = PROVIDERS[name];
  if (!d) throw new Error(`未知 provider: ${name}`);
  return d;
}

// --- OpenRouter OAuth (PKCE) ---
function base64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha256(str) {
  return base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)));
}
function randomVerifier() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return base64url(b);
}

export async function loginOpenRouter() {
  const redirectUri = chrome.identity.getRedirectURL("openrouter");
  const verifier = randomVerifier();
  const challenge = await sha256(verifier);

  const url = `${OR_AUTHZ}?` + new URLSearchParams({
    callback_url: redirectUri,
    code_challenge: challenge,
    code_challenge_method: "S256"
  });
  const cbUrl = await chrome.identity.launchWebAuthFlow({ url, interactive: true });
  if (!cbUrl) throw new Error("授权被取消");
  const code = new URL(cbUrl).searchParams.get("code");
  if (!code) throw new Error("未收到授权码");

  const resp = await fetch(OR_EXCHANGE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" })
  });
  if (!resp.ok) throw new Error(`Key 交换失败 ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const { key } = await resp.json();
  if (!key) throw new Error("返回中没有 key");

  const cfg = await getConfig();
  await setConfig({ auth: { ...cfg.auth, provider: "openrouter", openrouter: { ...cfg.auth.openrouter, apiKey: key, email: "OpenRouter" } } });
  return { email: "OpenRouter" };
}

export async function logout(provider) {
  const cfg = await getConfig();
  if (provider === "openrouter") {
    await setConfig({ auth: { ...cfg.auth, openrouter: { apiKey: "", email: "" } } });
  } else if (provider === "bailian") {
    await setConfig({ auth: { ...cfg.auth, bailian: { apiKey: "" } } });
  }
}

export async function getProviderEndpoint() {
  const cfg = await getConfig();
  const d = descriptor(cfg.auth.provider);
  const key = d.getKey(cfg);
  if (!key) throw new Error(d.missingKeyMsg);
  return {
    base: d.base,
    headers: { Authorization: `Bearer ${key}`, ...d.extraHeaders() }
  };
}

export async function testApi(provider) {
  const cfg = await getConfig();
  const d = descriptor(provider || cfg.auth.provider);
  const key = d.getKey(cfg);
  if (!key) return { ok: false, message: d.missingKeyMsg };
  try {
    return await d.test(key);
  } catch (e) {
    return { ok: false, message: "网络错误: " + (e.message || e) };
  }
}

export async function fetchModels(provider) {
  const cfg = await getConfig();
  const d = descriptor(provider || cfg.auth.provider);
  return d.listModels(d.getKey(cfg));
}
