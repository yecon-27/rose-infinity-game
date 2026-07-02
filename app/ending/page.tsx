import Link from "next/link";

export default function EndingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 max-w-xl mx-auto">
      <div className="space-y-8 text-center fade-in">
        <p className="text-xs tracking-widest text-muted uppercase">结局</p>
        <h2 className="text-3xl font-serif">风 化</h2>

        <div className="space-y-4 text-left leading-relaxed text-ink/80">
          <p>
            账算得清清楚楚。你们各自付了各自的那份,走出餐厅。
          </p>
          <p className="text-muted">
            之后还有无数次这样的"清清楚楚"。
          </p>
        </div>

        <div className="border-t border-ink/10 pt-6">
          <p className="text-xs text-muted mb-4">你的过滤器报告</p>
          <p className="text-sm text-muted/70 italic">
            (报告生成功能待接入)
          </p>
        </div>

        <Link
          href="/"
          className="inline-block mt-4 py-2 px-6 border border-ink/30 hover:border-ink hover:bg-ink hover:text-paper transition-colors text-sm tracking-widest"
        >
          重 新 开 始
        </Link>
      </div>
    </main>
  );
}
