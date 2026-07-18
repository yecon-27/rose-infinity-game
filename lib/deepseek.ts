/**
 * DeepSeek API client.
 *
 * Uses the OpenAI-compatible Chat Completions endpoint directly so the API key
 * stays on the server and no additional SDK is shipped to the browser.
 */

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 1;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

class DeepSeekRequestError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "DeepSeekRequestError";
  }
}

function getConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error(
      "DEEPSEEK_API_KEY 未配置。请在 .env.local 中填入你的 DeepSeek API key。"
    );
  }

  return {
    apiKey,
    baseUrl: (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(
      /\/+$/,
      ""
    ),
    model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
  };
}

export function getDeepSeekModel(): string {
  return process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
}

export async function chat(
  messages: ChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    thinking?: "enabled" | "disabled";
    retries?: number;
  } = {}
): Promise<string> {
  const { apiKey, baseUrl, model } = getConfig();
  const retries = Math.max(0, Math.min(2, options.retries ?? DEFAULT_RETRIES));
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          // Most short narrative calls use non-thinking mode. Reflection can opt
          // into thinking so the model checks tone and factual boundaries first.
          thinking: { type: options.thinking ?? "disabled" },
          temperature: options.temperature ?? 0.8,
          max_tokens: options.maxTokens ?? 500,
          stream: false,
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = (await response.text())
          .replace(/\s+/g, " ")
          .slice(0, 300);
        throw new DeepSeekRequestError(
          `DeepSeek API 调用失败 (${response.status})${
            detail ? `：${detail}` : ""
          }`,
          response.status === 408 ||
            response.status === 409 ||
            response.status === 429 ||
            response.status >= 500
        );
      }

      const data = (await response.json()) as DeepSeekResponse;
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new DeepSeekRequestError("DeepSeek 返回了空内容", true);
      }
      return content;
    } catch (error) {
      const normalizedError =
        error instanceof Error && error.name === "AbortError"
          ? new DeepSeekRequestError("DeepSeek API 请求超时", true)
          : error;
      lastError = normalizedError;
      const retryable =
        normalizedError instanceof DeepSeekRequestError
          ? normalizedError.retryable
          : normalizedError instanceof TypeError;

      if (!retryable || attempt === retries) throw normalizedError;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("DeepSeek API 调用失败");
}
