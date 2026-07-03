import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/hunyuan";
import {
  buildFilterSystemPrompt,
  fallbackFilter,
  FilterIntensity,
  FilterContext,
} from "@/lib/filter-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      input,
      intensity = "high",
      context = {},
    } = body as {
      input: string;
      intensity?: FilterIntensity;
      context?: Partial<FilterContext>;
    };

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "input 不能为空" },
        { status: 400 }
      );
    }

    // 安全截断,防止玩家输入过长撑爆 prompt
    const safeInput = input.trim().slice(0, 500);
    const safeIntensity: FilterIntensity =
      intensity === "low" || intensity === "anxious" ? intensity : "high";
    const fullContext: FilterContext = {
      sceneId: context.sceneId ?? "act1_aa",
      sceneBrief:
        context.sceneBrief ??
        "两人第七次约会,吃完饭,账单放在桌上,阿默提议 AA。",
      situation: context.situation,
      amosLastLine: context.amosLastLine,
      priorContext: context.priorContext,
    };

    const systemPrompt = buildFilterSystemPrompt(safeIntensity, fullContext);

    let spoken: string;
    try {
      const reply = await chat(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `玩家(阿沉)的真心话是:\n\n${safeInput}\n\n请输出经过回避过滤器后,阿沉实际说出口的话。`,
          },
        ],
        { temperature: 0.85, maxTokens: 120 }
      );
      spoken = reply.trim().replace(/^["'""]|["'""]$/g, "").trim();
      if (!spoken) {
        spoken = fallbackFilter(safeInput, safeIntensity);
      }
    } catch (err) {
      // LLM 失败 → 规则模板兜底,游戏不中断
      console.error("[filter] LLM 调用失败,启用兜底:", err);
      spoken = fallbackFilter(safeInput, safeIntensity);
    }

    return NextResponse.json({
      ok: true,
      inner: safeInput,
      spoken,
      intensity: safeIntensity,
      source: "llm", // 用于调试,兜底时为 "fallback"
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
