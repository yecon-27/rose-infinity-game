import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";
import {
  buildDeconstructPrompt,
  heuristicOutline,
  MAX_STORY_LENGTH,
  parseOutline,
} from "@/lib/deconstruct";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/deconstruct
 * body: { story: string }
 * → { ok: true, outline: StoryOutline, source: "llm" | "fallback" }
 *
 * 把用户自述拆成结构化 StoryOutline。LLM 失败或拆不出内容时本地切句兜底，
 * 至少把用户原话留进 keyLines，让下游（情节生成 / 心理咨询）不至于开天窗。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawStory = (body as { story?: unknown } | null)?.story;
    const story = typeof rawStory === "string" ? rawStory.trim() : "";

    if (!story) {
      return NextResponse.json(
        { ok: false, error: "story 不能为空" },
        { status: 400 }
      );
    }

    try {
      const out = await chat(
        [
          { role: "system", content: buildDeconstructPrompt() },
          { role: "user", content: story.slice(0, MAX_STORY_LENGTH) },
        ],
        // 拆解要稳、要贴原文：低温 + 关思考。思考文字会挤占 maxTokens，
        // JSON 被截断就解析不出来，全落兜底
        { temperature: 0.3, maxTokens: 1200, thinking: "disabled" }
      );
      const outline = parseOutline(out);
      if (outline) {
        return NextResponse.json({ ok: true, outline, source: "llm" });
      }
      console.warn("[deconstruct] 输出无法解析成合法 outline，启用兜底");
    } catch (err) {
      console.error("[deconstruct] LLM 调用失败，启用兜底：", err);
    }

    return NextResponse.json({
      ok: true,
      outline: heuristicOutline(story),
      source: "fallback",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
