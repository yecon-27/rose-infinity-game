import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/hunyuan";
import { buildRevealPrompt, Persona, RevealContext } from "@/lib/npc-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "她那一侧" 回看 · 兜底池
 * 即使 LLM 失败,回看时也不能开天窗——给一句她此刻真实的犹疑。
 */
const REVEAL_INNER_FALLBACKS = [
  "她又想说点什么。想了想,算了。",
  "她没说出口的那句,自己也没想清楚。",
  "她怕一说出来,就掉价了。",
  "她掂了掂,觉得还没到那一步。",
];

function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 从 LLM 输出里解析 {"inner"},失败则整段当 inner */
function parseRevealOutput(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1)) as {
        inner?: unknown;
      };
      const inner = typeof obj.inner === "string" ? obj.inner.trim() : "";
      if (inner) return inner;
    } catch {
      // 落到纯文本兜底
    }
  }
  const plain = cleaned.replace(/^["'""]|["'""]$/g, "").trim();
  return plain || pick(REVEAL_INNER_FALLBACKS);
}

function normalizePhase(v: unknown): RevealContext["phase"] {
  return v === "strained" ? "strained" : "warm";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx: any = body?.context ?? {};

    const herSpoken: string | undefined =
      typeof ctx.herSpoken === "string" ? ctx.herSpoken : undefined;

    if (!herSpoken) {
      return NextResponse.json(
        { ok: false, error: "herSpoken 不能为空" },
        { status: 400 }
      );
    }

    const sceneBrief =
      typeof ctx.sceneBrief === "string"
        ? ctx.sceneBrief
        : "回看某个当年的场景。";

    const dialogueHistory: RevealContext["dialogueHistory"] = Array.isArray(
      ctx.dialogueHistory
    )
      ? ctx.dialogueHistory
          .map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (d: any) =>
              d && typeof d.text === "string"
                ? {
                    role: (d.role === "amo" || d.role === "vera"
                      ? "vera"
                      : "sean") as Persona,
                    text: d.text as string,
                  }
                : null
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter(
            (x: any): x is { role: Persona; text: string } => x !== null
          )
      : undefined;

    const fullContext: RevealContext = {
      sceneId: typeof ctx.sceneId === "string" ? ctx.sceneId : "reveal",
      sceneBrief,
      situation:
        typeof ctx.situation === "string" ? ctx.situation : undefined,
      herCircumstance:
        typeof ctx.herCircumstance === "string"
          ? ctx.herCircumstance
          : undefined,
      herSpoken: herSpoken.slice(0, 500),
      phase: normalizePhase(ctx.phase),
      dialogueHistory,
    };

    const systemPrompt = buildRevealPrompt(fullContext);

    let inner: string;
    try {
      const out = await chat(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `请输出 Vera 当时没说出口的真实心情 JSON(只含 inner)。`,
          },
        ],
        { temperature: 0.85, maxTokens: 120 }
      );
      inner = parseRevealOutput(out);
    } catch (err) {
      console.error("[reveal] LLM 调用失败,启用兜底:", err);
      inner = pick(REVEAL_INNER_FALLBACKS);
    }

    return NextResponse.json({
      ok: true,
      inner,
      source: "llm",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
