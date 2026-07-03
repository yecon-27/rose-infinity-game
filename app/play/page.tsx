"use client";

import dynamic from "next/dynamic";

/**
 * /play 是 Phaser 的唯一挂载点。
 * dynamic + ssr:false 确保 Phaser 代码不进入服务端 bundle
 * (Phaser import 时即触碰 window,SSR 会报错)。
 */
const PhaserGame = dynamic(() => import("@/phaser/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen bg-black flex items-center justify-center text-white/40 text-sm tracking-widest">
      加载中
    </div>
  ),
});

export default function PlayPage() {
  return <PhaserGame />;
}
