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

/** 分支结局文案 */
const ENDINGS: Record<
  EndingKind,
  { label: string; title: string; paragraphs: string[] }
> = {
  weathered: {
    label: "结局",
    title: "风 化",
    paragraphs: [
      "没有争吵,没有摔门,没有一句重话。",
      "关系没有结束——它只是没有活下去。谁也说不清是哪天结束的,这才是最窒息的部分。",
    ],
  },
  "wasted-pierce": {
    label: "结局",
    title: "风 化",
    paragraphs: [
      "最后那一刻,没有任何东西拦你。过滤器碎了,嘴是你自己的。",
      "你说出口的,还是客套。",
      "原来拦住你的从来不是过滤器。",
    ],
  },
  "door-open": {
    label: "结局",
    title: "门 没 有 关 上",
    paragraphs: [
      "你把那句话原样说了出去。她在门口站了很久,声控灯灭了又亮。",
      "这不是童话。明天,过滤器还会长回来,她的和你的都会。",
      "但今天,门没有关上。",
    ],
  },
};

export default function EndingPage() {
  const [play, setPlay] = useState<Playthrough | null>(null);
  const [report, setReport] = useState<FilterReport | null>(null);
  const [ending, setEnding] = useState<EndingKind>("weathered");
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

  const endingCopy = ENDINGS[ending];

  return (
    <main className="min-h-screen flex flex-col px-6 py-12 max-w-2xl mx-auto">
      <div className="space-y-10 fade-in">
        {/* 结局标题(分支) */}
        <header className="text-center space-y-3">
          <p className="text-xs tracking-widest text-muted uppercase">
            {endingCopy.label}
          </p>
          <h2 className="text-4xl font-serif tracking-wider">
            {endingCopy.title}
          </h2>
          <p className="text-xs text-muted/70">
            完成了 {report.totalScenes} 幕 · {report.totalTurns} 次开口
          </p>
        </header>

        {/* 结局文本(分支) */}
        <section className="space-y-4 leading-relaxed text-ink/80">
          {endingCopy.paragraphs.map((p, i) => (
            <p key={i} className={i > 0 ? "text-muted" : undefined}>
              {p}
            </p>
          ))}
        </section>

        {/* 第三视角回放:对称性揭示 —— 整个游戏的心碎点 */}
        <section className="border-t border-ink/10 pt-8 space-y-6">
          <div className="space-y-2">
            <p className="text-xs text-muted tracking-widest">第三视角 · 回放</p>
            <p className="text-sm leading-relaxed text-ink/80">
              现在,换一双眼睛,把这一路重看一遍。
            </p>
            <p className="text-sm leading-relaxed text-muted">
              这是她那边的版本——她听到的,和她没说出口的。
            </p>
          </div>

          {play.scenes.map((sc, si) => (
            <div key={si} className="space-y-3">
              <p className="text-xs text-accent/70 tracking-widest">
                {sc.sceneName}
              </p>
              {sc.turns.map((t, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-2 border border-ink/10 rounded overflow-hidden"
                >
                  <div className="p-4">
                    <p className="text-[10px] text-muted mb-1 tracking-widest">
                      你想的 · 她永远没听到
                    </p>
                    <p className="inner-voice text-sm">{t.inner}</p>
                  </div>
                  <div className="p-4 md:border-l border-ink/10">
                    <p className="text-[10px] text-muted mb-1 tracking-widest">
                      你说的 · 她听到的只有这句
                      {t.intensity === "low" && (
                        <span className="ml-1 text-accent/60">· 漏了一半</span>
                      )}
                      {t.intensity === "pierce" && (
                        <span className="ml-1 text-ink">· 原话,没有过滤</span>
                      )}
                    </p>
                    <p className="spoken-words text-sm">"{t.spoken}"</p>
                  </div>
                  <div className="p-4 border-t border-ink/10">
                    <p className="text-[10px] text-muted mb-1 tracking-widest">
                      她说的 · 你听到的只有这句
                    </p>
                    <p className="spoken-words text-sm">"{t.amoReply}"</p>
                  </div>
                  <div className="p-4 border-t md:border-l border-ink/10 bg-accent/5">
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

          <p className="text-sm leading-relaxed text-muted text-center pt-2">
            她的内心戏,和你的一模一样。你们不是没话说——你们是各自都有一个过滤器。
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
              <p className="text-3xl font-serif text-accent">
                {report.lowCount + report.pierceCount}
              </p>
              <p className="text-xs text-muted mt-1">
                {report.pierceCount > 0 ? "次穿过了过滤器" : "次漏出一半"}
              </p>
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

        {ending !== "door-open" && (
          <p className="text-center text-xs text-muted/70">
            听说,如果一路上卸下足够多的防御,最后那扇门会不一样。
          </p>
        )}

        <p className="text-center text-xs text-muted/60">
          截图分享你的过滤器报告 · #CodeBuddy #腾讯云黑客松
        </p>
      </div>
    </main>
  );
}
