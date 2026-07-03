"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { phaserConfig } from "./config";

/**
 * Phaser 游戏挂载点:Next.js client 组件。
 * - 仅在客户端创建 Phaser.Game(useEffect),避免 SSR 访问 window
 * - 卸载时 destroy,防止内存泄漏
 * - 通过 app/play/page.tsx 的 dynamic({ssr:false}) 导入
 */
export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    const game = new Phaser.Game({
      ...phaserConfig,
      parent: containerRef.current,
    });
    gameRef.current = game;
    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="phaser-game"
      className="w-screen h-screen bg-black"
    />
  );
}
