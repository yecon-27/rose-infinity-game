import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";
import {
  buildLetterFallback,
  buildLetterSystemPrompt,
  normalizeChoices,
  normalizeLetterMode,
} from "@/lib/letter";

const REFLECTION_LENSES = [
  "从玩家原话里最轻、最容易被忽略的几个字开始，不要复述整句话。",
  "从一次很小的选择开始，让它的分量在后文才慢慢显出来。",
  "从两次表达之间的反差开始，但不要逐条对照或解释。",
  "先写那种当时很难说清的感觉，到中段再让玩家原话自然出现。",
  "从一句没有得到结论的话开始，结尾也保留一点没有说尽的空间。",
] as const;

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
    const reflectionLens =
      mode === "reflection"
        ? REFLECTION_LENSES[
            Math.floor(Math.random() * REFLECTION_LENSES.length)
          ]
        : undefined;
    const reflectionParagraphs =
      mode === "reflection" ? 3 + Math.floor(Math.random() * 3) : undefined;

    try {
      const output = await chat(
        [
          {
            role: "system",
            content: buildLetterSystemPrompt(mode, choices),
          },
          {
            role: "user",
            content: `下面的 JSON 是这次回声唯一可以使用的事实来源。键名只是说明，不是正文格式。\n<事实>\n${JSON.stringify(
              {
                玩家原话: message,
                选择文字: choices.map((choice) => ({
                  文字: choice.text,
                  曾试着伸手: choice.reach,
                })),
              },
              null,
              2
            )}\n</事实>\n${
              reflectionLens ? `本次写作入口：${reflectionLens}\n` : ""
            }${
              reflectionParagraphs
                ? `本次节奏：自然写成 ${reflectionParagraphs} 段，段落长短不要均衡。\n`
                : ""
            }请只输出信笺正文，不要补写 JSON 中没有发生的事。`,
          },
        ],
        {
          temperature: mode === "reflection" ? 0.68 : 0.72,
          maxTokens: mode === "reflection" ? 640 : 720,
          thinking: "disabled",
        }
      );
      const text = cleanOutput(output);
      if (!text) throw new Error("DeepSeek 返回了空内容");

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
