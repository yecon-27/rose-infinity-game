import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";
import {
  buildSeanSystemPrompt,
  buildVeraSystemPrompt,
  NpcContext,
  Persona,
  Phase,
} from "@/lib/npc-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sean 的兜底台词池，LLM 失败时随机取一句 */
const SEAN_REPLY_FALLBACKS = [
  "嗯，行。",
  "等我搞完。",
  "明天吧。",
  "你看呗，都行。",
  "哦，好。",
];

/** Sean 的内心话兜底池——即使 LLM 失败，结局揭示也不能开天窗 */
const SEAN_INNER_FALLBACKS = [
  "他又想说点什么。想了想，算了。",
  "又是这样。我自己的事。",
  "她要是再多说一句，我可能就说了。可她没有。",
  "没关系的。反正我也没打算说。",
];

/** Vera 的兜底台词池，LLM 失败时随机取一句 */
const VERA_REPLY_FALLBACKS = [
  "嗯，行。",
  "那走吧。",
  "也是。",
  "你看呗，都行。",
  "哦，好。",
];

/** Vera 的内心话兜底池 */
const VERA_INNER_FALLBACKS = [
  "她想说点什么。想了想，算了。",
  "又是这样。我们俩谁也不肯先开口。",
  "他要是再多说一句，我可能就说了。可他没有。",
  "没关系的。反正我也没打算说。",
];

function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function replyPool(persona: Persona): string[] {
  return persona === "sean" ? SEAN_REPLY_FALLBACKS : VERA_REPLY_FALLBACKS;
}

function innerPool(persona: Persona): string[] {
  return persona === "sean" ? SEAN_INNER_FALLBACKS : VERA_INNER_FALLBACKS;
}

/** 从 LLM 输出里解析 {"reply","inner"}，失败则整段当 reply */
function parseOutput(raw: string, persona: Persona): { reply: string; inner: string } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1)) as {
        reply?: unknown;
        inner?: unknown;
      };
      const reply = typeof obj.reply === "string" ? obj.reply.trim() : "";
      const inner = typeof obj.inner === "string" ? obj.inner.trim() : "";
      if (reply) {
        return { reply, inner: inner || pick(innerPool(persona)) };
      }
    } catch {
      // 落到纯文本兜底
    }
  }
  const plain = cleaned.replace(/^["'""]|["'""]$/g, "").trim();
  return {
    reply: plain || pick(replyPool(persona)),
    inner: pick(innerPool(persona)),
  };
}

/** 旧字段（persona="amo"|"chen"、amoDirection、chenSpoken）向后兼容：
 *  app/game/page.tsx 已迁移到新字段名，但本路由仍同时接受旧名，内部统一映射到新模型。
 *  balance / partnerTone / spokenTone / pierced 已废弃，不再读取。 */
function normalizePersona(v: unknown): Persona {
  // 旧：amo（她）→ vera;chen（他）→ sean
  if (v === "amo" || v === "vera") return "vera";
  return "sean";
}

function normalizePhase(v: unknown): Phase {
  return v === "strained" ? "strained" : "warm";
}

/** 旧对话历史里的 role 可能是 "amo"|"chen"，统一映射到 "vera"|"sean" */
function normalizeHistoryRole(v: unknown): Persona {
  if (v === "amo" || v === "vera") return "vera";
  return "sean";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // 用 any 取字段以兼容旧客户端字段名
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx: any = body?.context ?? {};

    const partnerSpoken: string | undefined =
      typeof ctx.partnerSpoken === "string"
        ? ctx.partnerSpoken
        : typeof ctx.chenSpoken === "string"
        ? ctx.chenSpoken
        : undefined;

    if (!partnerSpoken) {
      return NextResponse.json(
        { ok: false, error: "partnerSpoken（或旧字段 chenSpoken）不能为空" },
        { status: 400 }
      );
    }

    const persona = normalizePersona(ctx.persona);
    const phase = normalizePhase(ctx.phase);

    const direction: string | undefined =
      typeof ctx.direction === "string"
        ? ctx.direction
        : typeof ctx.amoDirection === "string"
        ? ctx.amoDirection
        : undefined;

    const dialogueHistory: NpcContext["dialogueHistory"] = Array.isArray(
      ctx.dialogueHistory
    )
      ? ctx.dialogueHistory
          .map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (d: any) =>
              d && typeof d.text === "string"
                ? { role: normalizeHistoryRole(d.role), text: d.text as string }
                : null
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((x: any): x is { role: Persona; text: string } => x !== null)
      : undefined;

    const fullContext: NpcContext = {
      persona,
      phase,
      sceneId:
        typeof ctx.sceneId === "string" ? ctx.sceneId : "act1_warm",
      sceneBrief:
        typeof ctx.sceneBrief === "string"
          ? ctx.sceneBrief
          : "两人吃完饭，在江边散步。夜风有点凉。",
      situation:
        typeof ctx.situation === "string" ? ctx.situation : undefined,
      direction,
      partnerSpoken: partnerSpoken.slice(0, 500),
      dialogueHistory,
    };

    const systemPrompt =
      persona === "vera"
        ? buildVeraSystemPrompt(fullContext)
        : buildSeanSystemPrompt(fullContext);

    let reply: string;
    let inner: string;
    try {
      const out = await chat(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `请输出 ${
              persona === "vera" ? "Vera" : "Sean"
            } 这一轮的 JSON(reply + inner)。`,
          },
        ],
        { temperature: 0.85, maxTokens: 200 }
      );
      ({ reply, inner } = parseOutput(out, persona));
    } catch (err) {
      console.error("[npc] LLM 调用失败，启用兜底：", err);
      reply = pick(replyPool(persona));
      inner = pick(innerPool(persona));
    }

    return NextResponse.json({
      ok: true,
      reply,
      inner,
      source: "llm",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
