"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { getLookback, Lookback, LOOKBACKS } from "@/lib/story";

/**
 * "看见" · 回看
 * 活过一遍之后,回到同一段记忆。这次不推进,而是找出当年没看见的"伸手"——
 * 点开才对上焦、浮现出对方那一侧当时没说出口的心情。这是本作的玩法灵魂。
 */
export default function LookPage() {
  return (
    <Suspense fallback={null}>
      <LookInner />
    </Suspense>
  );
}

type Phase = "intro" | "moments" | "reachback" | "outro";

function LookInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? Object.keys(LOOKBACKS)[0];
  const look: Lookback | undefined = getLookback(id);

  const [phase, setPhase] = useState<Phase>("intro");
  const [introIdx, setIntroIdx] = useState(0);
  const [momentIdx, setMomentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reachDone, setReachDone] = useState(false);
  const [roseOn, setRoseOn] = useState(false);
  const [outroIdx, setOutroIdx] = useState(0);

  // 接住后:先等右侧立绘淡完(1.2s),玫瑰再开始盛放,两者不同时出现
  useEffect(() => {
    if (!reachDone) return;
    const t = setTimeout(() => setRoseOn(true), 1200);
    return () => clearTimeout(t);
  }, [reachDone]);

  const advance = useCallback(() => {
    if (!look) return;
    if (phase === "intro") {
      if (introIdx < look.intro.length - 1) setIntroIdx((i) => i + 1);
      else {
        setPhase("moments");
        setMomentIdx(0);
        setRevealed(false);
      }
    } else if (phase === "moments") {
      if (!revealed) {
        setRevealed(true); // 点开:看清这一刻
      } else if (momentIdx < look.moments.length - 1) {
        setMomentIdx((i) => i + 1);
        setRevealed(false);
      } else if (look.reachback) {
        setPhase("reachback");
      } else {
        setPhase("outro");
        setOutroIdx(0);
      }
    } else if (phase === "reachback") {
      if (!reachDone) setReachDone(true); // 这一次,伸手
      else {
        setPhase("outro");
        setOutroIdx(0);
      }
    } else {
      if (outroIdx < look.outro.length - 1) setOutroIdx((i) => i + 1);
      else router.push("/");
    }
  }, [look, phase, introIdx, revealed, momentIdx, reachDone, outroIdx, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  if (!look) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <button
          className="text-white/60 text-sm tracking-widest"
          onClick={() => router.push("/")}
        >
          回看不存在 · 回首页
        </button>
      </main>
    );
  }

  const moment = look.moments[momentIdx];
  const lastBg = look.moments[look.moments.length - 1]?.bg ?? "";
  const bg =
    phase === "intro"
      ? look.moments[0]?.bg ?? ""
      : phase === "moments"
      ? moment.bg
      : lastBg;
  // 看清后(或已进入接住/收尾)画面对上焦,不再虚化
  const clear =
    (phase === "moments" && revealed) ||
    phase === "reachback" ||
    phase === "outro";
  const whoLabel = (w: "sean" | "vera") => (w === "sean" ? "Sean" : "Vera");
  // 立绘编排:前两个瞬间左侧(Sean);第三个瞬间起转右侧(Vera)、左侧淡出;接住后右侧也淡出
  const showLeft = phase === "moments" && momentIdx < 2;
  const showRight =
    (phase === "moments" && momentIdx >= 2) ||
    (phase === "reachback" && !reachDone);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black cursor-pointer select-none"
      onClick={advance}
    >
      {/* 记忆背景:未看清时虚化褪色,点"看"后对上焦 */}
      <div className="fixed inset-0 z-0">
        {bg && (
          <Image
            src={bg}
            alt=""
            fill
            priority
            className="object-cover"
            style={{
              filter: clear
                ? "none"
                : "blur(9px) saturate(0.5) brightness(0.55)",
              transition: "filter 1.3s ease",
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/45" />
      </div>

      {/* 左侧 · Sean(前两个瞬间:你正看着的那个人) */}
      <div
        className="fixed bottom-0 left-2 z-[6] h-[60vh] w-[28vw] max-w-[320px] min-w-[150px] pointer-events-none"
        style={{ opacity: showLeft ? 1 : 0, transition: "opacity 1200ms ease" }}
      >
        <Image
          src="/images/characters/sean-tired.png"
          alt="Sean"
          fill
          className="object-contain object-bottom drop-shadow-2xl"
        />
      </div>

      {/* 右侧 · Vera(第三个瞬间起:回到自己) */}
      <div
        className="fixed bottom-0 right-2 z-[6] h-[60vh] w-[28vw] max-w-[320px] min-w-[150px] pointer-events-none"
        style={{ opacity: showRight ? 1 : 0, transition: "opacity 1200ms ease" }}
      >
        <Image
          src="/images/characters/vera-composed.png"
          alt="Vera"
          fill
          className="object-contain object-bottom drop-shadow-2xl"
        />
      </div>

      {/* 接住:等右侧立绘淡完后,玫瑰才完整盛放(浮在下方约 1/4 处),不与立绘同时出现 */}
      {roseOn && (
        <div className="fixed inset-x-0 bottom-[10%] z-[5] flex justify-center pointer-events-none">
          <div className="relative w-60 h-60 fade-in-slow opacity-90">
            <Image
              src="/images/motifs/rose-bloom.png"
              alt=""
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* 前景内容 */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-8 text-center">
        {phase === "intro" && (
          <p
            key={introIdx}
            className="fade-in-slow max-w-md text-white/85 text-base leading-loose tracking-wide"
          >
            {look.intro[introIdx]}
          </p>
        )}

        {phase === "moments" && (
          <div className="max-w-lg space-y-8">
            <p className="text-[10px] tracking-[0.4em] text-white/30">
              {momentIdx + 1} / {look.moments.length}
            </p>

            {/* 表面:当年你看到的 */}
            <p className="text-white/55 text-sm leading-loose italic">
              {moment.surface}
            </p>

            {!revealed ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  advance();
                }}
                className="mx-auto flex flex-col items-center gap-2 group"
              >
                <span className="w-6 h-6 rounded-full border-2 border-accent bg-accent/20 soft-pulse" />
                <span className="text-[10px] tracking-[0.4em] text-white/50 group-hover:text-white/80 transition-colors">
                  看 清 这 一 刻
                </span>
              </button>
            ) : (
              <div className="fade-in space-y-2">
                <p className="text-[10px] tracking-[0.4em] text-accent/80">
                  {whoLabel(moment.who)} 没说出口的
                </p>
                <p className="text-white/95 text-base leading-loose">
                  {moment.hidden}
                </p>
              </div>
            )}
          </div>
        )}

        {phase === "reachback" && look.reachback && (
          <div className="max-w-lg space-y-8">
            <p className="text-white/70 text-sm leading-loose">
              {look.reachback.prompt}
            </p>
            {!reachDone ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  advance();
                }}
                className="mx-auto block px-6 py-3 border border-accent/60 text-accent/90 hover:border-accent hover:bg-accent hover:text-ink transition-colors text-sm leading-relaxed"
              >
                {look.reachback.choice}
              </button>
            ) : (
              <div className="fade-in space-y-4">
                {look.reachback.response.map((line, i) => (
                  <p
                    key={i}
                    className="text-white/95 text-base leading-loose"
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === "outro" && (
          <p
            key={outroIdx}
            className="fade-in-slow max-w-md text-white/85 text-base leading-loose tracking-wide"
          >
            {look.outro[outroIdx]}
          </p>
        )}

        {/* 提示 */}
        <p className="fixed bottom-10 text-[10px] tracking-[0.3em] text-white/30 soft-pulse">
          {phase === "moments" && !revealed
            ? "点亮 · 看清这一刻"
            : phase === "reachback" && !reachDone
            ? "这一次 · 伸手"
            : phase === "outro" && outroIdx >= look.outro.length - 1
            ? "空格 / 点击 结束"
            : "空格 / 点击 继续"}
        </p>
      </div>

      {/* 跳过 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          router.push("/");
        }}
        className="fixed top-6 right-6 z-30 text-[10px] tracking-widest text-white/25 hover:text-white/60 transition-colors"
      >
        跳过 ▸
      </button>

      <p className="fixed top-5 left-1/2 -translate-x-1/2 z-20 text-[10px] tracking-[0.4em] text-white/40">
        {look.title}
      </p>
    </main>
  );
}
