"use client";

/**
 * Agent E · 用户自述故事全流程
 *   input   写下你自己的故事 → /api/deconstruct(A)
 *   outline 显形拆解结果 → /api/generate-scenes(B) 生成可玩记忆 → 重走(game 引擎)
 *   buddy   /api/counsel(D) 心理陪伴，一步步聊到感情复盘修复
 * 跨页状态存在 lib/create-session。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearChoiceLog, readChoiceLog } from "@/lib/choice-log";
import {
  clearCreateSession,
  patchCreateSession,
  readCreateSession,
  startCreateSession,
} from "@/lib/create-session";
import { withMappedBg } from "@/lib/scene-media";
import type {
  CounselTurn,
  GeneratedGame,
  StoryOutline,
} from "@/lib/generated-story";

type Step = "input" | "outline" | "buddy";

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
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [story, setStory] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [outline, setOutline] = useState<StoryOutline | null>(null);
  const [thin, setThin] = useState(false);

  const [genStatus, setGenStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [game, setGame] = useState<GeneratedGame | null>(null);

  const [turns, setTurns] = useState<CounselTurn[]>([]);
  const [buddyLoading, setBuddyLoading] = useState(false);
  const [reflection, setReflection] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [pendingReset, setPendingReset] = useState(false);
  const buddyKicked = useRef(false);

  // 清掉这一局，回到空白输入，重新写一段
  const restart = useCallback(() => {
    clearCreateSession();
    clearChoiceLog();
    setStory("");
    setOutline(null);
    setThin(false);
    setGame(null);
    setGenStatus("idle");
    setTurns([]);
    setReflection(null);
    setReply("");
    setPendingReset(false);
    buddyKicked.current = false;
    setStep("input");
    router.replace("/create");
  }, [router]);

  // 从游戏重走回来（?step=buddy）或刷新时，恢复这一局
  useEffect(() => {
    const s = readCreateSession();
    if (!s) return;
    setStory(s.story);
    setOutline(s.outline);
    if (s.game) {
      setGame(s.game);
      setGenStatus("ready");
    }
    if (s.counsel?.length) setTurns(s.counsel);
    const wantBuddy =
      new URLSearchParams(window.location.search).get("step") === "buddy";
    setStep(wantBuddy ? "buddy" : "outline");
  }, []);

  const advanceBuddy = useCallback(
    async (base: CounselTurn[]) => {
      if (!outline) return;
      setBuddyLoading(true);
      try {
        const res = await fetch("/api/counsel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outline,
            choices: readChoiceLog(),
            turns: base,
          }),
        });
        const data = await res.json();
        if (data?.ok && data.turn) {
          const next = [...base, data.turn as CounselTurn];
          setTurns(next);
          patchCreateSession({ counsel: next });
          if (data.done && data.reflection) setReflection(data.reflection);
        }
      } catch {
        // buddy 兜底由后端保证，这里静默即可
      } finally {
        setBuddyLoading(false);
      }
    },
    [outline]
  );

  // 进入 buddy 且还没开口时，让 buddy 先说第一句
  useEffect(() => {
    if (step === "buddy" && outline && !buddyKicked.current && turns.length === 0) {
      buddyKicked.current = true;
      void advanceBuddy([]);
    }
  }, [step, outline, turns.length, advanceBuddy]);

  const submitStory = useCallback(async () => {
    const trimmed = story.trim();
    if (!trimmed || status === "loading") return;
    setStatus("loading");
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
      startCreateSession(trimmed, next);
      setStatus("idle");
      setStep("outline");
    } catch {
      setStatus("error");
    }
  }, [story, status]);

  const generate = useCallback(async () => {
    if (!outline || genStatus === "loading") return;
    setGenStatus("loading");
    try {
      const res = await fetch("/api/generate-scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline }),
      });
      const data = await res.json();
      if (data?.scenes?.length && data.entrySceneId) {
        // 画面托底：把兜底的 title_keyart 换成贴题的真实场景图
        const g = withMappedBg(data as GeneratedGame);
        setGame(g);
        patchCreateSession({ game: g });
        setGenStatus("ready");
      } else {
        setGenStatus("error");
      }
    } catch {
      setGenStatus("error");
    }
  }, [outline, genStatus]);

  return (
    <main className="relative min-h-screen bg-black px-6 py-12 text-white/85">
      {/* 背景：深夜房间，重压暗保住小字号正文的可读性 */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/scenes/dorm-room-night.webp"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/80" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl space-y-8">
        {step !== "buddy" && (
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
        )}

        {step === "input" && (
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
                onClick={submitStory}
                disabled={!story.trim() || status === "loading"}
                className="flex h-11 items-center justify-center border border-[#e5abb5]/40 bg-[#7b3f4b]/20 px-8 text-[12px] tracking-[0.32em] text-[#f3cbd1]/90 transition-all duration-500 hover:border-[#efbec6]/60 hover:bg-[#8e4b58]/30 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {status === "loading" ? "读 着 …" : "让 它 显 形"}
              </button>
            </div>
            {status === "error" && (
              <p className="text-center text-xs text-white/50">
                这一下没接住。歇口气，再试一次。
              </p>
            )}
          </section>
        )}

        {step === "outline" && outline && (
          <>
            <OutlineView outline={outline} thin={thin} />
            <section className="space-y-4 border-t border-white/10 pt-8">
              {genStatus !== "ready" && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={generate}
                    disabled={genStatus === "loading"}
                    className="h-11 border border-[#e5abb5]/40 bg-[#7b3f4b]/20 px-8 text-[12px] tracking-[0.28em] text-[#f3cbd1]/90 transition-all duration-500 hover:border-[#efbec6]/60 hover:bg-[#8e4b58]/30 disabled:opacity-40"
                  >
                    {genStatus === "loading"
                      ? "生 成 着 …"
                      : "做成一段可以重走的记忆"}
                  </button>
                  {genStatus === "error" && (
                    <p className="mt-3 text-xs text-white/50">
                      生成没成，再试一次。
                    </p>
                  )}
                </div>
              )}

              {genStatus === "ready" && game && (
                <div className="space-y-3">
                  <p className="text-center text-xs text-white/55">
                    生成了 {game.scenes.length} 段记忆。你可以重走一遍，也可以直接聊聊。
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/game?scene=${game.entrySceneId}`)
                      }
                      className="h-11 border border-white/25 bg-white/[0.04] px-8 text-[12px] tracking-[0.28em] text-white/85 transition-all duration-500 hover:border-white/50"
                    >
                      重 走 这 段 记 忆
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("buddy")}
                      className="h-11 border border-[#e5abb5]/40 bg-[#7b3f4b]/20 px-8 text-[12px] tracking-[0.28em] text-[#f3cbd1]/90 transition-all duration-500 hover:border-[#efbec6]/60 hover:bg-[#8e4b58]/30"
                    >
                      直 接 和 陪 伴 聊 聊
                    </button>
                  </div>
                </div>
              )}
            </section>

            <div className="flex items-center justify-between border-t border-white/10 pt-6">
              <Link
                href="/"
                className="text-[11px] tracking-[0.2em] text-white/40 transition-colors hover:text-white/70"
              >
                ← 回首页
              </Link>
              {pendingReset ? (
                <div className="flex items-center gap-4 text-[11px] tracking-[0.12em]">
                  <span className="text-white/45">
                    这一局的显形和聊过的话都会清掉。
                  </span>
                  <button
                    type="button"
                    onClick={restart}
                    className="text-[#f3cbd1]/85 transition-colors hover:text-[#ffe5e9]"
                  >
                    清掉重写
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingReset(false)}
                    className="text-white/40 transition-colors hover:text-white/70"
                  >
                    先不
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingReset(true)}
                  className="text-[11px] tracking-[0.2em] text-white/40 transition-colors hover:text-white/70"
                >
                  换一段重新写
                </button>
              )}
            </div>
          </>
        )}

        {step === "buddy" && (
          <BuddyPanel
            turns={turns}
            loading={buddyLoading}
            reflection={reflection}
            reply={reply}
            onReplyChange={setReply}
            onSend={() => {
              const t = reply.trim();
              if (!t || buddyLoading || reflection) return;
              const base = [...turns, { role: "user", text: t } as CounselTurn];
              setTurns(base);
              setReply("");
              void advanceBuddy(base);
            }}
            onHome={() => router.push("/")}
            onRestart={restart}
          />
        )}
      </div>
    </main>
  );
}

function BuddyPanel({
  turns,
  loading,
  reflection,
  reply,
  onReplyChange,
  onSend,
  onHome,
  onRestart,
}: {
  turns: CounselTurn[];
  loading: boolean;
  reflection: string | null;
  reply: string;
  onReplyChange: (v: string) => void;
  onSend: () => void;
  onHome: () => void;
  onRestart: () => void;
}) {
  return (
    <section className="space-y-6">
      <header className="text-center">
        <h1 className="font-serif text-2xl tracking-[0.2em] text-white">
          陪你把它说清楚
        </h1>
      </header>

      <div className="space-y-4">
        {turns.map((t, i) => (
          <div
            key={i}
            className={t.role === "buddy" ? "text-left" : "text-right"}
          >
            <p
              className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                t.role === "buddy"
                  ? "bg-[#7b3f4b]/20 text-[#f7dbe0]/90"
                  : "bg-white/[0.06] text-white/85"
              }`}
            >
              {t.text}
            </p>
          </div>
        ))}
        {loading && (
          <p className="text-left text-xs tracking-widest text-white/35">
            陪伴在想 …
          </p>
        )}
      </div>

      {reflection ? (
        <div className="space-y-5 border-t border-white/10 pt-6">
          <h2 className="text-center font-serif text-sm tracking-[0.3em] text-white/55">
            这一页写给你
          </h2>
          {reflection.split(/\n+/).map((p, i) => (
            <p key={i} className="text-sm leading-loose text-white/80">
              {p}
            </p>
          ))}
          <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onHome}
              className="h-11 border border-white/25 bg-white/[0.04] px-8 text-[12px] tracking-[0.28em] text-white/80 transition-all duration-500 hover:border-white/50"
            >
              回 首 页
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="h-11 border border-[#e5abb5]/40 bg-[#7b3f4b]/20 px-8 text-[12px] tracking-[0.28em] text-[#f3cbd1]/90 transition-all duration-500 hover:border-[#efbec6]/60 hover:bg-[#8e4b58]/30"
            >
              再 写 一 段
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-3 border-t border-white/10 pt-5">
          <textarea
            value={reply}
            onChange={(e) => onReplyChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="说说你的想法……"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-md border border-white/15 bg-white/[0.03] p-3 text-sm leading-relaxed text-white/90 placeholder:text-white/30 focus:border-[#efbec6]/50 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!reply.trim() || loading}
            className="h-11 shrink-0 border border-[#e5abb5]/40 bg-[#7b3f4b]/20 px-6 text-[12px] tracking-[0.24em] text-[#f3cbd1]/90 transition-all duration-500 hover:border-[#efbec6]/60 disabled:opacity-35"
          >
            说
          </button>
        </div>
      )}
    </section>
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
              <li
                key={i}
                className="flex items-center gap-3 text-sm text-white/80"
              >
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
    </section>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-serif text-sm tracking-[0.3em] text-white/55">
        {title}
      </h2>
      {children}
    </div>
  );
}
