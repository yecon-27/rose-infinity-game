"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * 序章 · 前戏
 * 黑屏,一句一句浮现,点击推进。
 * 在玩家被要求做任何事之前,先让 ta 知道自己是谁、身处什么样的关系。
 */
const SCREENS: string[][] = [
  ["有些话,你从来没有说出口。"],
  ["不是不想说。", "是话到嘴边,会自己变成另一句。"],
  ["轻一点的。客气一点的。安全一点的。"],
  ["你是阿沉。", "和阿默在一起,七个月了。"],
  [
    "她很好。你们不吵架,不催促,不纠缠。",
    "体面得像一对成年人。",
  ],
  ["只是每次分开的时候,你都觉得,有什么话没有说。"],
  ["今晚是第七次约会。", "吃完饭了。账单放在桌上。"],
  ["你心里有句话,正在往喉咙口爬。"],
];

export default function ProloguePage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);

  function advance() {
    if (idx >= SCREENS.length - 1) {
      router.push("/game");
    } else {
      setIdx(idx + 1);
    }
  }

  // 键盘:空格/Enter 推进,Esc 跳过
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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

  // 世界随序章推进慢慢显影:开头近乎全黑,说到"你是阿沉"时暖光渗出,
  // 最后一句时餐厅已隐约可见——正好接进幕一。
  const bgOpacity = Math.min(0.5, idx * 0.07);
  const bgBlur = Math.max(2, 9 - idx);

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
      {/* 跳过(二周目玩家用) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          router.push("/game");
        }}
        className="fixed top-6 right-6 text-[10px] tracking-widest text-white/25 hover:text-white/60 transition-colors"
      >
        跳过(Esc) ▸
      </button>

      <div
        key={idx}
        className="relative z-10 fade-in-slow max-w-md text-center space-y-4"
      >
        {SCREENS[idx].map((line, i) => (
          <p
            key={i}
            className="text-white/85 leading-loose tracking-wide text-base"
          >
            {line}
          </p>
        ))}
      </div>

      <p className="fixed bottom-10 text-[10px] tracking-[0.3em] text-white/30 soft-pulse">
        {idx >= SCREENS.length - 1 ? "▼ 推开那扇门" : "空格 / 点击 继续"}
      </p>

      <p className="fixed bottom-4 text-[10px] text-white/15 tracking-widest">
        {idx + 1} / {SCREENS.length}
      </p>
    </main>
  );
}
