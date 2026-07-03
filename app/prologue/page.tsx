"use client";

import { useState } from "react";
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

  return (
    <main
      className="min-h-screen bg-black flex flex-col items-center justify-center px-8 cursor-pointer select-none"
      onClick={advance}
    >
      {/* 跳过(二周目玩家用) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          router.push("/game");
        }}
        className="fixed top-6 right-6 text-[10px] tracking-widest text-white/25 hover:text-white/60 transition-colors"
      >
        跳过 ▸
      </button>

      <div
        key={idx}
        className="fade-in-slow max-w-md text-center space-y-4"
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
        {idx >= SCREENS.length - 1 ? "▼ 推开那扇门" : "点击继续"}
      </p>

      <p className="fixed bottom-4 text-[10px] text-white/15 tracking-widest">
        {idx + 1} / {SCREENS.length}
      </p>
    </main>
  );
}
