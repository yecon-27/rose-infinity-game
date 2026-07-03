"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  decideIntensity,
  hasExposure,
  intensityHint,
  PIERCE_THRESHOLD,
} from "@/lib/intensity";
import {
  loadRelationship,
  RelationshipState,
  saveRelationship,
  saveSceneRecord,
  TurnRecord,
} from "@/lib/playthrough";
import { getScene, nextScene, ACT_SEQUENCE, Beat, Scene } from "@/lib/scenes";

interface Turn {
  id: number;
  inner: string;
  spoken: string;
  amoReply: string;
  amoInner: string;
  intensity: "high" | "low" | "pierce";
  hint: string | null;
}

type Speaker = "narrator" | "amo" | "chen";

interface Toast {
  key: number;
  text: string;
  tone: "closer" | "farther" | "pierce";
}

export default function GamePage() {
  return (
    <Suspense fallback={null}>
      <GameInner />
    </Suspense>
  );
}

function GameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sceneId = searchParams.get("scene") ?? ACT_SEQUENCE[0].id;
  const scene: Scene = getScene(sceneId) ?? ACT_SEQUENCE[0];

  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"filter" | "npc">("filter");
  const [error, setError] = useState<string | null>(null);
  const [rel, setRel] = useState<RelationshipState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 从幕一进入 = 新的一局,关系状态归零;中途刷新其他幕则续用存档
    if (sceneId === ACT_SEQUENCE[0].id) {
      const fresh = {
        distance: 50,
        exposureCount: 0,
        pierced: false,
        pierceExposed: false,
      };
      saveRelationship(fresh);
      setRel(fresh);
    } else {
      setRel(loadRelationship());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLastScene = !nextScene(scene.id);
  const totalBeats = scene.beats.length;
  const sceneDone = turns.length >= totalBeats;
  const beat: Beat = scene.beats[Math.min(turns.length, totalBeats - 1)];

  // 穿透时刻:终幕最后一拍 + 全程累积暴露达到阈值 → 过滤器碎裂,原话直出
  const pierceActive =
    scene.id === "act5_end" &&
    !sceneDone &&
    turns.length === totalBeats - 1 &&
    (rel?.exposureCount ?? 0) >= PIERCE_THRESHOLD;

  // 计算当前阿沉立绘:最后一次 turn 的强度决定
  const lastTurn = turns[turns.length - 1];
  const chenPortrait =
    !lastTurn
      ? "/images/characters/chen.png"
      : lastTurn.intensity === "high"
        ? "/images/characters/chen-avoidant.png"
        : "/images/characters/chen-vulnerable.png";
  const amoPortrait = scene.amoPortrait ?? "/images/characters/amo.png";

  // 结局分支:穿透且说出真话 → 门没有关上
  const closingNarration =
    scene.id === "act5_end" &&
    rel?.pierced &&
    rel?.pierceExposed &&
    scene.piercedClosingNarration
      ? scene.piercedClosingNarration
      : scene.closingNarration;

  function showToast(t: Omit<Toast, "key">) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const next = { ...t, key: Date.now() };
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  /** 阿默"刚说的话":当前节拍锚点台词,否则上一轮她的回应 */
  function amoLastLine(): string | undefined {
    return beat.amoLine ?? lastTurn?.amoReply;
  }

  /** 给 NPC 的完整对话史:编剧锚点台词 + LLM 生成的往来 */
  function buildHistory(): Array<{ role: "chen" | "amo"; text: string }> {
    const history: Array<{ role: "chen" | "amo"; text: string }> = [];
    turns.forEach((t, j) => {
      const anchor = scene.beats[j]?.amoLine;
      if (anchor) history.push({ role: "amo", text: anchor });
      history.push({ role: "chen", text: t.spoken });
      history.push({ role: "amo", text: t.amoReply });
    });
    if (beat.amoLine) history.push({ role: "amo", text: beat.amoLine });
    return history;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading || !rel) return;

    setLoading(true);
    setError(null);
    setPhase("filter");
    try {
      let spoken: string;
      let intensity: Turn["intensity"];
      let hint: string | null;

      if (pierceActive) {
        // 过滤器碎了:原话直出,不走改写
        spoken = trimmed;
        intensity = "pierce";
        hint = null;
      } else {
        intensity = decideIntensity(
          trimmed,
          turns.length,
          turns.map((t) => t.inner)
        );
        hint = intensityHint(intensity);

        const filterRes = await fetch("/api/filter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: trimmed,
            intensity,
            context: {
              sceneId: scene.id,
              sceneBrief: scene.brief,
              situation: beat.situation,
              amosLastLine: amoLastLine(),
              priorContext: lastTurn
                ? `上一轮阿沉说"${lastTurn.spoken}",阿默回"${lastTurn.amoReply}"`
                : undefined,
            },
          }),
        });
        const filterData = await filterRes.json();
        if (!filterData.ok) throw new Error(filterData.error || "过滤器调用失败");
        spoken = filterData.spoken;
      }

      setPhase("npc");

      const npcRes = await fetch("/api/npc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            sceneId: scene.id,
            sceneBrief: scene.brief,
            situation: beat.situation,
            amoDirection: beat.amoDirection,
            chenSpoken: spoken,
            dialogueHistory: buildHistory(),
            distance: rel.distance,
            pierced: intensity === "pierce",
          },
        }),
      });
      const npcData = await npcRes.json();
      if (!npcData.ok) throw new Error(npcData.error || "NPC 调用失败");

      // 更新关系状态:暴露拉近距离,回避推远
      const exposed = intensity === "pierce" ? hasExposure(trimmed) : intensity === "low";
      const delta =
        intensity === "pierce" ? (exposed ? -25 : +10) : exposed ? -9 : +6;
      const nextRel: RelationshipState = {
        distance: Math.max(0, Math.min(100, rel.distance + delta)),
        exposureCount: rel.exposureCount + (intensity === "low" ? 1 : 0),
        pierced: rel.pierced || intensity === "pierce",
        pierceExposed:
          intensity === "pierce" ? exposed : rel.pierceExposed,
      };
      setRel(nextRel);
      saveRelationship(nextRel);

      showToast(
        intensity === "pierce"
          ? { text: "过滤器 · 碎裂", tone: "pierce" }
          : delta < 0
            ? { text: "阿默 · 松动 ↓", tone: "closer" }
            : { text: "阿默 · 疏离 ↑", tone: "farther" }
      );

      setTurns((prev) => [
        ...prev,
        {
          id: Date.now(),
          inner: trimmed,
          spoken,
          amoReply: npcData.reply,
          amoInner: npcData.inner ?? "",
          intensity,
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
      amoInner: t.amoInner,
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

      {/* 关系状态通知(底特律式,右上角短暂浮现) */}
      {toast && (
        <div
          key={toast.key}
          className={`fixed top-6 right-6 z-40 fade-in px-4 py-2 border backdrop-blur-md text-xs tracking-widest ${
            toast.tone === "closer"
              ? "border-accent/60 bg-black/60 text-accent"
              : toast.tone === "pierce"
                ? "border-white bg-black/80 text-white"
                : "border-white/30 bg-black/60 text-white/60"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* 顶部场景标题 + 距离指示(两个点,间距即距离) */}
      <header className="relative z-20 pt-6 text-center">
        <p className="text-xs tracking-widest text-white/80 uppercase drop-shadow">
          {scene.name}
        </p>
        <p className="text-[10px] text-white/50 mt-1 tracking-widest">
          {ACT_SEQUENCE.findIndex((s) => s.id === scene.id) + 1} /{" "}
          {ACT_SEQUENCE.length}
        </p>
        {rel && (
          <div
            className="mx-auto mt-3 flex items-center justify-center transition-all duration-1000"
            style={{ gap: `${12 + rel.distance}px` }}
            title="两个人的距离"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent/80" />
          </div>
        )}
      </header>

      {/* 对话历史区(滚动) */}
      <div className="relative z-20 px-6 pt-8 pb-[420px] max-w-3xl mx-auto">
        {/* 开场旁白 */}
        <div className="fade-in mb-6">
          <NarrationBlock paragraphs={scene.openingNarration} label="旁白" />
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

        {/* 节拍流:每一拍 = 旁白推进 + 阿默锚点台词 + 玩家一轮交锋 */}
        {scene.beats
          .slice(0, Math.min(turns.length + 1, totalBeats))
          .map((b, j) => {
            const turn = turns[j];
            return (
              <div key={j} className="mb-6 space-y-2">
                {b.narration && (
                  <div className="fade-in">
                    <NarrationBlock paragraphs={b.narration} />
                  </div>
                )}
                {b.amoLine && (
                  <div className="fade-in">
                    <DialogBubble speaker="amo" text={b.amoLine} />
                  </div>
                )}

                {turn && (
                  <div className="fade-in space-y-2">
                    {/* 内心话气泡(半透明灰色,只有玩家看得见) */}
                    <div className="border border-white/20 bg-white/5 backdrop-blur-md p-3 rounded">
                      <p className="text-[10px] text-white/50 mb-1 tracking-widest">
                        内心话 · 只有你看得见
                      </p>
                      <p className="inner-voice text-sm text-white/60">
                        {turn.inner}
                      </p>
                    </div>

                    {turn.hint && (
                      <p className="text-xs text-accent/80 italic text-center py-1">
                        {turn.hint}
                      </p>
                    )}
                    {turn.intensity === "pierce" && (
                      <p className="text-xs text-white italic text-center py-1">
                        这一次,没有任何东西替你修饰。
                      </p>
                    )}

                    {/* 阿沉出口话 */}
                    <DialogBubble speaker="chen" text={turn.spoken} />

                    {/* 阿默回应 */}
                    <DialogBubble speaker="amo" text={turn.amoReply} />
                  </div>
                )}
              </div>
            );
          })}

        {/* 穿透时刻提示 */}
        {pierceActive && !loading && (
          <div className="fade-in mb-6 border border-white/70 bg-black/70 backdrop-blur-md p-4 rounded text-sm text-white leading-relaxed">
            <p className="text-xs tracking-widest mb-2 text-white/70">
              咔。
            </p>
            <p>
              你听见什么东西碎掉的声音。这一次,你说什么,就是什么。
            </p>
          </div>
        )}

        {loading && (
          <div className="fade-in text-center text-sm text-white/70 py-4">
            {phase === "filter"
              ? pierceActive
                ? "你听见自己的声音,没有隔着任何东西……"
                : "过滤器正在改写你的话……"
              : "阿默在想怎么回……"}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-300 border border-red-500/30 bg-red-900/20 backdrop-blur-sm p-3 rounded">
            {error}
          </div>
        )}

        {/* 本幕结束 */}
        {sceneDone && !loading && (
          <div className="fade-in text-center pt-4 space-y-3">
            {closingNarration.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-white/80">
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
            <span className={pierceActive ? "text-white" : undefined}>
              {sceneDone
                ? "本幕结束"
                : pierceActive
                  ? "过滤器碎了。说什么,就是什么。"
                  : beat.inputPrompt}
            </span>
            <span>
              第 {turns.length} / {totalBeats} 轮
            </span>
          </div>
          <form onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="此刻阿沉心里真正想说的话……"
              className={`w-full bg-white/5 border p-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none rounded ${
                pierceActive
                  ? "border-white/70 focus:border-white"
                  : "border-white/20 focus:border-accent/60"
              }`}
              rows={2}
              disabled={loading || sceneDone}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || sceneDone}
              className="mt-2 w-full py-2 border border-white/30 hover:border-accent hover:bg-accent hover:text-ink transition-colors text-sm tracking-widest text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white"
            >
              {loading
                ? pierceActive
                  ? "说出口……"
                  : "过滤中……"
                : pierceActive
                  ? "说 出 口(没有过滤)"
                  : "说 出 口"}
            </button>
          </form>
        </div>
      </footer>
    </main>
  );
}

/** 旁白块 */
function NarrationBlock({
  paragraphs,
  label,
}: {
  paragraphs: string[];
  label?: string;
}) {
  return (
    <div className="border-l-2 border-white/40 pl-4 bg-black/30 backdrop-blur-sm py-3 pr-4 rounded-r">
      {label && (
        <p className="text-xs text-white/60 mb-2 tracking-widest">{label}</p>
      )}
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="leading-relaxed text-white/90 mt-2 first:mt-0 text-sm"
        >
          {p}
        </p>
      ))}
    </div>
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
