"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadPlaythrough,
  loadRelationship,
  clearPlaythrough,
  buildReport,
  decideEnding,
  EndingKind,
  Playthrough,
  FilterReport,
} from "@/lib/playthrough";

/** 分支结局文案(黑场终止页,短) */
const ENDINGS: Record<
  EndingKind,
  { title: string; paragraphs: string[] }
> = {
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

export default function EndingPage() {
  const [play, setPlay] = useState<Playthrough | null>(null);
  const [report, setReport] = useState<FilterReport | null>(null);
  const [ending, setEnding] = useState<EndingKind>("weathered");
  const [stage, setStage] = useState<"end" | "debrief">("end");
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

  /* ── 第一屏:黑场终止 ── */
  if (stage === "end") {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center px-8 text-center">
        <p
          className="fade-in-delayed text-[10px] tracking-[0.5em] text-white/35 uppercase mb-6"
          style={{ animationDelay: "0.5s" }}
        >
          结局
        </p>
        <h2 className="chapter-title text-4xl font-serif text-white/95 mb-10">
          {endingCopy.title}
        </h2>
        <div className="space-y-3 max-w-md">
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
          className="fade-in-delayed text-2xl font-serif text-white/80 mt-14"
          style={{ animationDelay: "4.4s" }}
        >
          完
        </p>

        <div
          className="fade-in-delayed mt-14 flex flex-col sm:flex-row gap-3"
          style={{ animationDelay: "5.4s" }}
        >
          <button
            type="button"
            onClick={() => setStage("debrief")}
            className="py-2 px-8 border border-white/30 text-white/90 hover:border-white hover:bg-white hover:text-ink transition-colors text-xs tracking-[0.3em]"
          >
            回 放 这 段 关 系
          </button>
          <Link
            href="/game"
            onClick={() => clearPlaythrough()}
            className="py-2 px-8 border border-white/10 text-white/40 hover:text-white/80 hover:border-white/40 transition-colors text-xs tracking-[0.3em] text-center"
          >
            再 来 一 次
          </Link>
        </div>
      </main>
    );
  }

  /* ── 第二屏:复盘(流程图 + 对照) ── */
  return (
    <main className="min-h-screen flex flex-col px-6 py-12 max-w-2xl mx-auto">
      <div className="space-y-10 fade-in">
        <header className="text-center space-y-2">
          <p className="text-xs tracking-widest text-muted uppercase">
            复盘 · 你走过的路
          </p>
          <h2 className="text-2xl font-serif tracking-wider">
            {endingCopy.title}
          </h2>
        </header>

        {/* 流程图:每一拍的选择 + 三个可能的结局 */}
        <section className="space-y-4">
          <div className="space-y-3">
            {play.scenes.map((sc, si) => (
              <div key={si} className="flex items-center gap-3">
                <p className="w-28 shrink-0 text-[10px] text-muted tracking-widest">
                  {sc.sceneName.replace(/ · .*/, "")}
                </p>
                <div className="flex items-center gap-0">
                  {sc.turns.map((t, i) => (
                    <div key={i} className="flex items-center">
                      {i > 0 && <span className="w-6 h-px bg-ink/15" />}
                      <span
                        title={
                          t.intensity === "high"
                            ? "完全过滤"
                            : t.intensity === "low"
                              ? "漏出一半"
                              : "穿透"
                        }
                        className={`w-3.5 h-3.5 rounded-full border-2 ${
                          t.intensity === "high"
                            ? "border-ink/20 bg-ink/10"
                            : t.intensity === "low"
                              ? "border-accent bg-accent/30"
                              : "border-ink bg-ink"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {ALL_ENDINGS.map((e) => (
              <div
                key={e.kind}
                className={`px-3 py-1.5 rounded-full border text-xs ${
                  e.kind === ending
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/15 text-muted/60"
                }`}
              >
                {e.kind === ending ? e.title : `? ${e.hint}`}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted/70">
            ○ 完全过滤 · <span className="text-accent">●</span> 漏出一半 · ● 穿透
            {ending !== "door-open" && " —— 另外的路,还没有人走过"}
          </p>
        </section>

        {/* 对称性揭示:你想的 vs 她想的 */}
        <section className="border-t border-ink/10 pt-8 space-y-5">
          <div className="space-y-1">
            <p className="text-xs text-muted tracking-widest">
              第三视角 · 你们各自没说出口的
            </p>
            <p className="text-sm text-muted leading-relaxed">
              她的内心戏,和你的一模一样。
            </p>
          </div>

          {play.scenes.map((sc, si) => (
            <div key={si} className="space-y-2">
              <p className="text-[10px] text-accent/70 tracking-widest">
                {sc.sceneName}
              </p>
              {sc.turns.map((t, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-2 border border-ink/10 rounded overflow-hidden"
                >
                  <div className="p-3">
                    <p className="text-[10px] text-muted mb-1 tracking-widest">
                      你想的
                    </p>
                    <p className="inner-voice text-sm">{t.inner}</p>
                  </div>
                  <div className="p-3 md:border-l border-t md:border-t-0 border-ink/10 bg-accent/5">
                    <p className="text-[10px] text-accent/70 mb-1 tracking-widest">
                      她想的 · 现在你才看见
                    </p>
                    <p className="inner-voice text-sm text-ink/80">
                      {t.amoInner || "她想说点什么。想了想,算了。"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* 一句画像 */}
        <section className="border-t border-ink/10 pt-8 space-y-3">
          <p className="text-sm leading-relaxed text-ink">{report.portrait}</p>
          <p className="text-sm leading-relaxed text-muted">{report.summary}</p>
        </section>

        {/* 行动 */}
        <section className="border-t border-ink/10 pt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/game"
            onClick={() => clearPlaythrough()}
            className="inline-block py-2 px-6 border border-ink/30 hover:border-ink hover:bg-ink hover:text-paper transition-colors text-sm tracking-widest text-center"
          >
            再 来 一 次
          </Link>
          <Link
            href="/"
            onClick={() => clearPlaythrough()}
            className="inline-block py-2 px-6 border border-ink/10 hover:border-ink/30 text-sm tracking-widest text-muted text-center"
          >
            回 到 开 场
          </Link>
        </section>

        <p className="text-center text-xs text-muted/60">
          截图分享你的流程图 · #CodeBuddy #腾讯云黑客松
        </p>
      </div>
    </main>
  );
}
