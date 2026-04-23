import { getConfig, setConfig } from "./storage.js";

async function backendCfg() {
  const cfg = await getConfig();
  const b = cfg.backend;
  if (!b.url) throw new Error("未配置后端 URL，请在选项页填写。");
  if (!b.token) throw new Error("未配置 Bearer Token，请在选项页填写。");
  return { ...b, url: b.url.replace(/\/$/, "") };
}

function authHeaders(b) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${b.token}`
  };
}

export async function testBackend() {
  let b;
  try { b = await backendCfg(); }
  catch (e) { return { ok: false, message: e.message }; }
  try {
    const r = await fetch(`${b.url}/api/categories?since=0`, { headers: authHeaders(b) });
    if (!r.ok) {
      const txt = (await r.text()).slice(0, 200);
      return { ok: false, message: `HTTP ${r.status}: ${txt}` };
    }
    const j = await r.json();
    const n = (j.categories || []).filter(c => !c.deleted_at).length;
    return { ok: true, message: `✓ 连接正常 · 服务器有 ${n} 个分类` };
  } catch (e) {
    return { ok: false, message: "网络错误: " + (e.message || e) };
  }
}

export async function fetchCategories() {
  const b = await backendCfg();
  const r = await fetch(`${b.url}/api/categories?since=0`, { headers: authHeaders(b) });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const cats = (j.categories || [])
    .filter(c => !c.deleted_at)
    .map(c => ({ id: c.id, name: c.name, icon: c.icon || "" }));
  await setConfig({ backend: { categories: cats } });
  return cats;
}

export async function createCategory(name) {
  const b = await backendCfg();
  const now = Date.now();
  const cat = {
    id: crypto.randomUUID(),
    name,
    icon: "",
    default_fields: [
      { id: crypto.randomUUID(), label: "解析", type: "markdown" },
      { id: crypto.randomUUID(), label: "原文", type: "markdown" }
    ],
    created_at: now,
    updated_at: now,
    deleted_at: null
  };
  const r = await fetch(`${b.url}/api/categories`, {
    method: "POST",
    headers: authHeaders(b),
    body: JSON.stringify({ categories: [cat] })
  });
  if (!r.ok) throw new Error(`创建分类失败 HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  await fetchCategories();
  return { id: cat.id, name: cat.name, icon: cat.icon };
}

export async function saveItem({ title, category, fields, notes }) {
  const b = await backendCfg();
  const now = Date.now();
  const item = {
    id: crypto.randomUUID(),
    title: title || "(无标题)",
    category: category || "",
    fields: fields || [],
    notes: notes || "",
    is_favorite: false,
    created_at: now,
    updated_at: now,
    deleted_at: null
  };
  const r = await fetch(`${b.url}/api/items`, {
    method: "POST",
    headers: authHeaders(b),
    body: JSON.stringify({ items: [item] })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  // remember last-used category for the next save
  await setConfig({ backend: { lastCategory: category } });
  return { ok: true, accepted: j.accepted, id: item.id };
}
