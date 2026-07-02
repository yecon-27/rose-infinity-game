export default function GamePage() {
  return (
    <main className="min-h-screen flex flex-col px-6 py-8 max-w-2xl mx-auto">
      <header className="mb-8 text-center">
        <p className="text-xs tracking-widest text-muted uppercase">
          幕一 · AA 制
        </p>
      </header>

      <div className="flex-1 space-y-6">
        <div className="fade-in">
          <p className="text-xs text-muted mb-2">旁白</p>
          <p className="leading-relaxed text-ink/80">
            第七次约会。吃完饭,账单放在桌上,服务员站在一旁。
            阿默摸出手机,扫了一下二维码。
          </p>
        </div>

        <div className="fade-in border-l-2 border-accent/40 pl-4">
          <p className="text-xs text-muted mb-2">阿默</p>
          <p className="leading-relaxed">"扫这个吧,我们 AA。"</p>
        </div>

        <div className="fade-in bg-paper border border-ink/10 p-4 rounded">
          <p className="text-xs text-muted mb-3">
            此刻你心里真正想说的话 ——
          </p>
          <p className="inner-voice text-sm">
            (此处将出现你的输入。原型阶段先占位。)
          </p>
        </div>

        <p className="text-center text-xs text-muted/60">
          [ 阶段 0 脚手架 · 过滤器管线待接入 ]
        </p>
      </div>

      <footer className="mt-8 pt-6 border-t border-ink/10">
        <textarea
          disabled
          placeholder="你想说什么……(开发中)"
          className="w-full bg-transparent border border-ink/20 p-3 text-sm resize-none focus:outline-none focus:border-ink/50 disabled:opacity-40"
          rows={3}
        />
        <button
          disabled
          className="mt-2 w-full py-2 border border-ink/30 text-sm tracking-widest disabled:opacity-40"
        >
          说 出 口
        </button>
      </footer>
    </main>
  );
}
