import { getProviderEndpoint } from "./auth.js";

export async function* streamChat({ model, system, user, signal }) {
  const { base, headers } = await getProviderEndpoint();
  const resp = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 2048,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    }),
    signal
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${resp.status}: ${txt.slice(0, 400)}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const event = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const j = JSON.parse(payload);
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {}
      }
    }
  }
}
