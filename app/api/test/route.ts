import { NextResponse } from "next/server";
import { chat } from "@/lib/hunyuan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reply = await chat(
      [
        {
          role: "system",
          content:
            "你是一个测试助手。请用一句话回复确认你能正常工作,并说出你是哪个模型。",
        },
        { role: "user", content: "ping" },
      ],
      { temperature: 0.3, maxTokens: 60 }
    );
    return NextResponse.json({
      ok: true,
      reply,
      model: process.env.HUNYUAN_MODEL,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
