"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSoundscape } from "@/components/soundscape-provider";
import { AUDIO } from "@/lib/audio";

const PROLOGUE_SOUND = { bgm: AUDIO.bgm.rosebud, bgmVolume: 0.14 };

/**
 * 序章 · 回到那一天
 * 黑屏，一句一句浮现，点击推进；世界随推进慢慢显影。
 * 新开场钩子：关系已经结束，你回到记忆里，这一次学着"看见"当年没看见的伸手。
 * （旧的"过滤器失控演示"已废除——本作没有过滤器，核心是回看与看见。)
 */
const SCREENS: string[][] = [
  ["那段感情，结束很久了。", "可你到现在都想不清，是从哪天开始淡的。"],
  ["没有争吵，也没有背叛。", "未来聊到一半，就没有再聊下去。"],
  [
    "你们一起想好的那些：",
    "一间朝南的小房子，一条柯基，谁先退休。",
    "后来，谁也没再提起。",
  ],
  ["你是 Vera。", "他叫 Sean。", "你们真的相爱过。这一点，从来不假。"],
  ["现在，回到那些日子里。"],
  ["这一次，别急着往前走。", "停下来，好好看着他，也看看当时的自己。"],
  ["有些伸过来的手，你当年没接住。", "也许，还来得及。"],
];

const TUTORIAL_STEP = SCREENS.length;
const TOTAL_STEPS = SCREENS.length + 1;

export default function ProloguePage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const { playSfx } = useSoundscape(PROLOGUE_SOUND);

  const advance = useCallback(() => {
    playSfx(AUDIO.sfx.softTap, 0.12);
    if (idx >= TOTAL_STEPS - 1) {
      router.push("/game");
    } else {
      setIdx(idx + 1);
    }
  }, [idx, playSfx, router]);

  const goBack = useCallback(() => {
    if (idx > 0) setIdx(idx - 1);
  }, [idx]);

  // 键盘：→/空格/Enter 推进，← 返回，Esc 跳过
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement
      )
        return;
      if (
        e.code === "Space" ||
        e.key === "Enter" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "Escape") {
        router.push("/game");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, goBack, router]);

  // 承接标题页离场的"变暗虚化"状态：开场就有一张压暗、虚化的同一张图，
  // 随推进极缓慢地清晰一点点（记忆尚未完全对焦，真正对焦留到进入场景时）。
  const bgOpacity = Math.min(0.6, 0.48 + idx * 0.02);
  const bgBlur = Math.max(7, 12 - idx * 0.6);

  const screen = SCREENS[idx];
  const showingTutorial = idx === TUTORIAL_STEP;

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black flex flex-col items-center justify-center px-8 cursor-pointer select-none"
      onClick={advance}
    >
      {/* 显影中的世界 */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          opacity: bgOpacity,
          filter: `blur(${bgBlur}px)`,
          transition: "opacity 1.6s ease, filter 1.6s ease",
        }}
      >
        <Image
          src="/images/scenes/title_keyart.webp"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
      </div>

      {/* 跳过 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          router.push("/game");
        }}
        className="fixed top-6 right-6 z-20 text-[10px] tracking-widest text-white/25 hover:text-white/60 transition-colors"
      >
        跳过（Esc) ▸
      </button>

      {/* 文本屏 */}
      {screen && (
        <div
          key={idx}
          className="relative z-10 fade-in-slow max-w-md text-center space-y-4"
        >
          {screen.map((line, i) => (
            <p
              key={i}
              className="text-white/85 leading-loose tracking-wide text-base"
            >
              {line}
            </p>
          ))}
        </div>
      )}

      {/* 第一幕之前的玩法卡：先说明两遍叙事，再给操作方式。 */}
      {showingTutorial && (
        <section
          key="tutorial"
          className="relative z-10 w-full max-w-lg border border-white/15 bg-black/30 px-6 py-7 text-left shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-sm fade-in-slow sm:px-8 sm:py-8"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="text-center">
            <p className="text-[10px] tracking-[0.42em] text-white/40">
              HOW TO PLAY
            </p>
            <h2 className="mt-3 font-serif text-2xl tracking-[0.25em] text-white/90">
              怎么玩
            </h2>
          </header>

          <div className="mt-7 space-y-5 border-y border-white/10 py-6">
            <div className="grid grid-cols-[4.5rem_1fr] gap-4">
              <p className="text-xs tracking-[0.18em] text-[#efbec6]">
                第一遍
              </p>
              <div>
                <p className="text-sm tracking-[0.12em] text-white/85">活过</p>
                <p className="mt-1.5 text-xs leading-6 text-white/55">
                  以 Vera 的视角经历七段记忆，在每一个当下做出选择。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[4.5rem_1fr] gap-4">
              <p className="text-xs tracking-[0.18em] text-[#efbec6]">
                第二遍
              </p>
              <div>
                <p className="text-sm tracking-[0.12em] text-white/85">看见</p>
                <p className="mt-1.5 text-xs leading-6 text-white/55">
                  故事结束后，六段记忆会重新打开。你会看见 Sean
                  没说出口的话，也会获得一次重新回应的机会。
                </p>
              </div>
            </div>

            <p className="text-center text-xs leading-6 text-white/70">
              这里没有正确选项，也不会为一段关系打分。
            </p>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="tracking-widest text-white/75">空格 / →</dt>
              <dd className="text-white/40">推进</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="tracking-widest text-white/75">←</dt>
              <dd className="text-white/40">返回</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="tracking-widest text-white/75">↑ / ↓</dt>
              <dd className="text-white/40">切换选项</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="tracking-widest text-white/75">Enter</dt>
              <dd className="text-white/40">确认</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={advance}
            className="mt-7 w-full border border-white/30 bg-white/[0.06] px-5 py-3 text-xs tracking-[0.28em] text-white/80 transition-colors hover:border-white/60 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-white/70"
          >
            进入第一段记忆
          </button>
        </section>
      )}

      <p className="fixed bottom-10 z-10 text-[10px] tracking-[0.3em] text-white/30 soft-pulse">
        {showingTutorial
          ? "← 返回 · Enter 进入叫花鸡"
          : idx === SCREENS.length - 1
          ? "← 返回 · → 先看看怎么玩"
          : "← 返回 · → 继续 · 空格 / 点击推进"}
      </p>

      <p className="fixed bottom-4 z-10 text-[10px] text-white/15 tracking-widest">
        {showingTutorial ? "玩法" : `${idx + 1} / ${SCREENS.length}`}
      </p>
    </main>
  );
}
