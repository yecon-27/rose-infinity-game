import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";
import { isStoryOutline, type CounselReply, type CounselState } from "@/lib/generated-story";
import {
  buildCounselSystemPrompt,
  COUNSEL_FALLBACKS,
  fallbackReflection,
  nextKind,
  parseCounselOutput,
} from "@/lib/counsel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/counsel
 * body: CounselState { outline, choices, turns }
 * → CounselReply { turn, reflection?, done }
 *
 * 心理陪伴 buddy 的下一句。LLM 失败走本地兜底话，不冷场。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const state = (body ?? {}) as Partial<CounselState>;

    if (!isStoryOutline(state.outline)) {
      return NextResponse.json(
        { ok: false, error: "outline 不合法" },
        { status: 400 }
      );
    }

    const full: CounselState = {
      outline: state.outline,
      choices: Array.isArray(state.choices) ? state.choices : [],
      turns: Array.isArray(state.turns) ? state.turns : [],
    };
    const kind = nextKind(full.turns);

    try {
      const out = await chat(
        [
          { role: "system", content: buildCounselSystemPrompt(full) },
          {
            role: "user",
            content:
              full.turns.length === 0
                ? "（开始陪我聊聊吧）"
                : full.turns
                    .map((t) => `${t.role === "buddy" ? "你" : "我"}：${t.text}`)
                    .join("\n"),
          },
        ],
        { temperature: 0.7, maxTokens: 700, thinking: "enabled" }
      );
      const parsed = parseCounselOutput(out);
      if (parsed) {
        const reply: CounselReply = {
          turn: { role: "buddy", text: parsed.text, kind },
          done: kind === "repair" ? true : parsed.done,
          reflection:
            kind === "repair"
              ? parsed.reflection ?? fallbackReflection(full.outline)
              : undefined,
        };
        return NextResponse.json({ ok: true, ...reply, source: "llm" });
      }
      console.warn("[counsel] 输出无法解析，启用兜底");
    } catch (err) {
      console.error("[counsel] LLM 调用失败，启用兜底：", err);
    }

    const reply: CounselReply = {
      turn: { role: "buddy", text: COUNSEL_FALLBACKS[kind], kind },
      done: kind === "repair",
      reflection: kind === "repair" ? fallbackReflection(full.outline) : undefined,
    };
    return NextResponse.json({ ok: true, ...reply, source: "fallback" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
