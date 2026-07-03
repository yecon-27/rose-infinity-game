import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/hunyuan";
import {
  buildAmoSystemPrompt,
  buildChenSystemPrompt,
  NpcContext,
} from "@/lib/npc-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 阿默的兜底台词池,LLM 失败时随机取一句 */
const AMO_REPLY_FALLBACKS = [
  "嗯,行。",
  "那走吧。",
  "也是。",
  "你看呗,都行。",
  "哦,好。",
];

/** 阿默的内心话兜底池——即使 LLM 失败,结局揭示也不能开天窗 */
const AMO_INNER_FALLBACKS = [
  "她想说点什么。想了想,算了。",
  "又是这样。我们俩谁也不肯先开口。",
  "他要是再多说一句,我可能就说了。可他没有。",
  "没关系的。反正我也没打算说。",
];

function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 从 LLM 输出里解析 {"reply","inner"},失败则整段当 reply */
function parseAmoOutput(raw: string): { reply: string; inner: string } {
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
      const reply =
        typeof obj.reply === "string" ? obj.reply.trim() : "";
      const inner =
        typeof obj.inner === "string" ? obj.inner.trim() : "";
      if (reply) {
        return { reply, inner: inner || pick(AMO_INNER_FALLBACKS) };
      }
    } catch {
      // 落到纯文本兜底
    }
  }
  const plain = cleaned.replace(/^["'""]|["'""]$/g, "").trim();
  return {
    reply: plain || pick(AMO_REPLY_FALLBACKS),
    inner: pick(AMO_INNER_FALLBACKS),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { context } = body as { context: Partial<NpcContext> };

    if (!context.chenSpoken || typeof context.chenSpoken !== "string") {
      return NextResponse.json(
        { ok: false, error: "chenSpoken 不能为空" },
        { status: 400 }
      );
    }

    const fullContext: NpcContext = {
      persona: context.persona === "chen" ? "chen" : "amo",
      sceneId: context.sceneId ?? "act1_aa",
      sceneBrief:
        context.sceneBrief ??
        "两人第七次约会,吃完饭,账单放在桌上,阿默提议 AA。",
      situation: context.situation,
      amoDirection: context.amoDirection,
      chenSpoken: context.chenSpoken.slice(0, 500),
      dialogueHistory: context.dialogueHistory,
      balance: typeof context.balance === "number" ? context.balance : 0,
      spokenTone: context.spokenTone,
      pierced: context.pierced === true,
    };

    const systemPrompt =
      fullContext.persona === "chen"
        ? buildChenSystemPrompt(fullContext)
        : buildAmoSystemPrompt(fullContext);

    let reply: string;
    let inner: string;
    try {
      const out = await chat(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `请输出阿默这一轮的 JSON(reply + inner)。`,
          },
        ],
        { temperature: 0.85, maxTokens: 200 }
      );
      ({ reply, inner } = parseAmoOutput(out));
    } catch (err) {
      console.error("[npc] LLM 调用失败,启用兜底:", err);
      reply = pick(AMO_REPLY_FALLBACKS);
      inner = pick(AMO_INNER_FALLBACKS);
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
