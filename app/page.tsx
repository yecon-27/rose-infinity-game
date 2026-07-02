import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-xl text-center space-y-8 fade-in">
        <p className="text-sm tracking-widest text-muted uppercase">
          腾讯云黑客松 2026 · 叙事游戏
        </p>

        <h1 className="text-5xl font-serif tracking-wider">过滤器</h1>
        <p className="text-sm text-muted tracking-[0.3em]">THE FILTER</p>

        <div className="space-y-4 text-left leading-relaxed text-ink/80">
          <p>
            两个回避型依恋的人相爱,是一场没有凶手的慢性死亡。
          </p>
          <p>
            没有争吵,没有背叛,没有任何一个可以归罪的瞬间。
          </p>
          <p className="text-muted">
            你心里有话,出口的却是别的。你拦不住自己。
          </p>
        </div>

        <div className="pt-6 space-y-3">
          <Link
            href="/game"
            className="block w-full py-3 px-6 border border-ink/30 hover:border-ink hover:bg-ink hover:text-paper transition-colors tracking-widest text-sm"
          >
            开 始
          </Link>
          <p className="text-xs text-muted/70">
            建议在安静的环境下游玩 · 约 5-10 分钟
          </p>
        </div>
      </div>
    </main>
  );
}
