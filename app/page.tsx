"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSoundscape } from "@/components/soundscape-provider";
import { AUDIO } from "@/lib/audio";
import { clearChoiceLog } from "@/lib/choice-log";

const HOME_SOUND = { bgm: AUDIO.bgm.rosebud, bgmVolume: 0.16 };

export default function Home() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [selectedAction, setSelectedAction] = useState<0 | 1>(0);
  const leavingRef = useRef(false);
  const menuRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { playSfx, unlock } = useSoundscape(HOME_SOUND);

  // 开始：先淡出到黑，再跳序章（序章本就是黑底，过渡顺滑，不再硬切黑屏）
  const start = useCallback(() => {
    if (leavingRef.current) return;
    unlock();
    playSfx(AUDIO.sfx.softTap, 0.22);
    clearChoiceLog();
    leavingRef.current = true;
    setLeaving(true);
    setTimeout(() => router.push("/prologue"), 800);
  }, [playSfx, router, unlock]);

  const openLetter = useCallback(() => {
    if (leavingRef.current) return;
    unlock();
    playSfx(AUDIO.sfx.softTap, 0.18);
    router.push("/letter");
  }, [playSfx, router, unlock]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(e.target.tagName)
      ) {
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = selectedAction === 0 ? 1 : 0;
        setSelectedAction(next);
        menuRefs.current[next]?.focus({ preventScroll: true });
        return;
      }

      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        if (selectedAction === 0) start();
        else openLetter();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openLetter, selectedAction, start]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black flex flex-col items-center justify-center px-6 py-12">
      {/* 背景：标题主视觉。离场时就地虚化+压暗（沉进回忆），不盖黑 */}
      <div
        className="fixed inset-0 z-0"
        style={{
          filter: leaving ? "blur(12px) brightness(0.45)" : "none",
          transition: "filter 800ms ease",
        }}
      >
        <Image
          src="/images/scenes/title_keyart.webp"
          alt=""
          fill
          priority
          className="object-cover ken-burns"
        />
        {/* 居中暗角：文字处压暗，四周留住浅色水彩的通透 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.06) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/45" />
      </div>

      <div
        className="relative z-10 max-w-xl text-center space-y-8 [text-shadow:0_2px_18px_rgba(0,0,0,0.75)]"
        style={{ opacity: leaving ? 0 : 1, transition: "opacity 700ms ease" }}
      >
        <p
          className="fade-in-delayed text-xs tracking-[0.4em] text-white/70 uppercase"
          style={{ animationDelay: "0.3s" }}
        >
          回到那些以为还很长的日子里
        </p>

        <div className="fade-in-slow space-y-3">
          <h1 className="text-6xl font-serif tracking-[0.25em] text-white">
            玫瑰无限
          </h1>
          <p className="text-xs text-white/65 tracking-[0.5em]">ROSE INFINITY</p>
        </div>

        <div className="space-y-3 leading-loose text-white/85 text-sm">
          <p className="fade-in-delayed" style={{ animationDelay: "1.2s" }}>
            你们连未来都想好了。
          </p>
          <p className="fade-in-delayed" style={{ animationDelay: "2s" }}>
            后来它就那么淡了。你说不清是哪一天。
          </p>
          <p
            className="fade-in-delayed text-white/65"
            style={{ animationDelay: "2.8s" }}
          >
            回去看看。这一次，慢一点。
          </p>
        </div>

        <div
          className="fade-in-delayed pt-6 space-y-3"
          style={{ animationDelay: "3.6s" }}
        >
          <button
            ref={(node) => {
              menuRefs.current[0] = node;
            }}
            type="button"
            onClick={start}
            onFocus={() => setSelectedAction(0)}
            onMouseEnter={() => setSelectedAction(0)}
            aria-pressed={selectedAction === 0}
            className={`group relative flex h-12 w-full items-center justify-center border px-6 text-sm tracking-[0.5em] transition-all duration-500 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-white/70 ${
              selectedAction === 0
                ? "border-white/75 bg-white/10 text-white"
                : "border-white/25 bg-black/10 text-white/70 hover:border-white/50"
            }`}
          >
            <span>开 始</span>
            <span
              aria-hidden="true"
              className={`absolute right-5 text-[9px] tracking-widest transition-opacity duration-300 ${
                selectedAction === 0 ? "text-white/55 opacity-100" : "opacity-0"
              }`}
            >
              Enter
            </span>
          </button>
          <button
            ref={(node) => {
              menuRefs.current[1] = node;
            }}
            type="button"
            onClick={openLetter}
            onFocus={() => setSelectedAction(1)}
            onMouseEnter={() => setSelectedAction(1)}
            aria-label="打开玫瑰信笺彩蛋"
            aria-pressed={selectedAction === 1}
            className={`group relative flex h-12 w-full items-center justify-center border px-6 text-[#f3cbd1]/85 backdrop-blur-[1px] transition-all duration-500 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#f3cbd1]/80 ${
              selectedAction === 1
                ? "border-[#efbec6]/75 bg-[#8e4b58]/35 text-[#ffe5e9]"
                : "border-[#e5abb5]/35 bg-[#7b3f4b]/15 hover:border-[#efbec6]/60 hover:bg-[#8e4b58]/25"
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-5 h-4 w-4 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
            >
              <rect
                x="3.5"
                y="5.5"
                width="17"
                height="13"
                rx="1"
                stroke="currentColor"
              />
              <path
                d="m4.5 7 6.35 5.08a1.8 1.8 0 0 0 2.3 0L19.5 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-serif text-[11px] tracking-[0.32em]">
              玫 瑰 信 笺
            </span>
            <span
              aria-hidden="true"
              className={`absolute right-5 text-[9px] tracking-widest transition-opacity duration-300 ${
                selectedAction === 1
                  ? "text-[#f3cbd1]/60 opacity-100"
                  : "opacity-0"
              }`}
            >
              Enter
            </span>
          </button>
          <p className="text-[10px] tracking-[0.08em] text-white/45">
            ↑↓ 选择 · Enter 确认　·　建议戴耳机 · 约 10 分钟
          </p>
        </div>
      </div>

      <p
        className="absolute bottom-6 z-10 text-[10px] text-white/40 tracking-widest"
        style={{ opacity: leaving ? 0 : 1, transition: "opacity 500ms ease" }}
      >
        腾讯云黑客松 2026 · 叙事游戏
      </p>
    </main>
  );
}
