"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  loadPlaythrough,
  loadRelationship,
  clearPlaythrough,
  buildReport,
  decideEnding,
  EndingKind,
  Playthrough,
  FilterReport,
  TurnRecord,
} from "@/lib/playthrough";

/** 分支结局文案(黑场终止页,短) */
const ENDINGS: Record<EndingKind, { title: string; paragraphs: string[] }> = {
  weathered: {
    title: "风 化",
    paragraphs: [
      "没有争吵,没有摔门,没有一句重话。",
      "谁也说不清是哪天结束的。",
    ],
  },
  "wasted-pierce": {
    title: "风 化",
    paragraphs: [
      "最后那一刻,没有任何东西拦你。",
      "原来拦住你的,从来不是过滤器。",
    ],
  },
  "door-open": {
    title: "门 没 有 关 上",
    paragraphs: [
      "她在门口站了很久,声控灯灭了又亮。",
      "明天,过滤器还会长回来。但今天,门没有关上。",
    ],
  },
};

/** 所有可能的结局(流程图展示用) */
const ALL_ENDINGS: Array<{ kind: EndingKind; title: string; hint: string }> = [
  { kind: "weathered", title: "风化", hint: "从未卸下防御" },
  { kind: "wasted-pierce", title: "风化 · 无声", hint: "过滤器碎了,你却沉默" },
  { kind: "door-open", title: "门没有关上", hint: "穿透,并且说了真话" },
];

const INTENSITY_LABEL: Record<TurnRecord["intensity"], string> = {
  high: "完全过滤",
  low: "漏出一半",
  pierce: "穿透",
};

interface FlatTurn extends TurnRecord {
  sceneName: string;
}

/** 结尾背景:终幕的房间,延续游戏的画面语言,不再是纯黑 */
function EndingBackdrop({ dim }: { dim: string }) {
  return (
    <div className="fixed inset-0 z-0">
      <Image
        src="/images/scenes/act5_room.png"
        alt=""
        fill
        priority
        className="object-cover ken-burns"
      />
      <div className={`absolute inset-0 ${dim}`} />
    </div>
  );
}

export default function EndingPage() {
  const router = useRouter();
  const [play, setPlay] = useState<Playthrough | null>(null);
  const [report, setReport] = useState<FilterReport | null>(null);
  const [ending, setEnding] = useState<EndingKind>("weathered");
  const [stage, setStage] = useState<"end" | "debrief">("end");
  const [sel, setSel] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const p = loadPlaythrough();
    if (p) {
      setPlay(p);
      setReport(buildReport(p));
    }
    setEnding(decideEnding(loadRelationship()));
    setMounted(true);
  }, []);

  /** 所有轮次拍平,供流程图选择 */
  const flat: FlatTurn[] = useMemo(
    () =>
      (play?.scenes ?? []).flatMap((sc) =>
        sc.turns.map((t) => ({ ...t, sceneName: sc.sceneName }))
      ),
    [play]
  );

  // 键盘操控:终止屏 Enter 进回放;回放屏 ←→ 翻轮次,Enter 再来一次,Esc 回开场
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (stage === "end") {
        if (e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          setStage("debrief");
        } else if (e.key.toLowerCase() === "r") {
          clearPlaythrough();
          router.push("/game");
        }
        return;
      }
      if (flat.length === 0) return;
      if (e.key === "ArrowRight") {
        setSel((s) => Math.min(s + 1, flat.length - 1));
      } else if (e.key === "ArrowLeft") {
        setSel((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        clearPlaythrough();
        router.push("/game");
      } else if (e.key === "Escape") {
        clearPlaythrough();
        router.push("/");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, flat.length, router]);

  if (mounted && (!play || play.scenes.length === 0)) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-sm text-white/50 mb-6">你还没有完成任何一幕。</p>
        <Link
          href="/game"
          className="inline-block py-2 px-6 border border-white/30 text-white/90 hover:border-white hover:bg-white hover:text-ink transition-colors text-sm tracking-widest"
        >
          开 始 第 一 幕
        </Link>
      </main>
    );
  }

  if (!mounted || !play || !report) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-sm text-white/40">
        ……
      </main>
    );
  }

  const endingCopy = ENDINGS[ending];

  /* ── 第一屏:终止(房间背景压暗,不再纯黑) ── */
  if (stage === "end") {
    return (
      <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-8 text-center">
        <EndingBackdrop dim="bg-gradient-to-b from-black/80 via-black/70 to-black/85" />
        <p
          className="relative z-10 fade-in-delayed text-[10px] tracking-[0.5em] text-white/40 uppercase mb-6"
          style={{ animationDelay: "0.5s" }}
        >
          结局
        </p>
        <h2 className="relative z-10 chapter-title text-4xl font-serif text-white/95 mb-10">
          {endingCopy.title}
        </h2>
        <div className="relative z-10 space-y-3 max-w-md">
          {endingCopy.paragraphs.map((p, i) => (
            <p
              key={i}
              className="fade-in-delayed text-sm leading-loose text-white/60"
              style={{ animationDelay: `${1.6 + i * 1.2}s` }}
            >
              {p}
            </p>
          ))}
        </div>

        <p
          className="relative z-10 fade-in-delayed text-2xl font-serif text-white/80 mt-14"
          style={{ animationDelay: "4.4s" }}
        >
          完
        </p>

        <div
          className="relative z-10 fade-in-delayed mt-14 flex flex-col sm:flex-row gap-3"
          style={{ animationDelay: "5.4s" }}
        >
          <button
            type="button"
            onClick={() => setStage("debrief")}
            className="py-2 px-8 border border-white/30 text-white/90 hover:border-white hover:bg-white hover:text-ink transition-colors text-xs tracking-[0.3em]"
          >
            回 放 这 段 关 系
            <span className="ml-2 text-white/35">Enter</span>
          </button>
          <Link
            href="/game"
            onClick={() => clearPlaythrough()}
            className="py-2 px-8 border border-white/10 text-white/40 hover:text-white/80 hover:border-white/40 transition-colors text-xs tracking-[0.3em] text-center"
          >
            再 来 一 次
            <span className="ml-2 text-white/25">R</span>
          </Link>
        </div>
      </main>
    );
  }

  /* ── 第二屏:复盘(同一房间背景,更暗一档保证可读性) ── */
  const cur = flat[Math.min(sel, flat.length - 1)];
  let globalIdx = -1; // 流程图节点的全局序号(跨幕累加)

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-6 py-10">
      <EndingBackdrop dim="bg-black/80 backdrop-blur-[2px]" />
      <div className="relative z-10 w-full max-w-xl space-y-9 fade-in-slow">
        {/* 标题 */}
        <header className="text-center space-y-2">
          <p className="text-[10px] tracking-[0.5em] text-white/35 uppercase">
            回 放
          </p>
          <h2 className="text-xl font-serif tracking-[0.3em] text-white/90">
            {endingCopy.title}
          </h2>
        </header>

        {/* 流程图:节点即导航 */}
        <section className="space-y-3">
          {play.scenes.map((sc, si) => (
            <div key={si} className="flex items-center gap-4">
              <p className="w-16 shrink-0 text-right text-[10px] text-white/35 tracking-widest">
                {sc.sceneName.replace(/ · .*/, "")}
              </p>
              <div className="flex items-center">
                {sc.turns.map((t, i) => {
                  globalIdx += 1;
                  const idx = globalIdx;
                  const active = idx === sel;
                  return (
                    <div key={i} className="flex items-center">
                      {i > 0 && <span className="w-7 h-px bg-white/15" />}
                      <button
                        type="button"
                        onClick={() => setSel(idx)}
                        aria-label={`${sc.sceneName} 第 ${i + 1} 拍`}
                        className={`w-4 h-4 rounded-full border-2 transition-all ${
                          t.intensity === "high"
                            ? "border-white/30 bg-white/10"
                            : t.intensity === "low"
                              ? "border-accent bg-accent/40"
                              : "border-white bg-white"
                        } ${
                          active
                            ? "ring-2 ring-white/80 ring-offset-2 ring-offset-black scale-110"
                            : "hover:scale-110 opacity-80 hover:opacity-100"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="pl-20 text-[10px] text-white/30">
            ○ 完全过滤 · <span className="text-accent">●</span> 漏出一半 · ● 穿透
            <span className="ml-3 text-white/20">← → 或点击节点</span>
          </p>
        </section>

        {/* 选中轮次:你想的 vs 她想的(对称性揭示,一次一轮) */}
        <section
          key={sel}
          className="fade-in border border-white/12 rounded bg-white/[0.03] backdrop-blur-sm"
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 text-[10px] tracking-widest text-white/40">
            <span>
              {cur.sceneName} · {INTENSITY_LABEL[cur.intensity]}
            </span>
            <span>
              {sel + 1} / {flat.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[9rem]">
            <div className="px-4 py-3">
              <p className="text-[10px] text-white/40 mb-2 tracking-widest">
                你想的
              </p>
              <p className="text-sm leading-relaxed text-white/65 italic">
                {cur.inner}
              </p>
            </div>
            <div className="px-4 py-3 border-t md:border-t-0 md:border-l border-white/10">
              <p className="text-[10px] text-accent/80 mb-2 tracking-widest">
                她想的 · 现在你才看见
              </p>
              <p className="text-sm leading-relaxed text-accent/90 italic">
                {cur.amoInner || "她想说点什么。想了想,算了。"}
              </p>
            </div>
          </div>
        </section>

        {/* 一句收束 + 其他结局 */}
        <section className="text-center space-y-4">
          <p className="text-xs leading-relaxed text-white/45">
            她的内心戏,和你的一模一样。{report.portrait}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {ALL_ENDINGS.map((e) => (
              <span
                key={e.kind}
                className={`px-3 py-1 rounded-full border text-[10px] tracking-wider ${
                  e.kind === ending
                    ? "border-white/70 text-white"
                    : "border-white/12 text-white/30"
                }`}
              >
                {e.kind === ending ? `● ${e.title}` : `? ${e.hint}`}
              </span>
            ))}
          </div>
        </section>

        {/* 行动 */}
        <section className="flex justify-center gap-3 pt-1">
          <Link
            href="/game"
            onClick={() => clearPlaythrough()}
            className="py-2 px-8 border border-white/30 text-white/90 hover:border-white hover:bg-white hover:text-ink transition-colors text-xs tracking-[0.3em]"
          >
            再 来 一 次
            <span className="ml-2 text-white/35">Enter</span>
          </Link>
          <Link
            href="/"
            onClick={() => clearPlaythrough()}
            className="py-2 px-8 border border-white/10 text-white/40 hover:text-white/80 hover:border-white/40 transition-colors text-xs tracking-[0.3em]"
          >
            回 到 开 场
            <span className="ml-2 text-white/25">Esc</span>
          </Link>
        </section>

        <p className="text-center text-[10px] text-white/20">
          截图分享你的流程图 · #CodeBuddy #腾讯云黑客松
        </p>
      </div>
    </main>
  );
}
