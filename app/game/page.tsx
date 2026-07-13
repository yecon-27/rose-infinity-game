"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  STORY,
  getStoryScene,
  Choice,
  Moment,
  Scene,
  Speaker,
} from "@/lib/story";

/* ────────────────────────── 类型 ────────────────────────── */

interface DisplayLine {
  who: Speaker;
  text: string;
}

type Mode = "flow" | "beat" | "done";

/** 玩家这一局的选择足迹(供后续"看见"/回看用) */
interface ChoiceLog {
  sceneId: string;
  momentIdx: number;
  text: string;
  reach: boolean;
}

const LOG_KEY = "rose:choices";

function logChoice(entry: ChoiceLog) {
  if (typeof window === "undefined") return;
  try {
    const prev: ChoiceLog[] = JSON.parse(
      localStorage.getItem(LOG_KEY) ?? "[]"
    );
    prev.push(entry);
    localStorage.setItem(LOG_KEY, JSON.stringify(prev));
  } catch {
    /* 忽略存储失败 */
  }
}

/* ────────────────────────── 打字机 ────────────────────────── */

function useTypewriter(text: string, cps = 36) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
  }, [text]);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((v) => v + 1), 1000 / cps);
    return () => clearTimeout(t);
  }, [n, text, cps]);
  return { shown: text.slice(0, n), done: n >= text.length, skip: () => setN(text.length) };
}

/* ────────────────────────── 页面 ────────────────────────── */

export default function GamePage() {
  return (
    <Suspense fallback={null}>
      <GameInner />
    </Suspense>
  );
}

function GameInner() {
  const router = useRouter();
  const params = useSearchParams();
  const sceneId = params.get("scene") ?? STORY[0].id;
  const scene: Scene = getStoryScene(sceneId) ?? STORY[0];
  const script = scene.script;

  const [idx, setIdx] = useState(0);
  const [queue, setQueue] = useState<DisplayLine[]>([]);
  const [mode, setMode] = useState<Mode>("flow");
  const [optIdx, setOptIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [chapterCard, setChapterCard] = useState(true);

  const historyRef = useRef<Array<{ role: "vera" | "sean"; text: string }>>([]);

  /* 进入新场景:重置 */
  useEffect(() => {
    setIdx(0);
    setQueue([]);
    setMode("flow");
    setOptIdx(0);
    setLoading(false);
    setChapterCard(true);
    historyRef.current = [];
    const t = setTimeout(() => setChapterCard(false), 2400);
    return () => clearTimeout(t);
  }, [sceneId]);

  const current = queue[0];
  const tw = useTypewriter(current?.text ?? "");

  /* 引擎:队列空且 flow 时,消化下一个 moment */
  useEffect(() => {
    if (chapterCard || loading || queue.length > 0 || mode !== "flow") return;
    const m: Moment | undefined = script[idx];
    if (!m) {
      setMode("done");
      return;
    }
    if (m.kind === "narr") {
      setQueue([{ who: "narr", text: m.text }]);
      setIdx((i) => i + 1);
    } else if (m.kind === "line") {
      setQueue([{ who: m.who, text: m.text }]);
      historyRef.current.push({ role: m.who, text: m.text });
      setIdx((i) => i + 1);
    } else if (m.kind === "beat") {
      setOptIdx(0);
      setMode("beat");
    }
  }, [idx, queue.length, mode, chapterCard, loading, script]);

  /* 推进对话框 */
  const advance = useCallback(() => {
    if (chapterCard || loading || mode === "beat") return;
    if (queue.length > 0) {
      if (!tw.done) tw.skip();
      else setQueue((q) => q.slice(1));
    } else if (mode === "done") {
      router.push("/");
    }
  }, [chapterCard, loading, mode, queue.length, tw, router]);

  /* 玩家做出选择 */
  const npcRole: "vera" | "sean" = scene.pov === "sean" ? "vera" : "sean";
  const playerRole: "vera" | "sean" = scene.pov === "sean" ? "sean" : "vera";

  const choose = useCallback(
    async (choice: Choice) => {
      if (mode !== "beat" || loading) return;
      const m = script[idx];
      if (!m || m.kind !== "beat") return;

      logChoice({
        sceneId: scene.id,
        momentIdx: idx,
        text: choice.text,
        reach: !!choice.reach,
      });
      historyRef.current.push({ role: playerRole, text: choice.text });

      // 先显示玩家这一句
      const playerLine: DisplayLine = { who: playerRole, text: choice.text };

      if (choice.reply && choice.reply.length) {
        const lines = [playerLine];
        for (const r of choice.reply) {
          lines.push({ who: r.who, text: r.text });
          if (r.who === "vera" || r.who === "sean")
            historyRef.current.push({ role: r.who, text: r.text });
        }
        setQueue(lines);
        setMode("flow");
        setIdx((i) => i + 1);
        return;
      }

      // 没写死回应 → 交给 AI 生成对方的话
      setLoading(true);
      setQueue([playerLine]);
      setMode("flow");
      try {
        const res = await fetch("/api/npc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: {
              persona: npcRole,
              phase: scene.phase,
              sceneId: scene.id,
              sceneBrief: scene.brief,
              situation: m.situation,
              direction: choice.direction,
              partnerSpoken: choice.text,
              dialogueHistory: historyRef.current.slice(0, -1),
            },
          }),
        });
        const data = await res.json();
        const reply: string = data?.ok ? data.reply : "……";
        historyRef.current.push({ role: npcRole, text: reply });
        setQueue((q) => [...q, { who: npcRole, text: reply }]);
      } catch {
        setQueue((q) => [...q, { who: npcRole, text: "……" }]);
      } finally {
        setLoading(false);
        setIdx((i) => i + 1);
      }
    },
    [mode, loading, script, idx, scene, playerRole, npcRole]
  );

  /* 键盘 */
  const beatMoment =
    mode === "beat" && script[idx]?.kind === "beat"
      ? (script[idx] as Extract<Moment, { kind: "beat" }>)
      : null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (chapterCard || loading) return;
      if (beatMoment) {
        const n = beatMoment.choices.length;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          setOptIdx((i) => (i + 1) % n);
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          setOptIdx((i) => (i - 1 + n) % n);
        } else if (e.key === "Enter") {
          e.preventDefault();
          choose(beatMoment.choices[optIdx]);
        } else if (Number(e.key) >= 1 && Number(e.key) <= n) {
          e.preventDefault();
          choose(beatMoment.choices[Number(e.key) - 1]);
        }
        return;
      }
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beatMoment, optIdx, choose, advance, chapterCard, loading]);

  /* ────────────────────────── 渲染 ────────────────────────── */

  const veraPortrait = "/images/characters/vera-warm.png";
  const seanPortrait = scene.npcPortrait ?? "/images/characters/sean-warm.png";
  const speaker = current?.who;

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black"
      onClick={advance}
    >
      {/* 背景 */}
      <div className="fixed inset-0 z-0">
        <Image src={scene.bg} alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-black/80" />
      </div>

      {/* 立绘:Vera(左) + Sean(右),高亮当前说话者 */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div
          className="absolute bottom-0 left-2 h-[62vh] w-[30vw] max-w-[340px] min-w-[160px] transition-opacity duration-500"
          style={{ opacity: speaker === playerRole ? 1 : 0.4 }}
        >
          <Image
            src={veraPortrait}
            alt="Vera"
            fill
            className="object-contain object-bottom drop-shadow-2xl"
          />
        </div>
        <div
          className="absolute bottom-0 right-2 h-[62vh] w-[30vw] max-w-[340px] min-w-[160px] transition-opacity duration-500"
          style={{ opacity: speaker === npcRole ? 1 : 0.4 }}
        >
          <Image
            src={seanPortrait}
            alt="Sean"
            fill
            className="object-contain object-bottom drop-shadow-2xl"
          />
        </div>
      </div>

      {/* 章节卡 */}
      {chapterCard && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center fade-in-slow">
          <h2 className="text-3xl font-serif text-white/90 tracking-[0.2em]">
            {scene.title}
          </h2>
        </div>
      )}

      {/* 顶部幕名 */}
      <header className="relative z-20 pt-5 text-center">
        <p className="text-xs tracking-[0.3em] text-white/70">{scene.title}</p>
      </header>

      {/* 底部:对话框 or 选择 */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-6 pb-10">
        <div className="mx-auto max-w-2xl">
          {/* 选择 */}
          {beatMoment ? (
            <div
              className="space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white/70 text-sm leading-loose mb-2 text-center">
                {beatMoment.prompt}
              </p>
              {beatMoment.choices.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setOptIdx(i)}
                  onClick={() => choose(c)}
                  disabled={loading}
                  className={`block w-full text-left px-5 py-3 border text-sm leading-relaxed transition-colors ${
                    i === optIdx
                      ? "border-white bg-white/10 text-white"
                      : "border-white/25 text-white/75 hover:border-white/60"
                  }`}
                >
                  {c.text}
                </button>
              ))}
            </div>
          ) : current ? (
            <div className="bg-black/55 backdrop-blur-sm border border-white/10 rounded px-6 py-5 min-h-[7rem] cursor-pointer">
              {current.who !== "narr" && (
                <p
                  className={`text-xs tracking-[0.3em] mb-2 ${
                    current.who === npcRole ? "text-accent" : "text-white/80"
                  }`}
                >
                  {current.who === "sean" ? "Sean" : "Vera"}
                </p>
              )}
              <p
                className={`leading-loose ${
                  current.who === "narr"
                    ? "text-white/70 italic text-center"
                    : "text-white/95"
                }`}
              >
                {tw.shown}
              </p>
            </div>
          ) : mode === "done" ? (
            <div className="text-center space-y-4 cursor-pointer">
              <p className="text-white/80 tracking-[0.2em]">本章结束</p>
              <p className="text-white/40 text-xs tracking-[0.3em]">
                空格 / 点击 回到首页
              </p>
            </div>
          ) : null}

          {/* 提示行 */}
          {!beatMoment && current && (
            <p className="mt-3 text-center text-[10px] tracking-[0.3em] text-white/30 soft-pulse">
              {loading ? "……" : tw.done ? "空格 / 点击 继续" : ""}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
