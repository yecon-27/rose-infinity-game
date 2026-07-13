"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  // 开始:先淡出到黑,再跳序章(序章本就是黑底,过渡顺滑,不再硬切黑屏)
  const start = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    setTimeout(() => router.push("/prologue"), 800);
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        start();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start]);

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-6 py-12">
      {/* 背景:标题主视觉。离场时就地虚化+压暗(沉进回忆),不盖黑 */}
      <div
        className="fixed inset-0 z-0"
        style={{
          filter: leaving ? "blur(12px) brightness(0.45)" : "none",
          transition: "filter 800ms ease",
        }}
      >
        <Image
          src="/images/scenes/title_keyart.png"
          alt=""
          fill
          priority
          className="object-cover ken-burns"
        />
        {/* 居中暗角:文字处压暗,四周留住浅色水彩的通透 */}
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
            你们把未来都想好了。
          </p>
          <p className="fade-in-delayed" style={{ animationDelay: "2s" }}>
            后来它就那么淡了——你说不清是哪天。
          </p>
          <p
            className="fade-in-delayed text-white/65"
            style={{ animationDelay: "2.8s" }}
          >
            回去看看。这一次,好好看着她。
          </p>
        </div>

        <div
          className="fade-in-delayed pt-6 space-y-3"
          style={{ animationDelay: "3.6s" }}
        >
          <button
            type="button"
            onClick={start}
            className="block w-full py-3 px-6 border border-white/40 text-white/95 hover:border-white hover:bg-white hover:text-ink transition-colors duration-500 tracking-[0.5em] text-sm"
          >
            开 始
            <span className="ml-3 text-white/40 text-[10px] tracking-widest">
              Enter
            </span>
          </button>
          <p className="text-xs text-white/45">
            建议戴耳机 · 在安静的环境下游玩 · 约 10 分钟
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
