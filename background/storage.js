export const DEFAULT_PROMPTS = [
  { id: "js300",    shortcut: "/js300",   title: "300字解释",      system: "用 300 字以内，解释这段文字的意思。语言简练，面向普通读者。", model: "", default: true },
  { id: "zh",       shortcut: "/zh",      title: "翻译为中文",     system: "将下面这段文字翻译成地道、自然的简体中文。", model: "" },
  { id: "en",       shortcut: "/en",      title: "翻译为英文",     system: "Translate the following passage into fluent, natural English.", model: "" },
  { id: "tldr",     shortcut: "/tldr",    title: "一句话总结",     system: "用一句话（不超过 40 字）总结这段文字的核心观点。", model: "" },
  { id: "bullets",  shortcut: "/bullets", title: "要点列表",       system: "将这段内容提炼成 3–5 条要点，每条不超过 30 字，使用无序列表。", model: "" },
  { id: "eli5",     shortcut: "/eli5",    title: "像解释给小学生", system: "请用小学五年级学生能听懂的语言，解释这段话在讲什么。可以用比喻。", model: "" },
  { id: "bg",       shortcut: "/bg",      title: "补充背景知识",   system: "补充理解这段话需要的背景知识（历史、术语、事件脉络），500 字以内。", model: "" },
  { id: "terms",    shortcut: "/terms",   title: "术语解释",       system: "列出这段文字里普通读者可能不认识的专业术语或人名，每个一句话解释。", model: "" },
  { id: "critic",   shortcut: "/critic",  title: "批判性分析",     system: "对这段文字做批判性分析：指出作者的立场、隐含假设、可能被忽略的反面证据。", model: "" },
  { id: "counter",  shortcut: "/counter", title: "反方观点",       system: "站在与这段文字作者相反的立场，写一段有力的反驳，300 字以内。", model: "" },
  { id: "facts",    shortcut: "/facts",   title: "事实核查清单",   system: "从这段文字中提取出可验证的事实性陈述，并标注每一条可能需要核实的点。", model: "" },
  { id: "bias",     shortcut: "/bias",    title: "语气/偏见识别",  system: "分析这段文字的语气与潜在偏见：是中立、倾向性还是煽动性？给出具体证据。", model: "" },
  { id: "compare",  shortcut: "/compare", title: "对比同类观点",   system: "这段观点与业界/学界其他主流观点相比如何？指出共识点和分歧点。", model: "" },
  { id: "quote",    shortcut: "/quote",   title: "提取金句",       system: "从这段文字里挑出最值得引用的 1–3 句话，保留原文并在后面附一句短评。", model: "" },
  { id: "impl",     shortcut: "/impl",    title: "对我意味着什么", system: "这段信息对一名普通读者意味着什么？给出 2–3 条可操作的思考。", model: "" },
  { id: "qs",       shortcut: "/qs",      title: "该追问的问题",   system: "读完这段后，列出 5 个值得进一步追问的问题，帮助读者深入思考。", model: "" },
  { id: "next",     shortcut: "/next",    title: "延伸阅读建议",   system: "基于这段内容的主题，推荐 3 本书 / 3 篇高质量文章方向（不必给具体链接）。", model: "" },
  { id: "rewrite",  shortcut: "/rewrite", title: "改写更易读",     system: "把这段文字改写得更通俗、更顺畅，不丢失任何信息点。", model: "" },
  { id: "note",     shortcut: "/note",    title: "做成笔记卡片",   system: "把这段内容整理成一张 Zettelkasten 风格的笔记：标题、要点、一句话精华、关联词。", model: "" }
];

// Built-in Bailian (阿里云百炼) model list. User can still type custom id in prompt's model field.
export const BAILIAN_MODELS = [
  { id: "qwen-turbo",       name: "通义千问 Turbo",      free: true,  note: "速度快、免费额度大" },
  { id: "qwen-plus",        name: "通义千问 Plus",       free: false, note: "平衡版" },
  { id: "qwen-max",         name: "通义千问 Max",        free: false, note: "旗舰" },
  { id: "qwen-long",        name: "通义千问 Long",       free: false, note: "长上下文 10M" },
  { id: "qwen3-max",        name: "通义千问 3 Max",      free: false },
  { id: "qwen3-plus",       name: "通义千问 3 Plus",     free: false },
  { id: "qwen3-turbo",      name: "通义千问 3 Turbo",    free: true },
  { id: "qwen-coder-plus",  name: "通义千问 Coder Plus", free: false },
  { id: "deepseek-v3",      name: "DeepSeek V3",         free: false, note: "百炼部署" },
  { id: "deepseek-r1",      name: "DeepSeek R1",         free: false, note: "百炼部署" }
];

const DEFAULT_CONFIG = {
  auth: {
    provider: "openrouter",               // "openrouter" | "bailian"
    openrouter: { apiKey: "", email: "" },
    bailian:    { apiKey: "" }
  },
  defaultModel: "",                       // e.g. "openai/gpt-4o-mini" or "qwen-turbo"
  prompts: DEFAULT_PROMPTS,
  availableModels: []                      // cached list for currently-active provider
};

function migrate(old) {
  // Back-compat: earlier shape was { auth: { mode, apiKey, email } }
  if (!old || !old.auth) return null;
  if (old.auth.provider) return old; // already new shape
  const apiKey = old.auth.apiKey || "";
  return {
    ...old,
    auth: {
      provider: "openrouter",
      openrouter: { apiKey, email: old.auth.email || "" },
      bailian: { apiKey: "" }
    }
  };
}

const STORAGE_VERSION = 2;

export async function getConfig() {
  const { config } = await chrome.storage.local.get("config");
  if (!config) {
    const init = { ...DEFAULT_CONFIG, _v: STORAGE_VERSION };
    await chrome.storage.local.set({ config: init });
    return init;
  }
  const migrated = migrate(config) || config;
  const merged = {
    ...DEFAULT_CONFIG,
    ...migrated,
    auth: { ...DEFAULT_CONFIG.auth, ...(migrated.auth || {}) }
  };
  merged.auth.openrouter = { ...DEFAULT_CONFIG.auth.openrouter, ...(migrated.auth?.openrouter || {}) };
  merged.auth.bailian = { ...DEFAULT_CONFIG.auth.bailian, ...(migrated.auth?.bailian || {}) };

  if ((merged._v || 0) < STORAGE_VERSION) {
    // one-time cleanup: nuke any residual model ids in prompts (they might be from earlier "gpt-5-mini" defaults)
    merged.prompts = (merged.prompts || []).map(p => ({ ...p, model: "" }));
    merged.defaultModel = "";
    merged._v = STORAGE_VERSION;
    await chrome.storage.local.set({ config: merged });
  }
  return merged;
}

export async function setConfig(patch) {
  const cur = await getConfig();
  const next = { ...cur, ...patch };
  if (patch.auth) {
    next.auth = {
      ...cur.auth,
      ...patch.auth,
      openrouter: { ...cur.auth.openrouter, ...(patch.auth.openrouter || {}) },
      bailian: { ...cur.auth.bailian, ...(patch.auth.bailian || {}) }
    };
  }
  await chrome.storage.local.set({ config: next });
  return next;
}

export async function setPrompts(prompts) { return setConfig({ prompts }); }
export async function resetPrompts() { return setConfig({ prompts: DEFAULT_PROMPTS }); }
