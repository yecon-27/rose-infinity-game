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
import { useVoice } from "@/lib/use-voice";

/* ────────────────────────── 类型 ────────────────────────── */

interface DisplayLine {
  who: Speaker;
  text: string;
  /** 这句显示时,说话者切换到的表情(emotion key) */
  face?: string;
}

type Mode = "flow" | "beat" | "done";

/* Vera 立绘:按情绪切换,默认表情由周目决定
 *  - 一周目(现场,玩家=Vera,pov=vera)默认 composed(压着情绪的平静)
 *  - 二周目/回看(视角对调,pov=sean)默认 wistful(回忆里的怅然)
 *  - 特定情感拍可被剧情临时覆盖为 warm(如被接住、和解的瞬间)
 */
const VERA_EMOTIONS: Record<string, string> = {
  composed: "/images/characters/vera-composed.png",
  wistful: "/images/characters/vera-wistful.png",
  warm: "/images/characters/vera-warm.png",
};
const veraDefaultEmotion = (pov?: string) =>
  pov === "sean" ? "wistful" : "composed";
const SEAN_FACES: Record<string, string> = {
  warm: "/images/characters/sean-warm.png",
  focused: "/images/characters/sean-focused.png",
  tired: "/images/characters/sean-tired.png",
  guilty: "/images/characters/sean-guilty.png",
};

/**
 * 立绘 · 交叉淡入
 * 换表情时:旧脸淡出、新脸同时淡入(叠着过渡),读作"表情变化"而不是"换了张图"。
 * active=false 时整体压暗,表示此刻不是说话者。
 */
function Portrait({
  src,
  alt,
  active,
  side,
}: {
  src: string;
  alt: string;
  active: boolean;
  side: "left" | "right";
}) {
  const [layers, setLayers] = useState<Array<{ id: number; src: string }>>([
    { id: 0, src },
  ]);
  const idRef = useRef(0);
  useEffect(() => {
    setLayers((prev) => {
      if (prev[prev.length - 1].src === src) return prev;
      idRef.current += 1;
      return [...prev, { id: idRef.current, src }].slice(-2);
    });
  }, [src]);
  return (
    <div
      className={`absolute bottom-0 ${
        side === "left" ? "left-2" : "right-2"
      } h-[62vh] w-[30vw] max-w-[340px] min-w-[160px] transition-opacity duration-500`}
      style={{ opacity: active ? 1 : 0.4 }}
    >
      {layers.map((l, i) => {
        const top = i === layers.length - 1;
        return (
          <Image
            key={l.id}
            src={l.src}
            alt={alt}
            fill
            className={`object-contain object-bottom drop-shadow-2xl ${
              top ? "fade-in" : ""
            }`}
            style={
              top ? undefined : { opacity: 0, transition: "opacity 700ms ease" }
            }
          />
        );
      })}
    </div>
  );
}

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
  const [entering, setEntering] = useState(true);
  const [bg, setBg] = useState(scene.bg);
  const [veraEmotion, setVeraEmotion] = useState(
    scene.veraFace ?? veraDefaultEmotion(scene.pov)
  );
  const [seanEmotion, setSeanEmotion] = useState(scene.seanFace ?? "warm");

  const historyRef = useRef<Array<{ role: "vera" | "sean"; text: string }>>([]);

  /* 进入新场景:重置 */
  useEffect(() => {
    setIdx(0);
    setQueue([]);
    setMode("flow");
    setOptIdx(0);
    setLoading(false);
    setEntering(true);
    setBg(scene.bg);
    setVeraEmotion(scene.veraFace ?? veraDefaultEmotion(scene.pov));
    setSeanEmotion(scene.seanFace ?? "warm");
    historyRef.current = [];
    // 2200ms:与 .memory-focus / .memory-title 动画时长一致,画面对焦完成、幕名隐去后再放行。
    const t = setTimeout(() => setEntering(false), 2200);
    return () => clearTimeout(t);
  }, [sceneId]);

  const current = queue[0];
  const tw = useTypewriter(current?.text ?? "");
  const voice = useVoice();

  /* 配音：当前台词开始显示时播对应音频（没生成的句子静默跳过） */
  useEffect(() => {
    if (current) voice.play(current.who, current.text);
  }, [current, voice.play]);

  /* 表情随当前显示的台词切换 */
  useEffect(() => {
    if (!current?.face) return;
    if (current.who === "sean") setSeanEmotion(current.face);
    else if (current.who === "vera") setVeraEmotion(current.face);
  }, [current]);

  /* 引擎:队列空且 flow 时,消化下一个 moment */
  useEffect(() => {
    if (entering || loading || queue.length > 0 || mode !== "flow") return;
    const m: Moment | undefined = script[idx];
    if (!m) {
      setMode("done");
      return;
    }
    if (m.kind === "narr") {
      setQueue([{ who: "narr", text: m.text }]);
      setIdx((i) => i + 1);
    } else if (m.kind === "bg") {
      setBg(m.src);
      setIdx((i) => i + 1);
    } else if (m.kind === "line") {
      setQueue([{ who: m.who, text: m.text, face: m.face }]);
      historyRef.current.push({ role: m.who, text: m.text });
      setIdx((i) => i + 1);
    } else if (m.kind === "face") {
      if (m.who === "sean") setSeanEmotion(m.emotion);
      else setVeraEmotion(m.emotion);
      setIdx((i) => i + 1);
    } else if (m.kind === "beat") {
      setOptIdx(0);
      setMode("beat");
    }
  }, [idx, queue.length, mode, entering, loading, script]);

  /* 推进对话框 */
  const advance = useCallback(() => {
    if (entering || loading || mode === "beat") return;
    if (queue.length > 0) {
      if (!tw.done) tw.skip();
      else setQueue((q) => q.slice(1));
    } else if (mode === "done") {
      router.push(scene.onDone ?? "/");
    }
  }, [entering, loading, mode, queue.length, tw, router, scene]);

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
      historyRef.current.push({ role: playerRole, text: choice.say ?? choice.text });

      // 先显示玩家这一句（say 为说出口的纯净台词，缺省回退到选项文案）
      const playerLine: DisplayLine = {
        who: playerRole,
        text: choice.say ?? choice.text,
        face: choice.face,
      };

      const afterLines: DisplayLine[] = (choice.after ?? []).map((a) => ({
        who: a.who,
        text: a.text,
        face: a.face,
      }));

      if (choice.reply && choice.reply.length) {
        const lines = [playerLine];
        for (const r of choice.reply) {
          lines.push({ who: r.who, text: r.text, face: r.face });
          if (r.who === "vera" || r.who === "sean")
            historyRef.current.push({ role: r.who, text: r.text });
        }
        for (const a of afterLines) {
          lines.push(a);
          if (a.who === "vera" || a.who === "sean")
            historyRef.current.push({ role: a.who, text: a.text });
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
              partnerSpoken: choice.say ?? choice.text,
              dialogueHistory: historyRef.current.slice(0, -1),
            },
          }),
        });
        const data = await res.json();
        const reply: string = data?.ok ? data.reply : "……";
        historyRef.current.push({ role: npcRole, text: reply });
        for (const a of afterLines) {
          if (a.who === "vera" || a.who === "sean")
            historyRef.current.push({ role: a.who, text: a.text });
        }
        setQueue((q) => [...q, { who: npcRole, text: reply }, ...afterLines]);
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

  /* 配音：进入选择节拍时读引导语 */
  useEffect(() => {
    if (beatMoment) voice.play("narr", beatMoment.prompt);
  }, [beatMoment, voice.play]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (entering || loading) return;
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
  }, [beatMoment, optIdx, choose, advance, entering, loading]);

  /* ────────────────────────── 渲染 ────────────────────────── */

  const veraPortrait =
    VERA_EMOTIONS[veraEmotion] ?? VERA_EMOTIONS[veraDefaultEmotion(scene.pov)];
  const seanPortrait = SEAN_FACES[seanEmotion] ?? SEAN_FACES.warm;
  const speaker = current?.who;

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black"
      onClick={advance}
    >
      {/* 背景 */}
      <div className={`fixed inset-0 z-0 ${entering ? "memory-focus" : ""}`}>
        <Image
          key={bg}
          src={bg}
          alt=""
          fill
          priority
          className="object-cover fade-in-slow"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-black/80" />
      </div>

      {/* 立绘:Vera + Sean,表情交叉淡入,高亮当前说话者
       * 一周目(pov=vera)交换站位:Sean 在左、Vera 在右;二周目恢复默认。 */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <Portrait
          src={veraPortrait}
          alt="Vera"
          active={speaker === "vera"}
          side={scene.pov === "vera" ? "right" : "left"}
        />
        <Portrait
          src={seanPortrait}
          alt="Sean"
          active={speaker === "sean"}
          side={scene.pov === "vera" ? "left" : "right"}
        />
      </div>

      {/* 进场:记忆对焦时,幕名浮在正在清晰的画面上,再隐去(不经过纯黑) */}
      {entering && (
        <div className="memory-title fixed inset-0 z-40 flex items-center justify-center pointer-events-none bg-black/25">
          <h2 className="text-3xl font-serif text-white/95 tracking-[0.25em] drop-shadow-lg">
            {scene.title}
          </h2>
        </div>
      )}

      {/* 顶部幕名 */}
      <header className="relative z-20 pt-5 text-center">
        <p className="text-xs tracking-[0.3em] text-white/70">{scene.title}</p>
      </header>

      {/* 声音开关 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          voice.toggleMuted();
        }}
        className="fixed top-5 right-5 z-50 text-[10px] tracking-widest text-white/35 hover:text-white/80 transition-colors"
      >
        {voice.muted ? "声 · 关" : "声 · 开"}
      </button>

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
                空格 / 点击 继续
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
