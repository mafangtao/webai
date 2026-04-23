(() => {
  const BLOCK_TAGS = new Set(["P","LI","BLOCKQUOTE","H1","H2","H3","H4","H5","H6","DT","DD","FIGCAPTION","TD","TH","ARTICLE","SECTION","DIV"]);

  const CSS_TEXT = `
    :host { all: initial; }
    .bubble {
      position: absolute;
      background: #111; color: #fff;
      border-radius: 10px;
      padding: 6px;
      display: none;
      flex-direction: column; gap: 2px;
      width: 220px;
      max-height: 70vh;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      box-shadow: 0 8px 28px rgba(0,0,0,0.25);
      z-index: 2147483647;
    }
    .bubble.show { display: flex; }
    .bubble::before {
      content: ""; position: absolute; left: -5px; top: 16px;
      transform: rotate(45deg);
      width: 10px; height: 10px; background: #111;
    }
    .item {
      all: unset; box-sizing: border-box;
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px; border-radius: 6px;
      cursor: pointer; color: #fff; width: 100%;
      font-size: 13px;
    }
    .item:hover { background: #333; }
    .item .star { width: 12px; color: #fcd34d; text-align: center; font-size: 12px; }
    .item .title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item .sc { color: #9ca3af; font-size: 11px; font-family: ui-monospace, Menlo, monospace; }
    .item.more { color: #9ca3af; font-size: 12px; border-top: 1px solid #333; margin-top: 2px; padding-top: 8px; justify-content: center; }
  `;

  const CARD_CSS = `
    :host {
      all: initial;
      display: block;
      margin: 16px 0 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .card {
      background: #ffffff;
      color: #1a1a1a;
      border: 1px solid #e5e7eb;
      border-left: 3px solid #2563eb;
      border-radius: 10px;
      padding: 16px 18px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      font-size: 15px;
      line-height: 1.65;
    }
    .card.err { border-left-color: #dc2626; }
    .head {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: #666;
      margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.6px;
    }
    .head .badge {
      background: #eff6ff; color: #2563eb;
      padding: 2px 8px; border-radius: 4px; font-weight: 600;
      letter-spacing: 0; text-transform: none; font-size: 12px;
    }
    .head .title { text-transform: none; letter-spacing: 0; color: #666; }
    .head .spacer { flex: 1; }
    .head button {
      all: unset; cursor: pointer; color: #666;
      padding: 2px 6px; border-radius: 4px; font-size: 12px;
    }
    .head button:hover { background: #f3f4f6; color: #1a1a1a; }
    .head button.stop { color: #b91c1c; font-weight: 600; }
    .head button.stop:hover { background: #fee2e2; color: #991b1b; }
    .head button.save { color: #2563eb; font-weight: 600; }
    .head button.save:hover { background: #eff6ff; }
    .save-form {
      margin-top: 12px; padding: 10px 12px;
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .save-form .row1, .save-form .row2 {
      display: flex; gap: 8px; align-items: center;
    }
    .save-form select, .save-form input {
      all: unset; box-sizing: border-box;
      padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px;
      font-size: 13px; background: #fff; color: #1a1a1a;
      font-family: inherit;
    }
    .save-form select { flex: 1; cursor: pointer; }
    .save-form .title-input { width: 100%; }
    .save-form button {
      all: unset; cursor: pointer;
      padding: 5px 10px; border-radius: 6px; font-size: 12px;
      background: #f3f4f6; color: #1a1a1a;
    }
    .save-form button:hover { background: #e5e7eb; }
    .save-form .save-confirm { background: #2563eb; color: #fff; font-weight: 600; }
    .save-form .save-confirm:hover { background: #1d4ed8; }
    .save-form .save-state { font-size: 12px; }
    .body {
      color: #1a1a1a; white-space: pre-wrap; word-wrap: break-word;
    }
    .body .md-p { margin: 0 0 8px; white-space: normal; }
    .body .md-h { margin: 14px 0 6px; line-height: 1.3; font-weight: 700; }
    .body h1.md-h { font-size: 18px; }
    .body h2.md-h { font-size: 16px; }
    .body h3.md-h, .body h4.md-h, .body h5.md-h, .body h6.md-h { font-size: 15px; }
    .body .md-ul, .body .md-ol { margin: 4px 0 10px 0; padding-left: 22px; white-space: normal; }
    .body .md-ul li, .body .md-ol li { margin: 3px 0; }
    .body .md-quote {
      margin: 8px 0; padding: 6px 12px;
      border-left: 3px solid #d1d5db; color: #4b5563;
      background: #f9fafb;
    }
    .body .md-pre {
      margin: 8px 0; padding: 10px 12px;
      background: #f3f4f6; border-radius: 6px;
      overflow: auto;
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 13px; line-height: 1.5;
    }
    .body .md-pre code { all: unset; white-space: pre; }
    .body .md-code {
      background: #f3f4f6; padding: 1px 5px; border-radius: 3px;
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 13px;
    }
    .body .md-a { color: #2563eb; text-decoration: underline; }
    .body .md-hr { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
    .body strong { font-weight: 700; }
    .body em { font-style: italic; }
    .body .cursor {
      display: inline-block; width: 8px; height: 16px;
      background: #2563eb; margin-left: 2px; vertical-align: -3px;
      animation: blink 1s infinite;
    }
    @keyframes blink { 50% { opacity: 0; } }
    .foot {
      margin-top: 10px; font-size: 12px; color: #666;
      display: flex; gap: 14px;
    }
  `;

  // --- Shadow host for bubble + cards ---
  const host = document.createElement("div");
  host.id = "__webai_host__";
  host.style.cssText = "all:initial;position:absolute;top:0;left:0;z-index:2147483647";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CSS_TEXT;
  shadow.appendChild(style);

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  shadow.appendChild(bubble);

  document.documentElement.appendChild(host);

  let prompts = [];

  function extensionAlive() {
    try { return !!(chrome.runtime && chrome.runtime.id); } catch { return false; }
  }

  async function loadConfig() {
    if (!extensionAlive()) return;
    try {
      const { config } = await chrome.storage.local.get("config");
      prompts = (config && config.prompts) || [];
      renderBubble();
    } catch {}
  }
  loadConfig();
  try {
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === "local" && ch.config) loadConfig();
    });
  } catch {}

  function findBlock(node) {
    while (node && node.nodeType !== 1) node = node.parentNode;
    while (node && !BLOCK_TAGS.has(node.tagName)) node = node.parentNode;
    return node;
  }

  let bubbleAnchor = null;
  let bubbleExpanded = false;

  function renderBubble() {
    bubble.innerHTML = "";
    const starred = prompts.find(p => p.default);
    const ordered = starred ? [starred, ...prompts.filter(p => p !== starred)] : prompts.slice();
    const LIMIT = 10;
    const shown = bubbleExpanded ? ordered : ordered.slice(0, LIMIT);

    for (const p of shown) {
      const btn = document.createElement("button");
      btn.className = "item";
      btn.dataset.promptId = p.id;
      btn.innerHTML = `
        <span class="star">${p.default ? "★" : ""}</span>
        <span class="title"></span>
        <span class="sc"></span>`;
      btn.querySelector(".title").textContent = p.title;
      btn.querySelector(".sc").textContent = p.shortcut || "";
      bubble.appendChild(btn);
    }

    if (!bubbleExpanded && ordered.length > LIMIT) {
      const more = document.createElement("button");
      more.className = "item more";
      more.textContent = `▾ 展开剩余 ${ordered.length - LIMIT} 条`;
      more.addEventListener("mousedown", e => e.preventDefault());
      more.onclick = (e) => {
        e.stopPropagation();
        bubbleExpanded = true;
        renderBubble();
      };
      bubble.appendChild(more);
    } else if (bubbleExpanded && ordered.length > LIMIT) {
      const less = document.createElement("button");
      less.className = "item more";
      less.textContent = "▴ 收起";
      less.addEventListener("mousedown", e => e.preventDefault());
      less.onclick = (e) => {
        e.stopPropagation();
        bubbleExpanded = false;
        renderBubble();
      };
      bubble.appendChild(less);

      const manage = document.createElement("button");
      manage.className = "item more";
      manage.textContent = "⚙︎ 管理提示词";
      manage.addEventListener("mousedown", e => e.preventDefault());
      manage.onclick = () => {
        bubble.classList.remove("show");
        chrome.runtime.sendMessage({ type: "WEBAI_OPEN_OPTIONS" });
      };
      bubble.appendChild(manage);
    }
  }

  function positionBubble(rect) {
    const GAP = 12;
    const W = 220;
    const H = Math.min(260, (prompts.length + 1) * 36);
    let left = rect.right + GAP + window.scrollX;
    if (left + W > window.scrollX + window.innerWidth - 12) {
      left = rect.left - W - GAP + window.scrollX;
    }
    let top = rect.top + window.scrollY - 8;
    if (top + H > window.scrollY + window.innerHeight - 12) {
      top = Math.max(window.scrollY + 12, rect.bottom + window.scrollY - H);
    }
    if (top < window.scrollY + 12) top = window.scrollY + 12;
    bubble.style.left = left + "px";
    bubble.style.top = top + "px";
  }

  // Show bubble only after mouseup (i.e. when user has finished selecting),
  // so it doesn't flicker and re-position while the user is still dragging.
  let isDragging = false;

  document.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (host.contains(e.target)) return; // clicks inside bubble/card
    isDragging = true;
    bubble.classList.remove("show");
    bubbleAnchor = null;
    bubbleExpanded = false;
    renderBubble();
  }, true);

  document.addEventListener("mouseup", (e) => {
    if (e.button !== 0) return;
    isDragging = false;
    // defer so the selection has settled
    setTimeout(showBubbleForCurrentSelection, 0);
  }, true);

  // Hide the bubble immediately if the selection is cleared (e.g. via keyboard / click elsewhere)
  document.addEventListener("selectionchange", () => {
    if (isDragging) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      bubble.classList.remove("show");
      bubbleAnchor = null;
      bubbleExpanded = false;
      renderBubble();
    }
  });

  function showBubbleForCurrentSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      bubble.classList.remove("show"); bubbleAnchor = null; return;
    }
    const range = sel.getRangeAt(0);
    if (host.contains(range.commonAncestorContainer)) return;
    const para = findBlock(range.endContainer) || findBlock(range.commonAncestorContainer);
    if (!para) { bubble.classList.remove("show"); return; }
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) { bubble.classList.remove("show"); return; }
    positionBubble(rect);
    bubble.classList.add("show");
    bubbleAnchor = para;
  }

  bubble.addEventListener("mousedown", e => e.preventDefault());
  bubble.addEventListener("click", e => {
    const btn = e.target.closest(".item[data-prompt-id]");
    if (!btn || !bubbleAnchor) return;
    const promptId = btn.dataset.promptId;
    const text = window.getSelection()?.toString() || "";
    bubble.classList.remove("show");
    startAnalyze(promptId, text, bubbleAnchor);
  });

  // Context menu from background
  let lastRightClickRange = null;
  document.addEventListener("mousedown", e => {
    if (e.button !== 2) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      lastRightClickRange = sel.getRangeAt(0).cloneRange();
    }
  }, true);

  try { chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "WEBAI_ANALYZE") return;
    const range = lastRightClickRange || window.getSelection()?.getRangeAt?.(0);
    if (!range) return;
    const para = findBlock(range.endContainer) || findBlock(range.commonAncestorContainer);
    if (!para) return;
    startAnalyze(msg.promptId, msg.selectionText || range.toString(), para);
  }); } catch {}

  function startAnalyze(promptId, text, anchor) {
    if (!text || !text.trim()) return;
    if (!extensionAlive()) {
      alert("WebAI 扩展已被重新加载，请刷新本页面后再试。");
      return;
    }
    const card = createCard();
    card._state.selectionText = text;
    insertCardAfter(anchor, card);
    let port;
    try {
      port = chrome.runtime.connect({ name: "webai-stream" });
    } catch (e) {
      errorCard(card, "扩展上下文已失效，请刷新页面。");
      return;
    }
    port.postMessage({ type: "START", promptId, selectionText: text });
    let stopped = false;
    port.onMessage.addListener((m) => {
      if (m.type === "META") { setCardMeta(card, m); card._state.promptInfo = m; }
      else if (m.type === "CHUNK") appendCardText(card, m.text);
      else if (m.type === "DONE") { finalizeCard(card); hideStop(card); revealSave(card); }
      else if (m.type === "ERROR") { errorCard(card, m.message); hideStop(card); }
    });
    card.addEventListener("webai-close", () => {
      try { port.disconnect(); } catch {}
      card.remove();
    });
    card.addEventListener("webai-stop", () => {
      if (stopped) return;
      stopped = true;
      try { port.disconnect(); } catch {}
      finalizeCard(card, /*stopped*/ true);
      hideStop(card);
      revealSave(card);
    });
  }

  function hideStop(wrap) {
    const btn = wrap._state?.card.querySelector(".stop");
    if (btn) btn.style.display = "none";
  }
  function revealSave(wrap) {
    const btn = wrap._state?.card.querySelector(".save");
    if (btn) btn.style.display = "";
  }

  // --- Card lifecycle ---
  function createCard() {
    const wrap = document.createElement("div");
    wrap.className = "card-host";
    const cardShadow = wrap.attachShadow({ mode: "open" });
    const s = document.createElement("style");
    s.textContent = CARD_CSS;
    cardShadow.appendChild(s);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="head">
        <span class="badge">AI</span>
        <span class="title">思考中…</span>
        <span class="spacer"></span>
        <button class="stop" title="停止生成">■ 停止</button>
        <button class="save" title="保存到笔记" style="display:none">⤓ 保存</button>
        <button class="copy" title="复制">复制</button>
        <button class="close" title="关闭">×</button>
      </div>
      <div class="body"><span class="cursor"></span></div>
      <div class="save-form" style="display:none">
        <div class="row1">
          <select class="cat-select"></select>
          <button class="cat-add" title="新建分类">+ 新分类</button>
        </div>
        <input class="title-input" type="text" placeholder="标题" />
        <div class="row2">
          <span class="save-state"></span>
          <span style="flex:1"></span>
          <button class="save-cancel">取消</button>
          <button class="save-confirm">保存</button>
        </div>
      </div>
      <div class="foot"><span class="model"></span><span class="time">流式中…</span></div>`;
    cardShadow.appendChild(card);

    const started = performance.now();
    wrap._state = { text: "", started, card, body: card.querySelector(".body"), cursor: true,
                    selectionText: "", promptInfo: null };

    card.querySelector(".close").onclick = () => wrap.dispatchEvent(new Event("webai-close"));
    card.querySelector(".stop").onclick = () => wrap.dispatchEvent(new Event("webai-stop"));
    card.querySelector(".copy").onclick = (e) => {
      navigator.clipboard.writeText(wrap._state.text).catch(() => {});
      e.target.textContent = "已复制";
      setTimeout(() => e.target.textContent = "复制", 1200);
    };
    card.querySelector(".save").onclick = () => openSaveForm(wrap);
    card.querySelector(".save-cancel").onclick = () => closeSaveForm(wrap);
    card.querySelector(".cat-add").onclick = () => addCategoryFlow(wrap);
    card.querySelector(".save-confirm").onclick = () => doSave(wrap);
    return wrap;
  }

  async function openSaveForm(wrap) {
    const card = wrap._state.card;
    card.querySelector(".save-form").style.display = "block";
    const sel = card.querySelector(".cat-select");
    const titleInput = card.querySelector(".title-input");
    const state = card.querySelector(".save-state");
    state.textContent = "加载分类…"; state.style.color = "#6b7280";

    // Generate title via /addtitle prompt (single call, non-streaming)
    if (!titleInput.value) {
      titleInput.value = "";
      titleInput.placeholder = "AI 生成标题中…";
      const source = wrap._state.text || wrap._state.selectionText || "";
      chrome.runtime.sendMessage({ type: "WEBAI_RUN_ONCE", shortcut: "/addtitle", text: source }, (r) => {
        titleInput.placeholder = "标题";
        if (r?.ok) {
          titleInput.value = sanitizeTitle(r.text);
        } else {
          // fallback to local heuristic
          titleInput.value = suggestTitle(source);
        }
      });
    }

    if (!extensionAlive()) { state.textContent = "扩展失效，请刷新页面"; state.style.color = "#b91c1c"; return; }
    let cfg;
    try { cfg = (await chrome.storage.local.get("config")).config || {}; } catch { cfg = {}; }
    const cached = cfg.backend?.categories || [];

    fillCategorySelect(sel, cached, cfg.backend?.lastCategory);

    // refresh in background
    chrome.runtime.sendMessage({ type: "WEBAI_FETCH_CATEGORIES" }, (r) => {
      if (r?.ok) {
        fillCategorySelect(sel, r.categories, cfg.backend?.lastCategory);
        state.textContent = `共 ${r.categories.length} 个分类`;
        state.style.color = "#059669";
      } else if (r) {
        state.textContent = "拉取分类失败: " + (r.error || "");
        state.style.color = "#b91c1c";
      }
    });
  }

  function sanitizeTitle(s) {
    if (!s) return "";
    // strip surrounding quotes/markdown/whitespace, take first line
    return s.replace(/^["'「『《\s]+|["'」』》\s]+$/g, "")
            .split(/\n/)[0]
            .replace(/^#+\s*/, "")
            .trim();
  }

  function suggestTitle(src) {
    if (!src) return "(无标题)";
    // strip markdown markers, headings, list bullets, code fences, leading punctuation
    let s = src.replace(/```[\s\S]*?```/g, " ")
               .replace(/[#*_>`~\-•·\[\]]/g, " ")
               .replace(/\s+/g, " ")
               .trim();
    if (!s) return "(无标题)";
    // take first sentence-ish chunk before a period/comma/newline
    const cut = s.split(/[。．.！!？?\n,，;；]/).find(x => x.trim().length > 0) || s;
    return cut.trim().slice(0, 10);
  }

  function fillCategorySelect(sel, cats, preferName) {
    sel.innerHTML = "";
    if (!cats.length) {
      const o = document.createElement("option");
      o.value = ""; o.textContent = "(暂无分类，点 + 新分类)";
      sel.appendChild(o);
      return;
    }
    for (const c of cats) {
      const o = document.createElement("option");
      o.value = c.name; o.textContent = c.name;
      sel.appendChild(o);
    }
    if (preferName && cats.some(c => c.name === preferName)) sel.value = preferName;
  }

  async function addCategoryFlow(wrap) {
    const name = prompt("新分类名称:");
    if (!name || !name.trim()) return;
    const card = wrap._state.card;
    const state = card.querySelector(".save-state");
    state.textContent = "创建中…"; state.style.color = "#6b7280";
    chrome.runtime.sendMessage({ type: "WEBAI_CREATE_CATEGORY", name: name.trim() }, (r) => {
      if (r?.ok) {
        chrome.runtime.sendMessage({ type: "WEBAI_FETCH_CATEGORIES" }, (r2) => {
          if (r2?.ok) {
            fillCategorySelect(card.querySelector(".cat-select"), r2.categories, r.category.name);
            state.textContent = `✓ 已创建 ${r.category.name}`;
            state.style.color = "#059669";
          }
        });
      } else {
        state.textContent = "创建失败: " + (r?.error || "");
        state.style.color = "#b91c1c";
      }
    });
  }

  function closeSaveForm(wrap) {
    wrap._state.card.querySelector(".save-form").style.display = "none";
  }

  function doSave(wrap) {
    const card = wrap._state.card;
    const state = card.querySelector(".save-state");
    const cat = card.querySelector(".cat-select").value;
    const title = card.querySelector(".title-input").value.trim() || "(无标题)";
    if (!cat) {
      state.textContent = "请先选择或创建分类";
      state.style.color = "#b91c1c";
      return;
    }
    state.textContent = "保存中…"; state.style.color = "#6b7280";

    const fields = [
      { id: crypto.randomUUID(), label: "解析", value: wrap._state.text || "",          fieldType: "markdown", order: 0 },
      { id: crypto.randomUUID(), label: "原文", value: wrap._state.selectionText || "", fieldType: "markdown", order: 1 }
    ];

    chrome.runtime.sendMessage({
      type: "WEBAI_SAVE_ITEM",
      payload: { title, category: cat, fields, notes: "" }
    }, (r) => {
      if (r?.ok) {
        state.textContent = `✓ 已保存到 ${cat}`;
        state.style.color = "#059669";
        const btn = card.querySelector(".save");
        btn.textContent = "✓ 已保存";
        btn.disabled = true;
        setTimeout(() => closeSaveForm(wrap), 800);
      } else {
        state.textContent = "失败: " + (r?.error || "未知错误");
        state.style.color = "#b91c1c";
      }
    });
  }

  function insertCardAfter(anchor, wrap) {
    anchor.insertAdjacentElement("afterend", wrap);
  }

  function setCardMeta(wrap, m) {
    const card = wrap._state.card;
    card.querySelector(".title").textContent = `${m.title}${m.shortcut ? "  " + m.shortcut : ""}`;
    card.querySelector(".model").textContent = m.model;
  }

  function appendCardText(wrap, chunk) {
    const st = wrap._state;
    st.text += chunk;
    renderBody(st);
  }

  function renderBody(st) {
    const body = st.body;
    body.textContent = st.text;
    if (st.cursor) {
      const c = document.createElement("span");
      c.className = "cursor";
      body.appendChild(c);
    }
  }

  function finalizeCard(wrap, stopped = false) {
    const st = wrap._state;
    st.cursor = false;
    // Replace plain text with rendered markdown
    st.body.innerHTML = renderMarkdown(st.text);
    const ms = Math.round(performance.now() - st.started);
    st.card.querySelector(".time").textContent =
      (stopped ? "已停止 · " : "") + `用时 ${ms} ms · ${st.text.length} 字`;
  }

  // Minimal Markdown renderer: headings, bold/italic, ul/ol, code fences,
  // inline code, links, blockquote, paragraphs. Escapes HTML first.
  function renderMarkdown(src) {
    const esc = (s) => s.replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));

    // 1. Pull out fenced code blocks first to protect them from inline rules.
    const codeBlocks = [];
    src = src.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, body) => {
      const i = codeBlocks.push(`<pre class="md-pre"><code>${esc(body)}</code></pre>`) - 1;
      return ` CODE${i} `;
    });

    const lines = src.split(/\n/);
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (/^\s*$/.test(line)) { i++; continue; }

      // Headings
      const h = /^(#{1,6})\s+(.+)$/.exec(line);
      if (h) { out.push(`<h${h[1].length} class="md-h">${inline(esc(h[2]))}</h${h[1].length}>`); i++; continue; }

      // Blockquote
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
        out.push(`<blockquote class="md-quote">${inline(esc(buf.join("\n")))}</blockquote>`);
        continue;
      }

      // Unordered list
      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*+]\s+/, "")); i++;
        }
        out.push(`<ul class="md-ul">${items.map(x => `<li>${inline(esc(x))}</li>`).join("")}</ul>`);
        continue;
      }

      // Ordered list
      if (/^\s*\d+[.)]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+[.)]\s+/, "")); i++;
        }
        out.push(`<ol class="md-ol">${items.map(x => `<li>${inline(esc(x))}</li>`).join("")}</ol>`);
        continue;
      }

      // Horizontal rule
      if (/^\s*([-*_])\s*\1\s*\1[-*_\s]*$/.test(line)) { out.push(`<hr class="md-hr">`); i++; continue; }

      // Paragraph: gather consecutive non-blank lines that don't start a block
      const buf = [line];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i])
             && !/^(#{1,6}\s|\s*[-*+]\s|\s*\d+[.)]\s|>\s?|```)/.test(lines[i])) {
        buf.push(lines[i]); i++;
      }
      out.push(`<p class="md-p">${inline(esc(buf.join("\n")))}</p>`);
    }

    let html = out.join("");
    html = html.replace(/ CODE(\d+) /g, (_, n) => codeBlocks[Number(n)]);
    return html;

    function inline(s) {
      return s
        .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a class="md-a" href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\n/g, "<br>");
    }
  }

  function errorCard(wrap, message) {
    const st = wrap._state;
    st.cursor = false;
    st.card.classList.add("err");
    st.card.querySelector(".body").textContent = "⚠ " + message;
    st.card.querySelector(".time").textContent = "失败";
  }

})();
