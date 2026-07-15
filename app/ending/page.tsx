"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { LOOKBACK_SEQUENCE } from "@/lib/story";

/**
 * 结局页面 · 两种状态
 * 1. 活完一遍（默认）：邀请回到记忆里，从第一段开始"看见"。
 * 2. 回看全部完成（?seen=1）：玫瑰开。治愈的落点。
 */
export default function EndingPage() {
  return (
    <Suspense fallback={null}>
      <EndingInner />
    </Suspense>
  );
}

function EndingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const seen = params.get("seen") === "1";

  /* 键盘：↑↓（或←→）选择，Enter/空格 确认 */
  const actions = seen
    ? [{ label: "玫 瑰 还 在", to: "/" }]
    : [
        { label: "回 看 记 忆", to: `/look?id=${LOOKBACK_SEQUENCE[0]}` },
        { label: "返 回 首 页", to: "/" },
      ];
  const [sel, setSel] = useState(0);
  useEffect(() => setSel(0), [seen]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const n = actions.length;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setSel((i) => (i + 1) % n);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSel((i) => (i - 1 + n) % n);
      } else if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        router.push(actions[sel].to);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seen, sel, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black flex flex-col items-center justify-center px-8">
      {/* 背景 */}
      <div className="fixed inset-0 z-0">
        {/* 花苞 → 盛放：回看完成前是 rose-bud，看懂之后才开 */}
        <Image
          src={seen ? "/images/motifs/rose-bloom.png" : "/images/motifs/rose-bud.png"}
          alt=""
          fill
          className="object-contain"
          style={{ opacity: seen ? 0.45 : 0.25, transition: "opacity 2s ease" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80" />
      </div>

      <div className="relative z-10 max-w-xl text-center space-y-12">
        <div className="space-y-6">
          <h1 className="text-4xl font-serif tracking-[0.3em] text-white">
            玫瑰无限
          </h1>
          {seen ? (
            <div className="space-y-4 text-white/75 leading-loose">
              <p>你把那些日子，重新看了一遍。</p>
              <p>有些伸手，你认出来了。有些心情，你听见了。</p>
              <p>
                那时候，两个人都还没学会照顾自己，可能也照顾不好别人。
              </p>
              <p className="text-white/90">
                玫瑰不是为哪一对开的。它为学会的人开。
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-white/75 leading-loose">
              <p>你走过了那些日子。</p>
              <p>有些伸手，当年没接住。</p>
              <p className="text-white/90">现在，回去看看。</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {actions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              onMouseEnter={() => setSel(i)}
              onClick={() => router.push(a.to)}
              className={
                i === 0
                  ? `block w-full py-4 px-6 border transition-colors duration-300 tracking-[0.4em] text-sm ${
                      sel === i
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-accent/50 text-accent/75"
                    }`
                  : `block w-full py-3 px-6 border transition-colors text-xs tracking-[0.3em] ${
                      sel === i
                        ? "border-white/40 text-white/90"
                        : "border-transparent text-white/50"
                    }`
              }
            >
              {a.label}
            </button>
          ))}
          <p className="text-[10px] tracking-[0.3em] text-white/25">
            ↑↓ 选择 · Enter 确认
          </p>
        </div>

        <p className="text-[10px] text-white/30 tracking-widest leading-relaxed">
          腾讯云黑客松 2026 · 叙事游戏
        </p>
      </div>
    </main>
  );
}
