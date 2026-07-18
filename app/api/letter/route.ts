import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";
import {
  buildLetterFallback,
  buildJourneyFallback,
  buildLetterSystemPrompt,
  hasUsableLetterOutput,
  isTrustBreachMessage,
  normalizeChoices,
  normalizeLetterMode,
  normalizeLetterRecipient,
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

async function reviseUngroundedReflection(
  message: string,
  choices: ReturnType<typeof normalizeChoices>,
  draft: string,
  paragraphCount: number
): Promise<string> {
  const revised = await chat(
    [
      {
        role: "system",
        content: `你是《玫瑰无限》的事实编辑。你的任务不是润色，而是删除一篇关系复盘里没有依据的内容，再重写成自然中文。

硬性规则：
- 唯一事实来源是用户下一条消息里的 JSON。“原稿”也不是事实，不能沿用其中擅自补写的细节。
- 不新增动作、姿势、地点、时间、天气、物件、手机画面、消息、对话语气、身体感受、另一方反应或人物动机。
- 不猜玩家为何没开口，不写“害怕被拒绝、怕成为负担、等对方先懂”等未提供原因。
- 不使用“门、光、湖面、伸手、喉咙、深夜、草稿、聊天记录”等意象或场景，除非它们逐字出现在事实来源中。
- 叙述者在关系之外，只称呼“你”；除引用玩家原话，不使用“我”。
- 不写“你没有做错、你很勇敢、值得被理解、放下、向前走”等安慰套话，不给建议，不替另一方说话。
- 当事实很少时，就停留在原句自身的词语和矛盾里；少写一点，也不要补出故事。
- 事实检查只在心里完成，正文不要出现“事实来源、你没有说、你给出的、完整陈述、张力、矛盾、这说明”等校对或分析措辞，也不要逐段解释一个词的功能。
- 语气像熟悉这段故事的人安静陪着读完一句话：朴素、温和，有停顿，但不替玩家总结人生。不强行在结尾写“你不需要……”或得出结论。
- 写成 ${paragraphCount} 个长短不一的自然段，段落间空一行，220 至 380 个汉字。只输出正文。`,
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            事实来源: {
              玩家原话: message,
              选择文字: choices.map((choice) => choice.text),
            },
            原稿: draft,
          },
          null,
          2
        ),
      },
    ],
    {
      temperature: 0.28,
      maxTokens: 620,
      thinking: "disabled",
    }
  );

  return cleanOutput(revised);
}

async function reviseUngroundedReply(
  message: string,
  choices: ReturnType<typeof normalizeChoices>,
  draft: string
): Promise<string> {
  const revised = await chat(
    [
      {
        role: "system",
        content: `你是《玫瑰无限》的回信事实编辑。把原稿改成关系中另一方写给“你”的第一人称回信。

硬性规则：
- 唯一事实来源是用户下一条消息里的 JSON；原稿不是事实来源。
- 全文保持伴侣的第一人称“我”，直接回应“你”。不能改成咨询师、旁观者或编辑口吻。
- 删除没有依据的共同回忆、动作、地点、时间、消息、对话、身体感受与过去动机。
- 可以写此刻读到原话后的迟疑、难过、歉意或不知道怎么回答；这些是当下回应，不要伪装成过去发生的事实。
- 不说“这封回信不能”“它只能”“这里不替谁”“作为虚构回应”等免责声明。
- 涉及欺骗、记录或信任破裂时，不擅自认罪、否认或补写真相；可以回应“你已经无法相信我”以及它对关系造成的后果。
- 3 至 5 个自然段，220 至 420 个汉字。只输出正文。`,
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            事实来源: {
              玩家原话: message,
              选择文字: choices.map((choice) => choice.text),
            },
            原稿: draft,
          },
          null,
          2
        ),
      },
    ],
    {
      temperature: 0.22,
      maxTokens: 680,
      thinking: "disabled",
    }
  );

  return cleanOutput(revised);
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const payload = body && typeof body === "object" ? body : {};
    const rawMessage = (payload as { message?: unknown }).message;
    const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
    const journey = (payload as { journey?: unknown }).journey === true;
    const mode = normalizeLetterMode((payload as { mode?: unknown }).mode);
    const recipient = normalizeLetterRecipient(
      (payload as { recipient?: unknown }).recipient
    );
    const choices = normalizeChoices(
      (payload as { choices?: unknown }).choices
    );

    if (journey && choices.length === 0) {
      return NextResponse.json(
        { ok: false, error: "这一局还没有留下可以回望的选择。" },
        { status: 400 }
      );
    }
    if (!journey && !message) {
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

    const fallback = journey
      ? buildJourneyFallback(mode, choices)
      : buildLetterFallback(mode, message, choices);
    const trustBreach = !journey && isTrustBreachMessage(message);
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
            content: buildLetterSystemPrompt(
              mode,
              choices,
              journey,
              recipient
            ),
          },
          {
            role: "user",
            content: `下面的 JSON 是这次回声唯一可以使用的事实来源。键名只是说明，不是正文格式。\n<事实>\n${JSON.stringify(
              {
                ...(journey ? {} : { 玩家原话: message }),
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
            }${
              journey
                ? "这是通关后的自动信笺，请自然回应这一局，不要假装玩家刚输入了一句话。"
                : "请自然回应玩家原话。"
            }只输出信笺正文，不要补写 JSON 中没有发生的事。`,
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

      if (
        mode === "reflection" &&
        !hasUsableLetterOutput(mode, message, text, choices)
      ) {
        const revised = await reviseUngroundedReflection(
          message,
          choices,
          text,
          reflectionParagraphs ?? 3
        );
        if (hasUsableLetterOutput(mode, message, revised, choices)) {
          return NextResponse.json({
            ok: true,
            text: revised,
            source: "generated",
            choiceCount: choices.length,
          });
        }
      } else if (
        mode === "reply" &&
        (trustBreach || !hasUsableLetterOutput(mode, message, text, choices))
      ) {
        const revised = await reviseUngroundedReply(
          message,
          choices,
          text
        );
        if (hasUsableLetterOutput(mode, message, revised, choices)) {
          return NextResponse.json({
            ok: true,
            text: revised,
            source: "generated",
            choiceCount: choices.length,
          });
        }
      } else if (!hasUsableLetterOutput(mode, message, text, choices)) {
        console.warn("[letter] 生成内容未通过事实边界检查，改用本地信笺");
        return NextResponse.json({
          ok: true,
          text: fallback,
          source: "fallback",
          choiceCount: choices.length,
        });
      }

      if (!hasUsableLetterOutput(mode, message, text, choices)) {
        console.warn("[letter] 改写内容仍未通过事实边界检查，改用本地信笺");
        return NextResponse.json({
          ok: true,
          text: fallback,
          source: "fallback",
          choiceCount: choices.length,
        });
      }

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
