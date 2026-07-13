"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        router.push("/prologue");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-6 py-12">
      {/* 背景:标题主视觉(AI 生成素材合成,两人分立两侧,中间是距离) */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/scenes/title_keyart.png"
          alt=""
          fill
          priority
          className="object-cover ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      <div className="relative z-10 max-w-xl text-center space-y-8">
        <p
          className="fade-in-delayed text-xs tracking-[0.4em] text-white/40 uppercase"
          style={{ animationDelay: "0.3s" }}
        >
          回到那些以为还很长的日子里
        </p>

        <div className="fade-in-slow space-y-3">
          <h1 className="text-6xl font-serif tracking-[0.25em] text-white/95">
            玫瑰无限
          </h1>
          <p className="text-xs text-white/50 tracking-[0.5em]">ROSE INFINITY</p>
        </div>

        <div className="space-y-3 leading-loose text-white/70 text-sm">
          <p className="fade-in-delayed" style={{ animationDelay: "1.2s" }}>
            你们把未来都想好了。
          </p>
          <p className="fade-in-delayed" style={{ animationDelay: "2s" }}>
            后来它就那么淡了——你说不清是哪天。
          </p>
          <p
            className="fade-in-delayed text-white/45"
            style={{ animationDelay: "2.8s" }}
          >
            回去看看。这一次,好好看着她。
          </p>
        </div>

        <div
          className="fade-in-delayed pt-6 space-y-3"
          style={{ animationDelay: "3.6s" }}
        >
          <Link
            href="/prologue"
            className="block w-full py-3 px-6 border border-white/30 text-white/90 hover:border-white hover:bg-white hover:text-ink transition-colors duration-500 tracking-[0.5em] text-sm"
          >
            开 始
            <span className="ml-3 text-white/30 text-[10px] tracking-widest">
              Enter
            </span>
          </Link>
          <p className="text-xs text-white/35">
            建议戴耳机 · 在安静的环境下游玩 · 约 10 分钟
          </p>
        </div>
      </div>

      <p className="absolute bottom-6 z-10 text-[10px] text-white/25 tracking-widest">
        腾讯云黑客松 2026 · 叙事游戏
      </p>
    </main>
  );
}
