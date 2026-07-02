import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/hunyuan";
import { buildAmoSystemPrompt, NpcContext } from "@/lib/npc-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 阿默的兜底台词池,LLM 失败时随机取一句 */
const AMO_FALLBACKS = [
  "嗯,行。",
  "那走吧。",
  "也是。",
  "你看呗,都行。",
  "哦,好。",
];

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
      sceneId: context.sceneId ?? "act1_aa",
      sceneBrief:
        context.sceneBrief ??
        "两人第七次约会,吃完饭,账单放在桌上,阿默提议 AA。",
      chenSpoken: context.chenSpoken.slice(0, 500),
      dialogueHistory: context.dialogueHistory,
      relationshipState: context.relationshipState,
    };

    const systemPrompt = buildAmoSystemPrompt(fullContext);

    let reply: string;
    try {
      const out = await chat(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `请输出阿默这一轮的回应。`,
          },
        ],
        { temperature: 0.85, maxTokens: 120 }
      );
      reply = out.trim().replace(/^["'""]|["'""]$/g, "").trim();
      if (!reply) {
        reply = AMO_FALLBACKS[
          Math.floor(Math.random() * AMO_FALLBACKS.length)
        ];
      }
    } catch (err) {
      console.error("[npc] LLM 调用失败,启用兜底:", err);
      reply = AMO_FALLBACKS[
        Math.floor(Math.random() * AMO_FALLBACKS.length)
      ];
    }

    return NextResponse.json({
      ok: true,
      reply,
      source: "llm",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
