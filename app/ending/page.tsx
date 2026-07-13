"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

/**
 * 结局页面
 * 完成所有幕后，玩家可以选择：
 * 1. 回看记忆（看见当年没看见的伸手）
 * 2. 返回首页
 */
export default function EndingPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-black flex flex-col items-center justify-center px-8">
      {/* 背景 */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/motifs/rose-bloom.png"
          alt=""
          fill
          className="object-contain opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80" />
      </div>

      <div className="relative z-10 max-w-xl text-center space-y-12">
        <div className="space-y-6">
          <h1 className="text-4xl font-serif tracking-[0.3em] text-white">
            玫瑰无限
          </h1>
          <div className="space-y-4 text-white/75 leading-loose">
            <p>你走过了那些日子。</p>
            <p>有些伸手，当年没接住——</p>
            <p className="text-white/90">现在，回去看看。</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => router.push("/look?id=warm_hackathon")}
            className="block w-full py-4 px-6 border border-accent/60 text-accent/90 hover:border-accent hover:bg-accent hover:text-ink transition-colors duration-500 tracking-[0.4em] text-sm"
          >
            回 看 记 忆
          </button>
          
          <button
            type="button"
            onClick={() => router.push("/")}
            className="block w-full py-3 px-6 text-white/50 hover:text-white/80 transition-colors text-xs tracking-[0.3em]"
          >
            返 回 首 页
          </button>
        </div>

        <p className="text-[10px] text-white/30 tracking-widest leading-relaxed">
          腾讯云黑客松 2026 · 叙事游戏
        </p>
      </div>
    </main>
  );
}
