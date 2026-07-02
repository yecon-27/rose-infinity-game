"use client";

import { useState } from "react";
import Link from "next/link";

interface Turn {
  id: number;
  inner: string; // 阿沉的真心话(只有玩家看得见)
  spoken: string; // 阿沉说出口的话
  amoReply: string; // 阿默的回应
  intensity: "high" | "low";
}

const SCENE_BRIEF = "两人第七次约会,吃完饭,账单放在桌上,阿默提议 AA。";
const AMOS_OPENING = "扫这个吧,我们 AA。";

export default function GamePage() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"filter" | "npc">("filter");
  const [error, setError] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<"high" | "low">("high");

  // MVP:3 轮后可结束本幕
  const MAX_TURNS = 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setPhase("filter");
    try {
      // 1. 调过滤器
      const filterRes = await fetch("/api/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: trimmed,
          intensity,
          context: {
            sceneId: "act1_aa",
            sceneBrief: SCENE_BRIEF,
            amosLastLine: AMOS_OPENING,
          },
        }),
      });
      const filterData = await filterRes.json();
      if (!filterData.ok) throw new Error(filterData.error || "过滤器调用失败");

      setPhase("npc");

      // 2. 调阿默 NPC(用过滤后的话)
      const npcRes = await fetch("/api/npc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            sceneId: "act1_aa",
            sceneBrief: SCENE_BRIEF,
            chenSpoken: filterData.spoken,
            dialogueHistory: turns.map((t) => [
              { role: "chen", text: t.spoken },
              { role: "amo", text: t.amoReply },
            ]).flat(),
          },
        }),
      });
      const npcData = await npcRes.json();
      if (!npcData.ok) throw new Error(npcData.error || "NPC 调用失败");

      setTurns((prev) => [
        ...prev,
        {
          id: Date.now(),
          inner: filterData.inner,
          spoken: filterData.spoken,
          amoReply: npcData.reply,
          intensity: filterData.intensity,
        },
      ]);
      setInput("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
      setPhase("filter");
    }
  }

  return (
    <main className="min-h-screen flex flex-col px-6 py-8 max-w-2xl mx-auto">
      <header className="mb-8 text-center">
        <p className="text-xs tracking-widest text-muted uppercase">
          幕一 · AA 制
        </p>
      </header>

      <div className="flex-1 space-y-6">
        {/* 开场旁白 */}
        <div className="fade-in">
          <p className="text-xs text-muted mb-2">旁白</p>
          <p className="leading-relaxed text-ink/80">
            第七次约会。吃完饭,账单放在桌上,服务员站在一旁。
            阿默摸出手机,扫了一下二维码。
          </p>
        </div>

        <div className="fade-in border-l-2 border-accent/40 pl-4">
          <p className="text-xs text-muted mb-2">阿默</p>
          <p className="leading-relaxed">"{AMOS_OPENING}"</p>
        </div>

        {/* 教学提示 */}
        {turns.length === 0 && !loading && (
          <div className="fade-in bg-paper border border-accent/30 p-4 rounded text-sm text-ink/70 leading-relaxed">
            <p className="text-xs text-accent tracking-widest mb-2">
              教学提示
            </p>
            <p>
              下面的输入框里,写下阿沉<strong>真正想说</strong>的话。
              屏幕会同时显示两行:灰色半透明的是你的真心,正常显示的是他实际说出口的——那是你拦不住的。
            </p>
          </div>
        )}

        {/* 对话流 */}
        {turns.map((turn, i) => (
          <div key={turn.id} className="fade-in space-y-3">
            <div className="text-center text-[10px] text-muted/50 tracking-widest">
              — 第 {i + 1} 轮 —
            </div>

            {/* 内心话(灰色半透明,只有玩家看得见) */}
            <div className="bg-paper border border-ink/10 p-4 rounded">
              <p className="text-xs text-muted mb-2">
                内心话 <span className="opacity-60">· 只有你看得见</span>
              </p>
              <p className="inner-voice text-sm">{turn.inner}</p>
            </div>

            {/* 阿沉出口话 */}
            <div className="border-l-2 border-ink/30 pl-4">
              <p className="text-xs text-muted mb-2">
                阿沉说出口
                {turn.intensity === "low" && (
                  <span className="ml-2 text-accent/70 text-[10px]">
                    [过滤强度:低 · 漏了一半]
                  </span>
                )}
              </p>
              <p className="spoken-words leading-relaxed">"{turn.spoken}"</p>
            </div>

            {/* 阿默的回应 */}
            <div className="border-l-2 border-accent/40 pl-4">
              <p className="text-xs text-muted mb-2">阿默</p>
              <p className="leading-relaxed">"{turn.amoReply}"</p>
            </div>
          </div>
        ))}

        {/* 加载提示 */}
        {loading && (
          <div className="fade-in text-center text-sm text-muted py-4">
            {phase === "filter" ? "过滤器正在改写你的话……" : "阿默在想怎么回……"}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-700/80 border border-red-300/50 p-3 rounded">
            {error}
          </div>
        )}

        {/* 本幕结束入口 */}
        {turns.length >= MAX_TURNS && !loading && (
          <div className="fade-in text-center pt-6 space-y-3">
            <p className="text-sm text-muted leading-relaxed">
              账单清清楚楚地分完了。你们走出餐厅,夜风有点凉。
            </p>
            <Link
              href="/ending"
              className="inline-block py-2 px-8 border border-ink/30 hover:border-ink hover:bg-ink hover:text-paper transition-colors text-sm tracking-widest"
            >
              结 束 本 幕
            </Link>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <footer className="mt-8 pt-6 border-t border-ink/10">
        <div className="mb-3 flex items-center gap-3 text-xs text-muted">
          <span>过滤强度(MVP 调试):</span>
          <button
            type="button"
            onClick={() => setIntensity("high")}
            className={`px-2 py-1 border ${
              intensity === "high"
                ? "border-ink bg-ink text-paper"
                : "border-ink/30"
            }`}
          >
            高
          </button>
          <button
            type="button"
            onClick={() => setIntensity("low")}
            className={`px-2 py-1 border ${
              intensity === "low"
                ? "border-ink bg-ink text-paper"
                : "border-ink/30"
            }`}
          >
            低
          </button>
          <span className="ml-auto opacity-60">
            第 {turns.length} / {MAX_TURNS} 轮
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="此刻阿沉心里真正想说的话……"
            className="w-full bg-transparent border border-ink/20 p-3 text-sm resize-none focus:outline-none focus:border-ink/50"
            rows={3}
            disabled={loading || turns.length >= MAX_TURNS}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || turns.length >= MAX_TURNS}
            className="mt-2 w-full py-2 border border-ink/30 hover:border-ink hover:bg-ink hover:text-paper transition-colors text-sm tracking-widest disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            {loading ? "过滤中……" : "说 出 口"}
          </button>
        </form>
      </footer>
    </main>
  );
}
