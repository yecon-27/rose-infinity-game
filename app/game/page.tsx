"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { decideIntensity, intensityHint } from "@/lib/intensity";
import { saveSceneRecord, TurnRecord } from "@/lib/playthrough";
import { getScene, nextScene, ACT_SEQUENCE, Scene } from "@/lib/scenes";

interface Turn {
  id: number;
  inner: string;
  spoken: string;
  amoReply: string;
  intensity: "high" | "low";
  hint: string | null;
}

type Speaker = "narrator" | "amo" | "chen";

export default function GamePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sceneId = searchParams.get("scene") ?? ACT_SEQUENCE[0].id;
  const scene: Scene = getScene(sceneId) ?? ACT_SEQUENCE[0];

  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"filter" | "npc">("filter");
  const [error, setError] = useState<string | null>(null);

  const isLastScene = !nextScene(scene.id);

  // 计算当前阿沉立绘:最后一次 turn 的强度决定
  // low(暴露) → chen-vulnerable;high(完全回避) → chen-avoidant;无 turn → 默认 chen
  const lastTurn = turns[turns.length - 1];
  const chenPortrait =
    !lastTurn
      ? "/images/characters/chen.png"
      : lastTurn.intensity === "low"
        ? "/images/characters/chen-vulnerable.png"
        : "/images/characters/chen-avoidant.png";
  const amoPortrait = scene.amoPortrait ?? "/images/characters/amo.png";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setPhase("filter");
    try {
      const decided = decideIntensity(
        trimmed,
        turns.length,
        turns.map((t) => t.inner)
      );
      const hint = intensityHint(decided);

      const filterRes = await fetch("/api/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: trimmed,
          intensity: decided,
          context: {
            sceneId: scene.id,
            sceneBrief: scene.brief,
            amosLastLine: scene.amosOpening,
          },
        }),
      });
      const filterData = await filterRes.json();
      if (!filterData.ok) throw new Error(filterData.error || "过滤器调用失败");

      setPhase("npc");

      const npcRes = await fetch("/api/npc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            sceneId: scene.id,
            sceneBrief: scene.brief,
            chenSpoken: filterData.spoken,
            dialogueHistory: turns
              .map((t) => [
                { role: "chen", text: t.spoken },
                { role: "amo", text: t.amoReply },
              ])
              .flat(),
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
          hint,
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

  function handleFinishScene() {
    const records: TurnRecord[] = turns.map((t) => ({
      inner: t.inner,
      spoken: t.spoken,
      amoReply: t.amoReply,
      intensity: t.intensity,
    }));
    saveSceneRecord({
      sceneId: scene.id,
      sceneName: scene.name,
      goldenQuote: scene.goldenQuote,
      turns: records,
      finishedAt: new Date().toISOString(),
    });

    const next = nextScene(scene.id);
    if (next) {
      router.push(`/game?scene=${next.id}`);
      setTurns([]);
    } else {
      router.push("/ending");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* 场景背景图(全屏) */}
      <div className="fixed inset-0 z-0">
        <Image
          src={scene.background}
          alt={scene.name}
          fill
          priority
          className="object-cover"
        />
        {/* 暗角 + 模糊滤镜,让前景文本可读 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
        {/* 过滤器视觉化:一层非常淡的雾,暗示"横在两人之间的东西" */}
        <div className="absolute inset-0 backdrop-blur-[1px]" />
      </div>

      {/* 立绘层:阿沉(左,半透明因为玩家是第一视角) + 阿默(右) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-[35vw] max-w-[400px] min-w-[200px] h-[70vh] opacity-70">
          <Image
            src={chenPortrait}
            alt="阿沉"
            fill
            className="object-contain object-bottom drop-shadow-2xl transition-opacity duration-700"
          />
        </div>
        <div className="absolute bottom-0 right-0 w-[35vw] max-w-[400px] min-w-[200px] h-[70vh]">
          <Image
            src={amoPortrait}
            alt="阿默"
            fill
            className="object-contain object-bottom drop-shadow-2xl"
          />
        </div>
      </div>

      {/* 顶部场景标题 */}
      <header className="relative z-20 pt-6 text-center">
        <p className="text-xs tracking-widest text-white/80 uppercase drop-shadow">
          {scene.name}
        </p>
        {!isLastScene && (
          <p className="text-[10px] text-white/50 mt-1 tracking-widest">
            {ACT_SEQUENCE.findIndex((s) => s.id === scene.id) + 1} / {ACT_SEQUENCE.length}
          </p>
        )}
      </header>

      {/* 对话历史区(滚动) */}
      <div className="relative z-20 px-6 pt-8 pb-[420px] max-w-3xl mx-auto">
        {/* 开场旁白 */}
        <div className="fade-in mb-6">
          <div className="border-l-2 border-white/40 pl-4 bg-black/30 backdrop-blur-sm py-3 pr-4 rounded-r">
            <p className="text-xs text-white/60 mb-2 tracking-widest">旁白</p>
            {scene.openingNarration.map((p, i) => (
              <p key={i} className="leading-relaxed text-white/90 mt-2 first:mt-0 text-sm">
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* 阿默开场白 */}
        <div className="fade-in mb-6">
          <DialogBubble speaker="amo" text={scene.amosOpening} />
        </div>

        {/* 教学提示 */}
        {turns.length === 0 && scene.teachingHint && !loading && (
          <div className="fade-in mb-6 border border-accent/40 bg-black/50 backdrop-blur-md p-4 rounded text-sm text-white/80 leading-relaxed">
            <p className="text-xs text-accent tracking-widest mb-2">
              教学提示
            </p>
            <p>{scene.teachingHint}</p>
          </div>
        )}

        {/* 对话流 */}
        {turns.map((turn, i) => (
          <div key={turn.id} className="fade-in mb-6 space-y-2">
            <div className="text-center text-[10px] text-white/40 tracking-widest">
              — 第 {i + 1} 轮 —
            </div>

            {/* 内心话气泡(半透明灰色,只有玩家看得见) */}
            <div className="border border-white/20 bg-white/5 backdrop-blur-md p-3 rounded">
              <p className="text-[10px] text-white/50 mb-1 tracking-widest">
                内心话 · 只有你看得见
              </p>
              <p className="inner-voice text-sm text-white/60">{turn.inner}</p>
            </div>

            {turn.hint && (
              <p className="text-xs text-accent/80 italic text-center py-1">
                {turn.hint}
              </p>
            )}

            {/* 阿沉出口话 */}
            <DialogBubble speaker="chen" text={turn.spoken} />

            {/* 阿默回应 */}
            <DialogBubble speaker="amo" text={turn.amoReply} />
          </div>
        ))}

        {loading && (
          <div className="fade-in text-center text-sm text-white/70 py-4">
            {phase === "filter" ? "过滤器正在改写你的话……" : "阿默在想怎么回……"}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-300 border border-red-500/30 bg-red-900/20 backdrop-blur-sm p-3 rounded">
            {error}
          </div>
        )}

        {/* 本幕结束 */}
        {turns.length >= scene.maxTurns && !loading && (
          <div className="fade-in text-center pt-4 space-y-3">
            {scene.closingNarration.map((p, i) => (
              <p
                key={i}
                className={`text-sm leading-relaxed text-white/80`}
              >
                {p}
              </p>
            ))}
            <button
              type="button"
              onClick={handleFinishScene}
              className="inline-block mt-2 py-2 px-8 border border-white/40 hover:border-white hover:bg-white hover:text-ink transition-colors text-sm tracking-widest text-white"
            >
              {isLastScene ? "看 见 结 局" : "进 入 下 一 幕"}
            </button>
          </div>
        )}
      </div>

      {/* 底部输入区(VN 风格) */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/70 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="mb-2 flex items-center justify-between text-xs text-white/50">
            <span>写下阿沉真正想说的话</span>
            <span>
              第 {turns.length} / {scene.maxTurns} 轮
            </span>
          </div>
          <form onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="此刻阿沉心里真正想说的话……"
              className="w-full bg-white/5 border border-white/20 p-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-accent/60 rounded"
              rows={2}
              disabled={loading || turns.length >= scene.maxTurns}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || turns.length >= scene.maxTurns}
              className="mt-2 w-full py-2 border border-white/30 hover:border-accent hover:bg-accent hover:text-ink transition-colors text-sm tracking-widest text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white"
            >
              {loading ? "过滤中……" : "说 出 口"}
            </button>
          </form>
        </div>
      </footer>
    </main>
  );
}

/** VN 风格对话气泡 */
function DialogBubble({
  speaker,
  text,
}: {
  speaker: Speaker;
  text: string;
}) {
  if (speaker === "narrator") {
    return (
      <div className="border-l-2 border-white/40 pl-4 bg-black/30 backdrop-blur-sm py-3 pr-4 rounded-r">
        <p className="leading-relaxed text-white/90 text-sm">{text}</p>
      </div>
    );
  }

  const isAmo = speaker === "amo";
  const name = isAmo ? "阿默" : "阿沉";
  const accentColor = isAmo ? "border-accent/60" : "border-white/40";
  const bgColor = isAmo ? "bg-black/50" : "bg-black/40";

  return (
    <div className={`border-l-2 ${accentColor} ${bgColor} backdrop-blur-sm py-3 pl-4 pr-4 rounded-r`}>
      <p className="text-xs text-white/60 mb-1 tracking-widest">{name}</p>
      <p className="leading-relaxed text-white/90 text-sm">"{text}"</p>
    </div>
  );
}
