# WebAI — 选中即问

**v0.1.0** · 一个 Chrome 扩展：在任意网页选中文字，通过浮动气泡或右键菜单调用 AI 分析，结果以卡片形式流式插入到选中段落下方。

---

## 功能

- **选中即弹气泡**：鼠标划选任意段落（或标题、列表项、表格单元格），松开后选区右侧自动出现黑色气泡工具条，列出常用提示词
- **右键菜单**：同样的提示词集合也在系统右键的 "AI 分析" 子菜单里
- **流式输出**：卡片中逐字显示 AI 回复，随时可点 **■ 停止** 中断生成（真的会 abort 请求）
- **20 条内置提示词**，覆盖解释、翻译、总结、批判、术语、金句、延伸阅读、笔记卡片等常见场景；默认项是 `/js300 用 300 字解释这段文字`
- **自定义提示词**：选项页可增删改、拖动排序、★ 设为默认、每条指定自己的模型
- **两家服务商**：
  - **OpenRouter**（海外聚合）— 支持 OAuth PKCE 浏览器授权，一键登录；聚合 OpenAI / Anthropic / Google 等全部主流模型，含免费模型
  - **阿里云百炼**（国内）— OpenAI 兼容 API，通义千问全系 + DeepSeek，`qwen-turbo` / `qwen3-turbo` 免费
- **模型动态列表**：登录后实时从服务商拉取模型列表，按免费/付费分组下拉选择，支持 "只看免费模型" 过滤
- **测试 API**：选项页一键验证 Key 是否可用（OpenRouter 显示额度，百炼发一条 ping 给 qwen-turbo）

---

## 安装

1. 克隆或下载本目录到本地（如 `/Users/you/Ai/webai`）
2. Chrome 打开 `chrome://extensions`
3. 右上角开启 **"开发者模式"**
4. 点 **"加载已解压的扩展程序"**，选择本目录
5. 扩展栏出现 W 图标即装好

---

## 配置

点扩展图标 → **"打开设置"**，或从 `chrome://extensions` 点进 "详情 → 扩展程序选项"。

### 方式 1：OpenRouter（推荐，海外）

1. 切到 **OpenRouter** tab
2. 点 **"使用 OpenRouter 登录"** → 浏览器跳转 openrouter.ai 授权 → 自动回填 Key
3. 或手动到 https://openrouter.ai/keys 生成 Key 后粘贴
4. 点 **"测试"** 确认 Key 有效
5. 在 **"默认模型"** 下拉选一个模型（勾 "只看免费模型" 可快速找免费款，如 `deepseek/deepseek-r1:free`、`meta-llama/llama-3.3-70b-instruct:free`）

### 方式 2：阿里云百炼（国内，低延迟）

1. 切到 **阿里云百炼** tab
2. 到 https://bailian.console.aliyun.com/?apiKey=1 生成 API Key
3. 粘贴后点 **"保存"** → **"测试"**
4. 默认模型下拉选 **qwen-turbo**（免费额度大）即可

---

## 使用

### 气泡方式（推荐）

1. 在任意网页用鼠标划选一段文字
2. 松开鼠标 → 选区右侧冒出黑色气泡工具条（10 条提示词）
3. 点击任一条 → 被选段落下方出现 AI 卡片，流式打字
4. 卡片上可 **■ 停止** / **复制** / **×** 关闭
5. 气泡底部点 **"▾ 展开剩余 N 条"** 查看全部提示词

### 右键菜单

选中文字 → 右键 → **AI 分析** → 选提示词。行为同气泡。

---

## 目录结构

```
webai/
├── manifest.json                  # MV3 清单
├── background/
│   ├── service_worker.js          # 入口：右键菜单 + 流式端口
│   ├── storage.js                 # chrome.storage 封装 + 默认提示词 + 百炼模型表
│   ├── auth.js                    # provider 描述符 + OAuth PKCE + 测试/模型列表
│   └── openai_client.js           # fetch + SSE 流式解析
├── content/
│   └── content.js                 # Shadow DOM 气泡 + 卡片 + 选区锚定
├── options/
│   ├── options.html/js/css        # 设置页（认证 + 默认模型 + 提示词管理）
│   └── popup.html/js              # 工具栏图标弹窗
├── preview.html                   # 独立 HTML 视觉预览（不属于扩展）
└── README.md
```

---

## 内置提示词

| Shortcut | 标题 | 用途 |
|---|---|---|
| `/js300` ★ | 300字解释 | **默认**，用 300 字解释这段话 |
| `/zh` | 翻译为中文 | 翻译成地道简体中文 |
| `/en` | 翻译为英文 | 翻译成自然流畅英文 |
| `/tldr` | 一句话总结 | ≤40 字核心观点 |
| `/bullets` | 要点列表 | 3–5 条要点 |
| `/eli5` | 像解释给小学生 | 通俗比喻 |
| `/bg` | 补充背景知识 | 历史/术语/事件脉络 |
| `/terms` | 术语解释 | 列出专业词逐条释义 |
| `/critic` | 批判性分析 | 立场/假设/反面证据 |
| `/counter` | 反方观点 | 300 字反驳 |
| `/facts` | 事实核查清单 | 可验证陈述 |
| `/bias` | 语气/偏见识别 | 中立 / 倾向 / 煽动 |
| `/compare` | 对比同类观点 | 共识点与分歧点 |
| `/quote` | 提取金句 | 1–3 句 + 短评 |
| `/impl` | 对我意味着什么 | 可操作的思考 |
| `/qs` | 该追问的问题 | 5 个深入问题 |
| `/next` | 延伸阅读建议 | 3 本书 / 3 篇文章方向 |
| `/rewrite` | 改写更易读 | 通俗顺畅改写 |
| `/note` | 做成笔记卡片 | Zettelkasten 风格 |

所有条目都可在选项页编辑、删除，也可新增自己的。

---

## 设计取舍

- **为什么不用 OpenAI 官方 OAuth？** OpenAI 的 OAuth 仅向自家客户端（Codex CLI 等）开放，第三方扩展的 `chromiumapp.org` 回调不在白名单，会被直接拒绝。OpenRouter 提供完全公开的 PKCE 流程，体验一致。
- **为什么同时支持百炼？** 国内访问 openrouter.ai 不稳，百炼走国内网络 + OpenAI 兼容协议，切换成本低。
- **为什么用 Shadow DOM 挂气泡和卡片？** 隔离宿主站点的 CSS，避免被覆盖；同时 `all: initial` 防止宿主站点的全局样式污染扩展 UI。
- **为什么只在 mouseup 才弹气泡？** 避免拖选过程中气泡反复闪烁、跟随鼠标，减少视觉干扰。
- **为什么 `max_tokens: 2048`？** OpenRouter 按 `max_tokens × 单价` 预扣额度，默认值过大会导致免费账户被拒（402）。2048 对摘要/翻译场景够用。

---

## 已知限制

- 仅支持文本选中，不处理图片、代码块的语法感知
- Markdown 渲染采用纯文本 `white-space: pre-wrap`，不渲染加粗/列表的视觉样式（内容本身是 MD，用户可复制后粘到 MD 编辑器）
- OAuth 只给 OpenRouter 实现；百炼只支持手动贴 Key（阿里云未公开 OAuth 流程）
- 内置 Bailian 模型列表可能落后于官网新模型；选项页里点 "刷新模型列表" 会尝试从 `/compatible-mode/v1/models` 拉取

---

## 开发

无构建步骤。修改任意源文件后，到 `chrome://extensions` 点扩展的刷新按钮即可生效（网页也需 `Cmd+R` 让新的 content script 生效）。

语法检查：
```bash
for f in background/*.js content/*.js options/options.js; do node --check "$f"; done
```

---

## v0.1.0 更新内容

首个版本。交付内容：

- Manifest V3 架构（service_worker + content script + options + popup）
- OpenRouter OAuth PKCE 登录 + API Key 兜底
- 阿里云百炼 API Key 认证
- 20 条内置提示词 + 完整 CRUD + 拖拽排序 + 默认项
- 动态模型列表（免费/付费分组，实时拉取）
- 测试 API 按钮（额度 / ping 验证）
- Shadow DOM 气泡工具条（mouseup 触发、右侧定位、支持展开/收起、跨段选区、标题/列表项/单元格都可触发）
- 流式卡片（SSE，支持中断）
- 右键菜单（与气泡共享提示词集合）
- 一次性存储迁移（`STORAGE_VERSION`）清理旧版残留模型 id

---

## License

MIT
