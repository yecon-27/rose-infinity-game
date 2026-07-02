"use client";

import { useState } from "react";

interface Exchange {
  inner: string;
  spoken: string;
  intensity: "high" | "low";
}

export default function GamePage() {
  const [input, setInput] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<"high" | "low">("high");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: trimmed,
          intensity,
          context: {
            sceneId: "act1_aa",
            sceneBrief:
              "两人第七次约会,吃完饭,账单放在桌上,阿默提议 AA。",
            amosLastLine: "扫这个吧,我们 AA。",
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "过滤器调用失败");

      setExchanges((prev) => [
        ...prev,
        {
          inner: data.inner,
          spoken: data.spoken,
          intensity: data.intensity,
        },
      ]);
      setInput("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col px-6 py-8 max-w-2xl mx-auto">
      <header className="mb-8 text-center">
        <p className="text-xs tracking-widest text-muted uppercase">
          幕一 · AA 制
        </p>
      </header>

      <div className="flex-1 space-y-6">
        {/* 开场旁白 */}
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

        {/* 教学提示:第一次输入前显示 */}
        {exchanges.length === 0 && (
          <div className="fade-in bg-paper border border-accent/30 p-4 rounded text-sm text-ink/70 leading-relaxed">
            <p className="text-xs text-accent tracking-widest mb-2">
              教学提示
            </p>
            <p>
              下面的输入框里,写下阿沉<strong>真正想说</strong>的话。
              屏幕会同时显示两行:灰色半透明的是你的真心,正常显示的是他实际说出口的——那是你拦不住的。
            </p>
          </div>
        )}

        {/* 历次交换记录:内心话 vs 出口话并置 */}
        {exchanges.map((ex, i) => (
          <div key={i} className="fade-in space-y-2">
            <div className="bg-paper border border-ink/10 p-4 rounded">
              <p className="text-xs text-muted mb-2">
                内心话 <span className="opacity-60">· 只有你看得见</span>
              </p>
              <p className="inner-voice text-sm">{ex.inner}</p>
            </div>
            <div className="border-l-2 border-ink/30 pl-4">
              <p className="text-xs text-muted mb-2">
                阿沉说出口
                {ex.intensity === "low" && (
                  <span className="ml-2 text-accent/70 text-[10px]">
                    [过滤强度:低 · 漏了一半]
                  </span>
                )}
              </p>
              <p className="spoken-words leading-relaxed">"{ex.spoken}"</p>
            </div>
          </div>
        ))}

        {error && (
          <div className="text-sm text-red-700/80 border border-red-300/50 p-3 rounded">
            {error}
          </div>
        )}
      </div>

      {/* 输入区 */}
      <footer className="mt-8 pt-6 border-t border-ink/10">
        {/* MVP 调试用:强度切换。后续阶段会做成隐藏数值 */}
        <div className="mb-3 flex items-center gap-3 text-xs text-muted">
          <span>过滤强度(MVP 调试):</span>
          <button
            type="button"
            onClick={() => setIntensity("high")}
            className={`px-2 py-1 border ${
              intensity === "high"
                ? "border-ink bg-ink text-paper"
                : "border-ink/30"
            }`}
          >
            高
          </button>
          <button
            type="button"
            onClick={() => setIntensity("low")}
            className={`px-2 py-1 border ${
              intensity === "low"
                ? "border-ink bg-ink text-paper"
                : "border-ink/30"
            }`}
          >
            低
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="此刻阿沉心里真正想说的话……"
            className="w-full bg-transparent border border-ink/20 p-3 text-sm resize-none focus:outline-none focus:border-ink/50"
            rows={3}
            disabled={loading}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="mt-2 w-full py-2 border border-ink/30 hover:border-ink hover:bg-ink hover:text-paper transition-colors text-sm tracking-widest disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            {loading ? "过滤中……" : "说 出 口"}
          </button>
        </form>
      </footer>
    </main>
  );
}
