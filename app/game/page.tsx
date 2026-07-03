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

/** 待揭示的内容块:旁白段落 / 阿默锚点台词 / 教学提示 */
type Block =
  | { kind: "narr"; text: string; label?: string }
  | { kind: "amoLine"; text: string }
  | { kind: "hint"; text: string };

/** 第 j 拍开始前需要逐段揭示的内容 */
function beatBlocks(scene: Scene, j: number): Block[] {
  const blocks: Block[] = [];
  if (j === 0) {
    scene.openingNarration.forEach((p, i) =>
      blocks.push({ kind: "narr", text: p, label: i === 0 ? "旁白" : undefined })
    );
  }
  const beat = scene.beats[j];
  beat.narration?.forEach((p) => blocks.push({ kind: "narr", text: p }));
  if (beat.amoLine) blocks.push({ kind: "amoLine", text: beat.amoLine });
  if (j === 0 && scene.teachingHint)
    blocks.push({ kind: "hint", text: scene.teachingHint });
  return blocks;
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
  /** 当前待定节拍已揭示的内容块数(VN 式点击推进) */
  const [revealed, setRevealed] = useState(1);
  /** 章节卡:每幕开场的黑场标题 */
  const [chapterCard, setChapterCard] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 每次进入新的一幕:黑场章节卡 + 重置本幕状态
  useEffect(() => {
    setChapterCard(true);
    setTurns([]);
    setRevealed(1);
    setInput("");
    setError(null);
    const t = setTimeout(() => setChapterCard(false), 2900);
    return () => clearTimeout(t);
  }, [sceneId]);

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

  const pendingBlocks = sceneDone ? [] : beatBlocks(scene, turns.length);
  const fullyRevealed = sceneDone || revealed >= pendingBlocks.length;

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

  // 内容更新时轻轻滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [revealed, turns.length, loading, sceneDone]);

  function showToast(t: Omit<Toast, "key">) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const next = { ...t, key: Date.now() };
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  function advanceReveal() {
    if (!fullyRevealed && !loading) setRevealed((r) => r + 1);
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

  async function submitTurn(rawText: string) {
    const trimmed = rawText.trim();
    if (!trimmed || loading || !rel || sceneDone || !fullyRevealed) return;

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
      const exposed =
        intensity === "pierce" ? hasExposure(trimmed) : intensity === "low";
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
      setRevealed(1); // 下一拍从第一段旁白开始逐段揭示
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
      // 状态重置由 sceneId 的 effect 统一处理(含章节卡)
      router.push(`/game?scene=${next.id}`);
    } else {
      router.push("/ending");
    }
  }

  const sceneIndex = ACT_SEQUENCE.findIndex((s) => s.id === scene.id) + 1;

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* 章节卡:黑场 + 幕名,每幕开场 */}
      {chapterCard && (
        <div className="chapter-card fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <p className="text-[10px] text-white/40 tracking-[0.5em] mb-5">
            {sceneIndex} / {ACT_SEQUENCE.length}
          </p>
          <h2 className="chapter-title text-3xl font-serif text-white/90">
            {scene.name}
          </h2>
        </div>
      )}

      {/* 场景背景图(全屏,缓慢推近的镜头感) */}
      <div className="fixed inset-0 z-0">
        <Image
          src={scene.background}
          alt={scene.name}
          fill
          priority
          className="object-cover ken-burns"
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
        <div
          className={`absolute bottom-0 right-0 w-[35vw] max-w-[400px] min-w-[200px] h-[70vh] transition-all duration-700 ${
            loading && phase === "npc"
              ? "brightness-110 scale-[1.02]"
              : "brightness-90"
          }`}
        >
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

      {/* 对话历史区(滚动 · 点击推进未揭示的旁白) */}
      <div
        className={`relative z-20 px-6 pt-8 pb-[32rem] max-w-3xl mx-auto ${
          !fullyRevealed && !loading ? "cursor-pointer" : ""
        }`}
        onClick={advanceReveal}
      >
        {/* 节拍流:每一拍 = 旁白推进 + 阿默锚点台词 + 玩家一轮交锋 */}
        {scene.beats
          .slice(0, Math.min(turns.length + 1, totalBeats))
          .map((_, j) => {
            const isPending = j === turns.length && !sceneDone;
            const blocks = isPending
              ? beatBlocks(scene, j).slice(0, revealed)
              : beatBlocks(scene, j).filter((b) => b.kind !== "hint");
            const turn = turns[j];
            return (
              <div key={j} className="mb-6 space-y-2">
                {blocks.map((b, bi) => (
                  <div key={bi} className="fade-in">
                    {b.kind === "narr" ? (
                      <NarrationBlock text={b.text} label={b.label} />
                    ) : b.kind === "amoLine" ? (
                      <DialogBubble speaker="amo" text={b.text} />
                    ) : (
                      <div className="border border-accent/40 bg-black/50 backdrop-blur-md p-4 rounded text-sm text-white/80 leading-relaxed">
                        <p className="text-xs text-accent tracking-widest mb-2">
                          教学提示
                        </p>
                        <p>{b.text}</p>
                      </div>
                    )}
                  </div>
                ))}

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

                    {/* 阿默回应(停顿一拍再开口) */}
                    <DialogBubble
                      speaker="amo"
                      text={turn.amoReply}
                      typeDelay={700}
                    />
                  </div>
                )}
              </div>
            );
          })}

        {/* 点击继续指示 */}
        {!fullyRevealed && !loading && (
          <p className="text-center text-xs tracking-[0.3em] text-white/60 soft-pulse py-2">
            ▼ 点击继续
          </p>
        )}

        {/* 穿透时刻提示 */}
        {pierceActive && fullyRevealed && !loading && (
          <div className="fade-in mb-6 border border-white/70 bg-black/70 backdrop-blur-md p-4 rounded text-sm text-white leading-relaxed">
            <p className="text-xs tracking-widest mb-2 text-white/70">咔。</p>
            <p>你听见什么东西碎掉的声音。这一次,你说什么,就是什么。</p>
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

        <div ref={bottomRef} />
      </div>

      {/* 底部输入区(VN 风格):内容全部揭示后才浮现,先选念头,自由输入是备选 */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/70 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {!fullyRevealed && !sceneDone ? (
            <p
              className="text-center text-xs tracking-[0.3em] text-white/40 py-3 cursor-pointer"
              onClick={advanceReveal}
            >
              ▼ 点击画面继续
            </p>
          ) : (
            <>
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

              {/* 涌上来的念头:点选即说 */}
              {!sceneDone && (
                <div className="space-y-1.5 mb-3">
                  {beat.impulses.map((im) => (
                    <button
                      key={im}
                      type="button"
                      disabled={loading}
                      onClick={() => submitTurn(im)}
                      className="block w-full text-left text-xs leading-relaxed text-white/75 border border-white/15 hover:border-accent/70 hover:text-white hover:bg-white/5 transition-colors px-3 py-2 rounded disabled:opacity-40"
                    >
                      {im}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitTurn(input);
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="……或者,用你自己的话(可选)"
                  className={`w-full bg-white/5 border p-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none rounded ${
                    pierceActive
                      ? "border-white/70 focus:border-white"
                      : "border-white/20 focus:border-accent/60"
                  }`}
                  rows={2}
                  disabled={loading || sceneDone}
                  maxLength={500}
                />
                {input.trim() && (
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
                )}
              </form>
            </>
          )}
        </div>
      </footer>
    </main>
  );
}

/**
 * 打字机文本:挂载时逐字浮现,之后保持完整。
 * 用透明占位保住整段高度,避免打字过程中布局抖动。
 */
function Typewriter({
  text,
  cps = 40,
  delay = 0,
}: {
  text: string;
  cps?: number;
  delay?: number;
}) {
  const [started, setStarted] = useState(delay === 0);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (started) return;
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!started || n >= text.length) return;
    const t = setTimeout(() => setN((v) => v + 1), 1000 / cps);
    return () => clearTimeout(t);
  }, [started, n, text, cps]);

  return (
    <span>
      {text.slice(0, n)}
      <span className="opacity-0">{text.slice(n)}</span>
    </span>
  );
}

/** 旁白块(单段,打字机) */
function NarrationBlock({ text, label }: { text: string; label?: string }) {
  return (
    <div className="border-l-2 border-white/40 pl-4 bg-black/30 backdrop-blur-sm py-3 pr-4 rounded-r">
      {label && (
        <p className="text-xs text-white/60 mb-2 tracking-widest">{label}</p>
      )}
      <p className="leading-relaxed text-white/90 text-sm">
        <Typewriter text={text} cps={38} />
      </p>
    </div>
  );
}

/** VN 风格对话气泡;阿默的台词走打字机(她在"说"),阿沉的出口话瞬间出现(已经说出去了) */
function DialogBubble({
  speaker,
  text,
  typeDelay,
}: {
  speaker: Speaker;
  text: string;
  typeDelay?: number;
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
      <p className="leading-relaxed text-white/90 text-sm">
        "
        {isAmo ? (
          <Typewriter text={text} cps={26} delay={typeDelay ?? 0} />
        ) : (
          text
        )}
        "
      </p>
    </div>
  );
}
