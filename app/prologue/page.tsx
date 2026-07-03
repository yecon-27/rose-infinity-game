"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fallbackFilter } from "@/lib/filter-prompt";

/**
 * 序章 · 前戏
 * 黑屏,一句一句浮现,点击推进;世界随推进慢慢显影。
 * 第 4 步是"失控演示":玩家打的第一句话,当面被过滤器改写——
 * 开场三分钟内亮出底牌(To the Moon 式钩子前置)。
 */
const SCREENS: string[][] = [
  ["有些话,你从来没有说出口。"],
  ["不是不想说。", "是话到嘴边,会自己变成另一句。"],
  ["轻一点的。客气一点的。安全一点的。"],
  // ← 这里插入失控演示(DEMO_STEP)
  ["你是阿沉。", "和阿默在一起,七个月了。"],
  [
    "她很好。你们不吵架,不催促,不纠缠。",
    "体面得像一对成年人。",
  ],
  ["只是每次分开的时候,你都觉得,有什么话没有说。"],
  ["今晚是第七次约会。", "吃完饭了。账单放在桌上。"],
  ["你心里有句话,正在往喉咙口爬。"],
];

/** 演示步所在的位置(前面有 3 屏) */
const DEMO_STEP = 3;
const TOTAL_STEPS = SCREENS.length + 1;

export default function ProloguePage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [demoInput, setDemoInput] = useState("");
  const [demoSpoken, setDemoSpoken] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const atDemo = idx === DEMO_STEP;
  const demoDone = demoSpoken !== null;

  function advance() {
    if (atDemo && !demoDone) return; // 演示没做完,不许跳
    if (idx >= TOTAL_STEPS - 1) {
      router.push("/game");
    } else {
      setIdx(idx + 1);
    }
  }

  async function runDemo() {
    const trimmed = demoInput.trim();
    if (!trimmed || demoLoading) return;
    setDemoLoading(true);
    try {
      const res = await fetch("/api/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: trimmed,
          intensity: "high",
          context: {
            sceneId: "prologue",
            sceneBrief:
              "序章演示:玩家随意输入一句真心话,过滤器当面把它改写成回避版本。",
          },
        }),
      });
      const data = await res.json();
      setDemoSpoken(
        data.ok ? data.spoken : fallbackFilter(trimmed, "high")
      );
    } catch {
      setDemoSpoken(fallbackFilter(trimmed, "high"));
    } finally {
      setDemoLoading(false);
    }
  }

  // 键盘:空格/Enter 推进,Esc 跳过(演示步的输入框内不拦截)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement
      )
        return;
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        advance();
      } else if (e.key === "Escape") {
        router.push("/game");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 世界显影
  const bgOpacity = Math.min(0.5, idx * 0.06);
  const bgBlur = Math.max(2, 9 - idx);

  const screen =
    idx < DEMO_STEP ? SCREENS[idx] : atDemo ? null : SCREENS[idx - 1];

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
          src="/images/scenes/act1_restaurant.png"
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
        跳过(Esc) ▸
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

      {/* 失控演示 */}
      {atDemo && (
        <div
          className="relative z-10 fade-in-slow w-full max-w-md text-center space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          {!demoDone ? (
            <>
              <p className="text-white/85 leading-loose">
                不信的话,试试看。
              </p>
              <p className="text-white/50 text-sm">
                随便打一句,你现在心里的话——
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runDemo();
                }}
              >
                <textarea
                  value={demoInput}
                  onChange={(e) => setDemoInput(e.target.value)}
                  autoFocus
                  rows={2}
                  maxLength={200}
                  placeholder="比如:我其实很想念一个人……"
                  className="w-full bg-white/5 border border-white/25 p-3 text-sm text-white text-center placeholder:text-white/25 resize-none focus:outline-none focus:border-white/60 rounded"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      runDemo();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!demoInput.trim() || demoLoading}
                  className="mt-3 py-2 px-10 border border-white/30 text-xs tracking-[0.4em] text-white/90 hover:border-white hover:bg-white hover:text-ink transition-colors disabled:opacity-40"
                >
                  {demoLoading ? "……" : "说 出 口"}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-5 fade-in">
              <div>
                <p className="text-[10px] tracking-[0.4em] text-white/35 mb-2">
                  你想说的
                </p>
                <p className="text-sm text-white/45 italic leading-loose">
                  {demoInput.trim()}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.4em] text-white/60 mb-2">
                  你说出口的
                </p>
                <p className="text-base text-white/95 leading-loose">
                  “{demoSpoken}”
                </p>
              </div>
              <p className="text-white/50 text-sm pt-2">
                看见了吗。它一直都在。
              </p>
              <p
                className="text-[10px] tracking-[0.3em] text-white/30 soft-pulse cursor-pointer"
                onClick={advance}
              >
                空格 / 点击 继续
              </p>
            </div>
          )}
        </div>
      )}

      {!atDemo && (
        <p className="fixed bottom-10 z-10 text-[10px] tracking-[0.3em] text-white/30 soft-pulse">
          {idx >= TOTAL_STEPS - 1 ? "▼ 推开那扇门" : "空格 / 点击 继续"}
        </p>
      )}

      <p className="fixed bottom-4 z-10 text-[10px] text-white/15 tracking-widest">
        {idx + 1} / {TOTAL_STEPS}
      </p>
    </main>
  );
}
