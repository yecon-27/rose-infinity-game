"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadPlaythrough,
  clearPlaythrough,
  buildReport,
  Playthrough,
  FilterReport,
} from "@/lib/playthrough";

export default function EndingPage() {
  const [play, setPlay] = useState<Playthrough | null>(null);
  const [report, setReport] = useState<FilterReport | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const p = loadPlaythrough();
    if (p) {
      setPlay(p);
      setReport(buildReport(p));
    }
    setMounted(true);
  }, []);

  if (mounted && (!play || play.scenes.length === 0)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 max-w-xl mx-auto text-center">
        <p className="text-sm text-muted mb-6">
          你还没有完成任何一幕。
        </p>
        <Link
          href="/game"
          className="inline-block py-2 px-6 border border-ink/30 hover:border-ink hover:bg-ink hover:text-paper transition-colors text-sm tracking-widest"
        >
          开 始 第 一 幕
        </Link>
      </main>
    );
  }

  if (!mounted || !play || !report) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-muted">
        加载中……
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col px-6 py-12 max-w-2xl mx-auto">
      <div className="space-y-10 fade-in">
        {/* 结局标题 */}
        <header className="text-center space-y-3">
          <p className="text-xs tracking-widest text-muted uppercase">结局</p>
          <h2 className="text-4xl font-serif tracking-wider">风 化</h2>
          <p className="text-xs text-muted/70">
            完成了 {report.totalScenes} 幕 · {report.totalTurns} 次开口
          </p>
        </header>

        {/* 结局文本 */}
        <section className="space-y-4 leading-relaxed text-ink/80">
          <p>
            没有争吵,没有摔门,没有一句重话。
          </p>
          <p className="text-muted">
            关系没有结束——它只是没有活下去。谁也说不清是哪天结束的,这才是最窒息的部分。
          </p>
        </section>

        {/* 各幕金句回响 */}
        <section className="border-t border-ink/10 pt-8 space-y-4">
          <p className="text-xs text-muted tracking-widest">这一路,你留下的句子</p>
          <div className="space-y-3">
            {report.goldenQuotes.map((g, i) => (
              <div key={i} className="border-l-2 border-accent/40 pl-4">
                <p className="text-[10px] text-muted tracking-widest mb-1">
                  {g.sceneName}
                </p>
                <p className="text-sm text-accent/90 italic">"{g.quote}"</p>
              </div>
            ))}
          </div>
        </section>

        {/* 过滤器报告 */}
        <section className="border-t border-ink/10 pt-8 space-y-6">
          <div>
            <p className="text-xs text-muted tracking-widest mb-2">你的过滤器报告</p>
            <h3 className="text-xl font-serif">
              这一路,你的回避画像
            </h3>
          </div>

          {/* 个人化画像句 */}
          <div className="bg-paper border border-ink/10 p-5 rounded">
            <p className="text-sm leading-relaxed text-ink">
              {report.portrait}
            </p>
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="border border-ink/10 p-4 rounded">
              <p className="text-3xl font-serif">{report.totalTurns}</p>
              <p className="text-xs text-muted mt-1">次开口</p>
            </div>
            <div className="border border-ink/10 p-4 rounded">
              <p className="text-3xl font-serif text-muted">{report.highCount}</p>
              <p className="text-xs text-muted mt-1">次完全过滤</p>
            </div>
            <div className="border border-ink/10 p-4 rounded">
              <p className="text-3xl font-serif text-accent">{report.lowCount}</p>
              <p className="text-xs text-muted mt-1">次漏出一半</p>
            </div>
          </div>

          {/* 总结 */}
          <p className="text-sm leading-relaxed text-ink/80">
            {report.summary}
          </p>

          {/* 出口话习惯词 */}
          {report.spokenHabits.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-2">你最常用的回避词:</p>
              <div className="flex flex-wrap gap-2">
                {report.spokenHabits.map((w) => (
                  <span
                    key={w}
                    className="px-3 py-1 border border-ink/20 text-sm text-ink/70 rounded-full"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 内心暴露词 */}
          {report.exposedFeelings.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-2">
                你心里出现过、却大多没说出口的词:
              </p>
              <div className="flex flex-wrap gap-2">
                {report.exposedFeelings.map((w) => (
                  <span
                    key={w}
                    className="px-3 py-1 border border-accent/30 text-sm text-accent/80 rounded-full bg-paper"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 全程对照列表 */}
        <section className="border-t border-ink/10 pt-8 space-y-6">
          <p className="text-xs text-muted tracking-widest">
            全程对照 · 你想的 vs 你说出口的
          </p>
          {play.scenes.map((sc, si) => (
            <div key={si} className="space-y-3">
              <p className="text-xs text-accent/70 tracking-widest">{sc.sceneName}</p>
              {sc.turns.map((t, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-ink/10 p-4 rounded"
                >
                  <div>
                    <p className="text-[10px] text-muted mb-1 tracking-widest">
                      你想的
                    </p>
                    <p className="inner-voice text-sm">{t.inner}</p>
                  </div>
                  <div className="md:border-l md:border-ink/10 md:pl-4">
                    <p className="text-[10px] text-muted mb-1 tracking-widest">
                      你说的
                      {t.intensity === "low" && (
                        <span className="ml-1 text-accent/60">· 漏了一半</span>
                      )}
                    </p>
                    <p className="spoken-words text-sm">"{t.spoken}"</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* 行动按钮 */}
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
          截图分享你的过滤器报告 · #CodeBuddy #腾讯云黑客松
        </p>
      </div>
    </main>
  );
}
