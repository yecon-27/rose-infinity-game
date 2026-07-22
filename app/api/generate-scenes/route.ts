import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";
import {
  isGeneratedGame,
  isStoryOutline,
  type StoryOutline,
} from "@/lib/generated-story";
import {
  buildFallbackGame,
  buildSceneGenerationPrompt,
  isPlayableGeneratedGame,
  parseGeneratedGame,
} from "@/lib/scene-gen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OUTLINE_BYTES = 50_000;

function gameResponse(game: ReturnType<typeof buildFallbackGame>, source: "llm" | "fallback") {
  if (!isGeneratedGame(game) || !isPlayableGeneratedGame(game)) {
    throw new Error("场景生成结果未通过校验");
  }
  return NextResponse.json(game, {
    headers: { "X-Scene-Source": source },
  });
}

/**
 * POST /api/generate-scenes
 * body: { outline: StoryOutline }
 * response: GeneratedGame
 */
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json().catch(() => null);
    const rawOutline =
      body && typeof body === "object"
        ? (body as { outline?: unknown }).outline
        : undefined;

    if (!isStoryOutline(rawOutline)) {
      return NextResponse.json(
        { error: "outline 不是合法的 StoryOutline" },
        { status: 400 }
      );
    }

    const outline: StoryOutline = rawOutline;
    if (JSON.stringify(outline).length > MAX_OUTLINE_BYTES) {
      return NextResponse.json(
        { error: "outline 太长，请减少冲突节点后重试" },
        { status: 413 }
      );
    }

    const fallback = buildFallbackGame(outline);

    try {
      const output = await chat(
        [
          { role: "system", content: buildSceneGenerationPrompt(outline) },
          { role: "user", content: JSON.stringify(outline) },
        ],
        {
          temperature: 0.45,
          maxTokens: 5200,
          timeoutMs: 25_000,
          thinking: "disabled",
          retries: 0,
        }
      );
      const generated = parseGeneratedGame(output, outline);
      if (generated) return gameResponse(generated, "llm");
      console.warn("[generate-scenes] 模型结果不可玩，启用本地兜底");
    } catch (error) {
      console.error("[generate-scenes] LLM 调用失败，启用本地兜底：", error);
    }

    return gameResponse(fallback, "fallback");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
