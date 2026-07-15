import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/hunyuan";
import {
  buildLetterFallback,
  buildLetterSystemPrompt,
  normalizeChoices,
  normalizeLetterMode,
} from "@/lib/letter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanOutput(value: string): string {
  return value
    .trim()
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^#{1,3}\s*[^\n]+\n+/, "")
    .slice(0, 1200)
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const payload = body && typeof body === "object" ? body : {};
    const rawMessage = (payload as { message?: unknown }).message;
    const message = typeof rawMessage === "string" ? rawMessage.trim() : "";

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "请先写下一句当年想说的话。" },
        { status: 400 }
      );
    }
    if (message.length > 280) {
      return NextResponse.json(
        { ok: false, error: "这句话有点长，请收在 280 字以内。" },
        { status: 400 }
      );
    }

    const mode = normalizeLetterMode((payload as { mode?: unknown }).mode);
    const choices = normalizeChoices(
      (payload as { choices?: unknown }).choices
    );
    const fallback = buildLetterFallback(mode, message, choices);

    try {
      const output = await chat(
        [
          {
            role: "system",
            content: buildLetterSystemPrompt(mode, choices),
          },
          {
            role: "user",
            content: `玩家当年想说却没说完的话：\n<玩家引文>\n${message}\n</玩家引文>`,
          },
        ],
        { temperature: 0.72, maxTokens: 720 }
      );
      const text = cleanOutput(output);
      if (!text) throw new Error("混元返回了空内容");

      return NextResponse.json({
        ok: true,
        text,
        source: "generated",
        choiceCount: choices.length,
      });
    } catch (error) {
      console.error("[letter] 生成失败，启用本地信笺：", error);
      return NextResponse.json({
        ok: true,
        text: fallback,
        source: "fallback",
        choiceCount: choices.length,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
