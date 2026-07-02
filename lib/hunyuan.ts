/**
 * 腾讯混元 Hunyuan API 客户端
 *
 * 使用 OpenAI 兼容协议,直接 fetch 调用,无需额外 SDK。
 * 服务端专用 —— 永远在 Next.js API route / Server Component 中调用,
 * 不要在客户端暴露 API key。
 */

const HUNYUAN_API_KEY = process.env.HUNYUAN_API_KEY;
const HUNYUAN_BASE_URL =
  process.env.HUNYUAN_BASE_URL || "https://api.hunyuan.cloud.tencent.com/v1";
const HUNYUAN_MODEL = process.env.HUNYUAN_MODEL || "hunyuan-turbos";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  if (!HUNYUAN_API_KEY || HUNYUAN_API_KEY === "your_key_here") {
    throw new Error(
      "HUNYUAN_API_KEY 未配置。请在 .env.local 中填入你的混元 API key。"
    );
  }

  const res = await fetch(`${HUNYUAN_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HUNYUAN_API_KEY}`,
    },
    body: JSON.stringify({
      model: HUNYUAN_MODEL,
      messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`混元 API 调用失败 (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
