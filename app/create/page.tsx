"use client";

/**
 * Agent E · 第一屏
 * 说说你自己的故事 → 调 /api/deconstruct(Agent A) → 把拆出来的 outline 显形。
 * 这是"输入 → 生成 → 玩 → 复盘"整条链路的入口，目前先接通到拆解这一步。
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import type { StoryOutline } from "@/lib/generated-story";

type Status = "idle" | "loading" | "done" | "error";

const BREACH_LABEL: Record<StoryOutline["breachType"], string> = {
  none: "没看出明显的裂痕",
  trust: "有一处信任被折断了",
  "unspoken-care": "都在意，只是没说出口",
  distance: "是慢慢走远的那种",
};

const PHASE_DOT: Record<"warm" | "strained", string> = {
  warm: "bg-[#efbec6]",
  strained: "bg-white/35",
};

export default function CreatePage() {
  const [story, setStory] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [outline, setOutline] = useState<StoryOutline | null>(null);
  const [thin, setThin] = useState(false); // 拆得很淡（兜底 / 内容太少）

  const submit = useCallback(async () => {
    const trimmed = story.trim();
    if (!trimmed || status === "loading") return;
    setStatus("loading");
    setOutline(null);
    try {
      const res = await fetch("/api/deconstruct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: trimmed }),
      });
      const data = await res.json();
      if (!data?.ok || !data.outline) {
        setStatus("error");
        return;
      }
      const next = data.outline as StoryOutline;
      setOutline(next);
      setThin(
        data.source === "fallback" ||
          (next.conflicts.length === 0 && next.keyLines.length === 0)
      );
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [story, status]);

  return (
    <main className="relative min-h-screen bg-black px-6 py-12 text-white/85">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/45">
            写给还没说完的那段关系
          </p>
          <h1 className="font-serif text-3xl tracking-[0.18em] text-white">
            说说你自己的故事
          </h1>
          <p className="text-xs leading-relaxed text-white/55">
            不用工整。把你和那个人之间，某段放不下的经过写下来就好。
          </p>
        </header>

        <section className="space-y-4">
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="从哪儿开始都行。你们怎么好的，又是从什么时候开始，话越来越少……"
            rows={9}
            className="w-full resize-none rounded-md border border-white/15 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/90 placeholder:text-white/30 focus:border-[#efbec6]/50 focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-[11px] tracking-[0.2em] text-white/40 transition-colors hover:text-white/70"
            >
              ← 回首页
            </Link>
            <button
              type="button"
              onClick={submit}
              disabled={!story.trim() || status === "loading"}
              className="flex h-11 items-center justify-center border border-[#e5abb5]/40 bg-[#7b3f4b]/20 px-8 text-[12px] tracking-[0.32em] text-[#f3cbd1]/90 transition-all duration-500 hover:border-[#efbec6]/60 hover:bg-[#8e4b58]/30 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {status === "loading" ? "读 着 …" : "让 它 显 形"}
            </button>
          </div>
        </section>

        {status === "error" && (
          <p className="text-center text-xs text-white/50">
            这一下没接住。歇口气，再试一次。
          </p>
        )}

        {status === "done" && outline && (
          <OutlineView outline={outline} thin={thin} />
        )}
      </div>
    </main>
  );
}

function OutlineView({
  outline,
  thin,
}: {
  outline: StoryOutline;
  thin: boolean;
}) {
  return (
    <section className="fade-in-slow space-y-8 border-t border-white/10 pt-8 [animation-duration:0.6s]">
      {thin && (
        <p className="text-center text-xs leading-relaxed text-white/50">
          写得还有点少，只读到一点点。多讲几句当时发生了什么，它能显得更清楚。
        </p>
      )}

      {outline.arc.length > 0 && (
        <Block title="关系走过">
          <ol className="space-y-2">
            {outline.arc.map((a, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${PHASE_DOT[a.phase]}`}
                />
                {a.label}
              </li>
            ))}
          </ol>
        </Block>
      )}

      {outline.conflicts.length > 0 && (
        <Block title="那些没接住的时刻">
          <div className="space-y-5">
            {outline.conflicts.map((c) => (
              <div
                key={c.id}
                className="space-y-2 border-l border-[#e5abb5]/25 pl-4"
              >
                <p className="text-sm text-white/90">{c.situation}</p>
                {(c.selfMove || c.otherMove) && (
                  <p className="text-xs leading-relaxed text-white/55">
                    {c.selfMove && <>你：{c.selfMove}　</>}
                    {c.otherMove && <>他/她：{c.otherMove}</>}
                  </p>
                )}
                <p className="text-xs leading-relaxed text-[#f3cbd1]/75">
                  伸手没被接住：{c.missedReach}
                </p>
              </div>
            ))}
          </div>
        </Block>
      )}

      {outline.patterns.length > 0 && (
        <Block title="反复出现的">
          <ul className="space-y-1.5">
            {outline.patterns.map((p, i) => (
              <li key={i} className="text-sm text-white/75">
                · {p}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {outline.keyLines.length > 0 && (
        <Block title="你说过的话">
          <div className="space-y-2">
            {outline.keyLines.map((line, i) => (
              <p
                key={i}
                className="border-l-2 border-white/15 pl-3 text-xs italic leading-relaxed text-white/60"
              >
                {line}
              </p>
            ))}
          </div>
        </Block>
      )}

      <p className="pt-2 text-center text-[11px] tracking-[0.2em] text-white/40">
        {BREACH_LABEL[outline.breachType]}
      </p>

      <div className="rounded-md border border-white/10 bg-white/[0.02] p-4 text-center">
        <p className="text-xs leading-relaxed text-white/45">
          下一步：把这些做成一段可以重走的记忆，再陪你把当时没说的话补上。
          <br />
          <span className="text-white/30">（情节生成与心理陪伴还在接线中）</span>
        </p>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-serif text-sm tracking-[0.3em] text-white/55">
        {title}
      </h2>
      {children}
    </div>
  );
}
