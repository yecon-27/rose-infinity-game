"use client";

import {
  MouseEvent as ReactMouseEvent,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { GestureChoice } from "@/components/gesture-choice";
import { useSoundscape } from "@/components/soundscape-provider";
import { AUDIO, soundscapeForScene } from "@/lib/audio";
import {
  completeLookback,
  readLookbackProgress,
} from "@/lib/lookback-progress";
import { preloadImageSources } from "@/lib/preload";
import {
  getLookback,
  Lookback,
  LOOKBACK_SEQUENCE,
  LOOKBACKS,
} from "@/lib/story";

type Phase = "intro" | "moments" | "reachback" | "outro";
type Gesture = "hold" | "swipe" | "longpress";

interface TargetSpot {
  clue: string;
  desktop: { x: number; y: number; r: number };
  mobile: { x: number; y: number; r: number };
  misses: string[];
}

interface MissFeedback {
  x: number;
  y: number;
  text: string;
  key: number;
}

const LOOKBACK_SFX_VOLUME = 0.48;
const DEFAULT_MISSES = [
  "不是这里。再慢一点。",
  "你看见的是表面。再找找那一点犹豫。",
  "很近了。看看那些被忽略的小动作。",
];

/* 命中区完全隐形。坐标落在画面里真实存在的物件上，玩家只能依靠叙事线索找。 */
const SEARCH_TARGETS: Record<string, TargetSpot[]> = {
  warm_hackathon: [
    {
      clue: "找一找：他抽回去的那只手，停在什么旁边。",
      desktop: { x: 41, y: 49, r: 12 },
      mobile: { x: 41, y: 50, r: 14 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：那句“随便”旁边，被留在桌上的体贴。",
      desktop: { x: 46, y: 59, r: 10 },
      mobile: { x: 46, y: 53, r: 13 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：楼梯间里，他终于抬头的那束光。",
      desktop: { x: 50, y: 17, r: 11 },
      mobile: { x: 50, y: 42, r: 13 },
      misses: DEFAULT_MISSES,
    },
  ],
  warm_shopping: [
    {
      clue: "找一找：那件他一路都没拿出来的深蓝色。",
      desktop: { x: 22, y: 55, r: 13 },
      mobile: { x: 22, y: 51, r: 15 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：他等你替他做决定时，看着的地方。",
      desktop: { x: 52, y: 39, r: 13 },
      mobile: { x: 52, y: 47, r: 15 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：他笑着接过去、却没有说累的那件衣服。",
      desktop: { x: 28, y: 38, r: 13 },
      mobile: { x: 28, y: 47, r: 15 },
      misses: DEFAULT_MISSES,
    },
  ],
  warm_nvc: [
    {
      clue: "找一找：你们握在手里、后来却没能一直用上的工具。",
      desktop: { x: 72, y: 79, r: 12 },
      mobile: { x: 72, y: 58, r: 14 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：他真翻到过、也真想补完的那一页。",
      desktop: { x: 72, y: 79, r: 12 },
      mobile: { x: 72, y: 58, r: 14 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：他说“慢慢来”时，不敢细算的以后。",
      desktop: { x: 38, y: 56, r: 12 },
      mobile: { x: 38, y: 52, r: 14 },
      misses: DEFAULT_MISSES,
    },
  ],
  burst_phone: [
    {
      clue: "找一找：那串用了两年、却没能替他说清楚的话。",
      desktop: { x: 61, y: 51, r: 10 },
      mobile: { x: 61, y: 50, r: 13 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：他后退半步时，屋里还没收完的东西。",
      desktop: { x: 39, y: 55, r: 13 },
      mobile: { x: 39, y: 51, r: 15 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：那一夜没睡的人，望向过的窗口。",
      desktop: { x: 19, y: 25, r: 13 },
      mobile: { x: 19, y: 44, r: 15 },
      misses: DEFAULT_MISSES,
    },
  ],
  cold_fever: [
    {
      clue: "找一找：那句真话被删了又打，最后停在哪里。",
      desktop: { x: 31, y: 53, r: 12 },
      mobile: { x: 31, y: 51, r: 14 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：他用错了方式递出的求助。",
      desktop: { x: 31, y: 53, r: 12 },
      mobile: { x: 31, y: 51, r: 14 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：让一句求助变成刀的那个凌晨。",
      desktop: { x: 63, y: 12, r: 9 },
      mobile: { x: 63, y: 40, r: 12 },
      misses: DEFAULT_MISSES,
    },
  ],
  end_breakup: [
    {
      clue: "找一找：她带得走东西，却带不走他学会的绕法。",
      desktop: { x: 74, y: 45, r: 12 },
      mobile: { x: 74, y: 49, r: 14 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：那句“再试试”说出口时，他没有移开的目光。",
      desktop: { x: 52, y: 42, r: 14 },
      mobile: { x: 52, y: 48, r: 16 },
      misses: DEFAULT_MISSES,
    },
    {
      clue: "找一找：他差一点喊出声，却最终没有追出去的门。",
      desktop: { x: 65, y: 43, r: 13 },
      mobile: { x: 65, y: 48, r: 15 },
      misses: DEFAULT_MISSES,
    },
  ],
};

const REACHBACK_GESTURES: Record<string, Gesture> = {
  warm_hackathon: "longpress",
  warm_shopping: "swipe",
  warm_nvc: "swipe",
  burst_phone: "hold",
  cold_fever: "longpress",
  end_breakup: "hold",
};

export default function LookPage() {
  return (
    <Suspense fallback={null}>
      <LookInner />
    </Suspense>
  );
}

function MemoryMap({
  invalidId,
  playSfx,
}: {
  invalidId?: boolean;
  playSfx: (src: string, volume?: number) => void;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => setCompleted(readLookbackProgress()), []);

  const allDone = LOOKBACK_SEQUENCE.every((id) => completed.includes(id));
  const defaultMemoryId =
    LOOKBACK_SEQUENCE.find((id) => !completed.includes(id)) ??
    LOOKBACK_SEQUENCE[0];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#171416] px-5 py-16 text-white sm:px-8">
      <div className="fixed inset-0 opacity-25">
        <Image
          src="/images/motifs/rose-bud.webp"
          alt=""
          fill
          priority
          className="object-cover scale-110 blur-3xl saturate-50"
        />
        <div className="absolute inset-0 bg-[#171416]/70" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-10 text-center sm:mb-14">
          <p className="mb-3 text-[10px] tracking-[0.45em] text-accent/65">
            第 二 遍 · 记 忆 地 图
          </p>
          <h1 className="font-serif text-3xl tracking-[0.22em] text-white/95 sm:text-4xl">
            这次，顺序由你
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-loose text-white/55">
            六段记忆散在这里。你可以先走进任何一段，
            <strong className="font-semibold text-amber-300">找出</strong>
            当年没看见的那次伸手。
          </p>
          <button
            type="button"
            onClick={() => {
              playSfx(AUDIO.sfx.softTap, 0.18);
              router.push(`/look?id=${defaultMemoryId}`);
            }}
            className="mt-6 border border-amber-200/45 bg-amber-100/[0.04] px-5 py-2.5 text-[10px] font-medium tracking-[0.28em] text-amber-200/90 transition-colors hover:border-amber-200/75 hover:bg-amber-100/[0.09] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
          >
            按 默 认 顺 序
          </button>
          <p className="mt-2 text-[9px] tracking-[0.18em] text-white/28">
            {allDone ? "从第一段重新走过" : "从最早还没看清的一段开始"}
          </p>
          {invalidId && (
            <p className="mt-3 text-xs text-accent/70">
              那段记忆已经模糊了。先从这里重新找一段吧。
            </p>
          )}
        </header>

        <section className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
          <svg
            className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-25 sm:block"
            viewBox="0 0 900 520"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M140 118 C260 45 340 195 450 118 S700 45 760 118 M140 402 C260 475 340 325 450 402 S700 475 760 402 M140 118 C80 250 80 310 140 402 M450 118 C520 230 380 290 450 402 M760 118 C820 250 820 310 760 402"
              stroke="rgba(235,198,190,.45)"
              strokeWidth="1"
              strokeDasharray="3 8"
              fill="none"
            />
          </svg>

          {LOOKBACK_SEQUENCE.map((id, index) => {
            const memory = LOOKBACKS[id];
            const seen = completed.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  playSfx(AUDIO.sfx.softTap, 0.18);
                  router.push(`/look?id=${id}`);
                }}
                className={`group relative aspect-[4/3] overflow-hidden border text-left transition-all duration-500 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                  seen
                    ? "border-accent/55 shadow-[0_0_28px_rgba(191,119,122,.14)]"
                    : "border-white/15 hover:border-white/40"
                }`}
              >
                <Image
                  src={memory.moments[0].bg}
                  alt=""
                  fill
                  className={`object-cover transition duration-700 group-hover:scale-[1.03] group-hover:blur-0 group-hover:brightness-100 group-hover:saturate-100 group-focus-visible:blur-0 group-focus-visible:brightness-100 group-focus-visible:saturate-100 ${
                    seen
                      ? "saturate-75 brightness-75"
                      : "saturate-[.35] brightness-50 blur-[1px]"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/15 opacity-100 transition-opacity duration-700 group-hover:opacity-60 group-focus-visible:opacity-60" />
                <span className="absolute left-3 top-3 text-[9px] tracking-[0.24em] text-white/35">
                  记忆 {String(index + 1).padStart(2, "0")}
                </span>
                {seen && (
                  <span className="absolute right-3 top-3 text-[9px] tracking-[0.2em] text-accent/85">
                    已看见 · ✦
                  </span>
                )}
                <span className="absolute inset-x-3 bottom-3">
                  <span className="block text-sm tracking-[0.13em] text-white/90 sm:text-base">
                    {memory.title.replace("回看 · ", "")}
                  </span>
                  <span className="mt-1 block text-[9px] tracking-[0.18em] text-white/35">
                    {seen ? "仍可重看" : "走进这段记忆"}
                  </span>
                </span>
              </button>
            );
          })}
        </section>

        <footer className="mt-10 text-center sm:mt-14">
          {allDone ? (
            <button
              type="button"
              onClick={() => {
                playSfx(AUDIO.sfx.roseReveal, LOOKBACK_SFX_VOLUME);
                router.push("/ending?seen=1");
              }}
              className="border border-accent/70 bg-accent/10 px-8 py-4 text-sm tracking-[0.35em] text-accent transition-colors hover:bg-accent/20"
            >
              让 玫 瑰 盛 放
            </button>
          ) : (
            <p className="text-[10px] tracking-[0.3em] text-white/30">
              每看清一段，记忆会留下一点光
            </p>
          )}
        </footer>
      </div>
    </main>
  );
}

function LookInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const look: Lookback | undefined = id ? getLookback(id) : undefined;
  const { playSfx } = useSoundscape(
    soundscapeForScene(look?.id ?? "warm_hackathon", true)
  );

  const [phase, setPhase] = useState<Phase>("intro");
  const [momentIdx, setMomentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reachDone, setReachDone] = useState(false);
  const [roseOn, setRoseOn] = useState(false);
  const [missCount, setMissCount] = useState(0);
  const [miss, setMiss] = useState<MissFeedback | null>(null);

  useEffect(() => {
    const sources = Object.values(LOOKBACKS).flatMap((memory) => [
      ...memory.moments.map((moment) => moment.bg),
      `/images/characters/${
        memory.seanPortrait ?? "sean-tired-hackthon"
      }.webp`,
    ]);
    const timer = window.setTimeout(
      () =>
        preloadImageSources([
          ...sources,
          "/images/motifs/rose-bud.webp",
          "/images/motifs/rose-bloom.webp",
        ]),
      500
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setPhase("intro");
    setMomentIdx(0);
    setRevealed(false);
    setReachDone(false);
    setRoseOn(false);
    setMissCount(0);
    setMiss(null);
  }, [id]);

  useEffect(() => {
    if (!reachDone) return;
    const timer = setTimeout(() => setRoseOn(true), 1200);
    return () => clearTimeout(timer);
  }, [reachDone]);

  const finishMemory = useCallback(() => {
    if (!look) return;
    completeLookback(look.id);
    router.push("/look");
  }, [look, router]);

  const advance = useCallback(() => {
    if (!look) return;
    if (phase === "intro") {
      setPhase("moments");
      setMomentIdx(0);
      setRevealed(false);
      return;
    }
    if (phase === "moments") {
      if (!revealed) {
        setMiss({
          x: 50,
          y: 73,
          text: "这次不能直接翻页。请在画面里找。",
          key: Date.now(),
        });
        return;
      }
      if (momentIdx < look.moments.length - 1) {
        setMomentIdx((index) => index + 1);
        setRevealed(false);
        setMiss(null);
        return;
      }
      setPhase(look.reachback ? "reachback" : "outro");
      return;
    }
    if (phase === "reachback") {
      if (reachDone) setPhase("outro");
      return;
    }
    finishMemory();
  }, [finishMemory, look, momentIdx, phase, reachDone, revealed]);

  const goBack = useCallback(() => {
    if (!look) return;
    if (phase === "intro") {
      router.push("/look");
      return;
    }
    if (phase === "moments") {
      if (revealed) setRevealed(false);
      else if (momentIdx > 0) {
        setMomentIdx((index) => index - 1);
        setRevealed(true);
      } else setPhase("intro");
      setMiss(null);
      return;
    }
    if (phase === "reachback") {
      if (reachDone) {
        setReachDone(false);
        setRoseOn(false);
      } else {
        setPhase("moments");
        setMomentIdx(look.moments.length - 1);
        setRevealed(true);
      }
      return;
    }
    setPhase(look.reachback ? "reachback" : "moments");
    if (look.reachback) {
      setReachDone(true);
      setRoseOn(true);
    } else {
      setMomentIdx(look.moments.length - 1);
      setRevealed(true);
    }
  }, [look, momentIdx, phase, reachDone, revealed, router]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      } else if (
        event.key === "ArrowRight" ||
        event.key === "Enter" ||
        event.code === "Space"
      ) {
        event.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, goBack]);

  if (!id || !look)
    return <MemoryMap invalidId={!!id && !look} playSfx={playSfx} />;

  const moment = look.moments[momentIdx];
  const target = SEARCH_TARGETS[look.id]?.[momentIdx];
  const lastBg = look.moments[look.moments.length - 1]?.bg ?? "";
  const bg =
    phase === "intro"
      ? look.moments[0]?.bg ?? ""
      : phase === "moments"
      ? moment.bg
      : lastBg;
  const clear =
    (phase === "moments" && revealed) ||
    phase === "reachback" ||
    phase === "outro";
  const showLeft =
    !look.hidePortraits &&
    (phase === "moments" || (phase === "reachback" && !reachDone));

  function searchScene(event: ReactMouseEvent<HTMLElement>) {
    if (phase !== "moments" || revealed || !target) return;
    const x = (event.clientX / window.innerWidth) * 100;
    const y = (event.clientY / window.innerHeight) * 100;
    const spot = window.innerWidth < 640 ? target.mobile : target.desktop;
    const dx = x - spot.x;
    const dy = y - spot.y;

    if (Math.sqrt(dx * dx + dy * dy) <= spot.r) {
      playSfx(AUDIO.sfx.roseReveal, LOOKBACK_SFX_VOLUME);
      setRevealed(true);
      setMiss(null);
      if (typeof navigator.vibrate === "function") navigator.vibrate(45);
      return;
    }

    setMissCount((count) => count + 1);
    setMiss({
      x,
      y,
      text: target.misses[missCount % target.misses.length],
      key: Date.now(),
    });
    playSfx(AUDIO.sfx.softTap, 0.09);
  }

  function onMainClick(event: ReactMouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    if (phase === "moments" && !revealed) searchScene(event);
    else advance();
  }

  const reachGesture = REACHBACK_GESTURES[look.id] ?? "longpress";
  const whoLabel = (who: "sean" | "vera") =>
    who === "sean" ? "Sean" : "Vera";

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-black select-none ${
        phase === "moments" && !revealed
          ? "cursor-crosshair"
          : "cursor-pointer"
      }`}
      onClick={onMainClick}
    >
      <div className="fixed inset-0 z-0">
        {bg && (
          <Image
            key={bg}
            src={bg}
            alt=""
            fill
            priority
            className={
              phase === "moments" ? "object-contain sm:object-cover" : "object-cover"
            }
            style={{
              filter: clear
                ? "none"
                : "blur(10px) saturate(0.32) brightness(0.48)",
              transform: clear ? "scale(1)" : "scale(1.025)",
              transition: "filter 1.25s ease, transform 1.25s ease",
            }}
          />
        )}
        <div
          className={`absolute inset-0 transition-colors duration-1000 ${
            clear ? "bg-black/35 memory-found" : "bg-black/48"
          }`}
        />
      </div>

      <div
        className="fixed bottom-0 left-2 z-[6] h-[60vh] w-[28vw] max-w-[320px] min-w-[150px] pointer-events-none"
        style={{ opacity: showLeft ? 1 : 0, transition: "opacity 1200ms ease" }}
      >
        <Image
          src={`/images/characters/${
            look.seanPortrait ?? "sean-tired-hackthon"
          }.webp`}
          alt="Sean"
          fill
          className="object-contain object-bottom drop-shadow-2xl"
        />
      </div>

      {roseOn && (
        <div className="fixed inset-x-0 bottom-[8%] z-[5] flex justify-center pointer-events-none">
          <div className="relative h-56 w-56 fade-in-slow opacity-90">
            <Image
              src="/images/motifs/rose-bud.webp"
              alt=""
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      {miss && phase === "moments" && !revealed && (
        <div key={miss.key} className="pointer-events-none fixed inset-0 z-20">
          <span
            className="memory-miss-ring absolute h-10 w-10 rounded-full border border-white/30"
            style={{ left: `${miss.x}%`, top: `${miss.y}%` }}
          />
          <p className="absolute inset-x-6 bottom-20 text-center text-xs tracking-[0.16em] text-white/60 fade-in">
            {miss.text}
          </p>
        </div>
      )}

      <div className="relative z-10 min-h-screen px-6 text-center pointer-events-none">
        {phase === "intro" && (
          <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center space-y-4 text-base leading-loose tracking-wide text-white/85 fade-in-slow">
            {look.intro.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}

        {phase === "moments" && (
          <>
            <div className="fixed inset-x-6 top-[13%] mx-auto max-w-xl space-y-3 [text-shadow:0_2px_14px_rgba(0,0,0,.95)] sm:top-[15%]">
              <p className="text-[9px] tracking-[0.4em] text-white/35">
                {momentIdx + 1} / {look.moments.length}
              </p>
              <p className="text-sm italic leading-loose text-white/60">
                {moment.surface}
              </p>
            </div>

            {!revealed ? (
              <div className="fixed inset-x-6 bottom-10">
                <p className="text-[10px] tracking-[0.28em] text-accent/70">
                  {target?.clue ?? "在画面里，找出当年没看见的那一刻。"}
                </p>
                <p className="mt-2 text-[9px] tracking-[0.22em] text-white/30">
                  没有提示点 · 触摸或点击你认为对的地方
                </p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    playSfx(AUDIO.sfx.roseReveal, LOOKBACK_SFX_VOLUME);
                    setRevealed(true);
                    setMiss(null);
                  }}
                  className="pointer-events-auto sr-only focus:not-sr-only focus:mt-3 focus:inline-block focus:border focus:border-white/40 focus:px-3 focus:py-2 focus:text-white/70"
                >
                  键盘辅助：看清这一刻
                </button>
              </div>
            ) : (
              <div className="fixed inset-x-6 bottom-[12%] mx-auto max-w-lg rounded-sm border border-white/10 bg-black/55 px-6 py-6 backdrop-blur-sm fade-in">
                <p className="text-[9px] tracking-[0.38em] text-accent/80">
                  {whoLabel(moment.who)} 没说出口的
                </p>
                <p className="mt-3 text-base leading-loose text-white/95">
                  {moment.hidden}
                </p>
                <p className="mt-4 text-[9px] tracking-[0.25em] text-white/30">
                  点击继续
                </p>
              </div>
            )}
          </>
        )}

        {phase === "reachback" && look.reachback && (
          <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center space-y-8">
            <p className="text-sm leading-loose text-white/70">
              {look.reachback.prompt}
            </p>
            {!reachDone ? (
              <div className="pointer-events-auto w-full">
                <GestureChoice
                  gesture={reachGesture}
                  onCommit={() => {
                    playSfx(AUDIO.sfx.roseReveal, LOOKBACK_SFX_VOLUME);
                    setReachDone(true);
                  }}
                  selected
                  className="block w-full border border-accent/60 px-6 py-4 text-sm leading-relaxed text-accent/90 transition-colors"
                >
                  {look.reachback.choice}
                </GestureChoice>
              </div>
            ) : (
              <div className="space-y-4 fade-in">
                {look.reachback.response.map((line) => (
                  <p key={line} className="text-base leading-loose text-white/95">
                    {line}
                  </p>
                ))}
                <p className="pt-2 text-[9px] tracking-[0.25em] text-white/30">
                  点击继续
                </p>
              </div>
            )}
          </div>
        )}

        {phase === "outro" && (
          <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center space-y-4 text-base leading-loose tracking-wide text-white/85 fade-in-slow">
            {look.outro.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                finishMemory();
              }}
              className="pointer-events-auto mt-8 border border-accent/55 px-7 py-3 text-xs tracking-[0.3em] text-accent/90"
            >
              把 这 段 光 带 回 去
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          router.push("/look");
        }}
        className="fixed right-6 top-6 z-30 text-[10px] tracking-widest text-white/30 transition-colors hover:text-white/70"
      >
        记忆地图 ◇
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          goBack();
        }}
        className="fixed left-6 top-14 z-30 text-[10px] tracking-widest text-white/30 transition-colors hover:text-white/70 sm:top-6 sm:left-20"
      >
        ← 返回
      </button>

      <p className="fixed left-1/2 top-5 z-20 -translate-x-1/2 whitespace-nowrap text-[10px] tracking-[0.34em] text-white/40">
        {look.title}
      </p>
    </main>
  );
}
