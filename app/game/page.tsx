"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  applyCentering,
  hasExposure,
  zoneOf,
  PIERCE_THRESHOLD,
} from "@/lib/intensity";
import {
  loadRelationship,
  RelationshipState,
  saveRelationship,
  saveSceneRecord,
  TurnIntensity,
  TurnRecord,
} from "@/lib/playthrough";
import {
  getScene,
  nextScene,
  ACT_SEQUENCE,
  ActivitySpec,
  Hotspot,
  Moment,
  Scene,
  TalkSpec,
} from "@/lib/scenes";

/* ────────────────────────── 类型 ────────────────────────── */

/** 底部对话框里的一条内容 */
interface DisplayLine {
  speaker: "narr" | "amo" | "chen" | "inner" | "observe" | "hint";
  label?: string;
  note?: string;
  text: string;
}

type Mode = "flow" | "explore" | "activity" | "talk" | "done";

interface Toast {
  key: number;
  text: string;
  tone: "closer" | "farther" | "pierce" | "unlock";
}

/** 抉择倒计时(秒)。超时 = 沉默 */
const CHOICE_SECONDS = 20;

/** 过滤器裂纹落点(集中在阿默那一侧) */
const CRACK_SPOTS = [
  { x: 63, y: 40, r: 10, s: 1 },
  { x: 71, y: 56, r: -40, s: 0.75 },
  { x: 56, y: 30, r: 65, s: 0.9 },
  { x: 76, y: 38, r: 150, s: 1.1 },
  { x: 66, y: 64, r: 210, s: 0.8 },
  { x: 59, y: 50, r: 100, s: 0.7 },
];

const CRACK_PATHS = [
  "M50 50 L60 41 L64 42 M50 50 L41 42 L39 34 M50 50 L58 60 L66 63 M50 50 L42 58 L36 59 M50 50 L51 63",
  "M50 50 L63 47 M50 50 L44 39 L45 31 M50 50 L39 55 M50 50 L55 62 L53 70 M50 50 L58 55 L67 58",
];

/* ────────────────────────── 打字机 hook ────────────────────────── */

function useTypewriter(text: string, cps = 34) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
  }, [text]);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((v) => v + 1), 1000 / cps);
    return () => clearTimeout(t);
  }, [n, text, cps]);
  return {
    shown: text.slice(0, n),
    done: n >= text.length,
    skip: () => setN(text.length),
  };
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
  const searchParams = useSearchParams();
  const sceneId = searchParams.get("scene") ?? ACT_SEQUENCE[0].id;
  const scene: Scene = getScene(sceneId) ?? ACT_SEQUENCE[0];
  const script = scene.script;

  /* 引擎状态 */
  const [idx, setIdx] = useState(0);
  const [pending, setPending] = useState<DisplayLine[]>([]);
  const [mode, setMode] = useState<Mode>("flow");
  const [chapterCard, setChapterCard] = useState(true);
  const [rel, setRel] = useState<RelationshipState | null>(null);
  const [turns, setTurns] = useState<TurnRecord[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* 探索 */
  const [examined, setExamined] = useState<string[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [chenX, setChenX] = useState(18);
  const [walking, setWalking] = useState(false);

  /* 开口 */
  const [freeInput, setFreeInput] = useState(false);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(CHOICE_SECONDS);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 给 NPC 的对话史(锚点台词 + 往来) */
  const historyRef = useRef<Array<{ role: "chen" | "amo"; text: string }>>([]);
  /** 穿透且说了真话:跳过默认收尾,走 piercedClosing */
  const piercedExitRef = useRef(false);

  /* 每次进入新的一幕:章节卡 + 全量重置 */
  useEffect(() => {
    setChapterCard(true);
    setIdx(0);
    setPending([]);
    setMode("flow");
    setTurns([]);
    setError(null);
    setExamined([]);
    setFocusIdx(0);
    setUnlocked([]);
    setChenX(18);
    setWalking(false);
    setFreeInput(false);
    setInput("");
    historyRef.current = [];
    piercedExitRef.current = false;
    if (walkTimer.current) clearTimeout(walkTimer.current);
    const t = setTimeout(() => setChapterCard(false), 2900);
    return () => clearTimeout(t);
  }, [sceneId]);

  /* 关系状态:幕一 = 新的一局 */
  useEffect(() => {
    if (sceneId === ACT_SEQUENCE[0].id) {
      const fresh: RelationshipState = {
        balance: 40,
        distance: 50,
        exposureCount: 0,
        pierced: false,
        pierceExposed: false,
      };
      saveRelationship(fresh);
      setRel(fresh);
    } else {
      setRel(loadRelationship());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId]);

  const balance = rel?.balance ?? 40;
  const cracks = rel?.exposureCount ?? 0;

  /* 当前时刻 */
  const moment: Moment | undefined = script[idx];
  const currentLine = pending[0];
  const tw = useTypewriter(currentLine?.text ?? "");

  /* 当前 talk 是否穿透 */
  const activeTalk: TalkSpec | null =
    mode === "talk" && moment?.kind === "talk" ? moment.talk : null;
  const pierceActive =
    !!activeTalk?.pierceable && cracks >= PIERCE_THRESHOLD;

  /* 立绘 */
  const lastTurn = turns[turns.length - 1];
  const chenPortrait = !lastTurn
    ? "/images/characters/chen.png"
    : lastTurn.intensity === "high" || lastTurn.intensity === "anxious"
      ? "/images/characters/chen-avoidant.png"
      : "/images/characters/chen-vulnerable.png";
  const amoPortrait = scene.amoPortrait ?? "/images/characters/amo.png";

  function updateRel(mut: (r: RelationshipState) => RelationshipState) {
    setRel((prev) => {
      if (!prev) return prev;
      const next = mut({ ...prev });
      saveRelationship(next);
      return next;
    });
  }

  function showToast(t: Omit<Toast, "key">) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ ...t, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  /* ── 引擎:pending 清空且处于 flow 时,消化下一个时刻 ── */
  useEffect(() => {
    if (chapterCard || loading || pending.length > 0 || mode !== "flow")
      return;
    const m = script[idx];
    if (!m) {
      setMode("done");
      return;
    }
    switch (m.kind) {
      case "narr":
        setPending([{ speaker: "narr", text: m.text }]);
        setIdx((i) => i + 1);
        break;
      case "line":
        setPending([{ speaker: m.speaker, text: m.text }]);
        if (m.speaker === "amo")
          historyRef.current.push({ role: "amo", text: m.text });
        setIdx((i) => i + 1);
        break;
      case "hint":
        setPending([{ speaker: "hint", label: "提示", text: m.text }]);
        setIdx((i) => i + 1);
        break;
      case "shift":
        updateRel((r) => ({
          ...r,
          balance: Math.max(-100, Math.min(100, r.balance + m.delta)),
        }));
        setIdx((i) => i + 1);
        break;
      case "explore":
        setFocusIdx(0);
        setMode("explore");
        break;
      case "activity":
        setMode("activity");
        break;
      case "talk":
        setTimeLeft(CHOICE_SECONDS);
        setMode("talk");
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, pending, mode, chapterCard, loading, script]);

  /* ── 对话框推进 ── */
  const advance = useCallback(() => {
    if (chapterCard || loading) return;
    if (pending.length > 0) {
      if (!tw.done) {
        tw.skip();
      } else {
        setPending((p) => p.slice(1));
      }
    }
  }, [chapterCard, loading, pending.length, tw]);

  /* ── 探索 ── */
  function examine(h: Hotspot) {
    if (examined.includes(h.id) || walking || pending.length > 0) return;
    const target = Math.min(72, Math.max(6, h.x - 5));
    const go = () => doExamine(h);
    if (Math.abs(target - chenX) < 3) {
      go();
      return;
    }
    setWalking(true);
    setChenX(target);
    walkTimer.current = setTimeout(() => {
      setWalking(false);
      go();
    }, 900);
  }

  function doExamine(h: Hotspot) {
    setExamined((prev) => [...prev, h.id]);
    setPending([
      {
        speaker: "observe",
        label: `检视 · ${h.name}`,
        text: h.observation,
      },
    ]);
    if (h.unlocksImpulse && !unlocked.includes(h.unlocksImpulse)) {
      setUnlocked((prev) => [...prev, h.unlocksImpulse!]);
      showToast({ text: "◆ 一句更真的话浮现了", tone: "unlock" });
    }
  }

  function finishExplore() {
    if (walking || pending.length > 0) return;
    setMode("flow");
    setIdx((i) => i + 1);
  }

  /* ── 活动 ── */
  function resolveActivity(spec: ActivitySpec, good: boolean) {
    const outcome = good ? spec.good : spec.bad;
    updateRel((r) => ({
      ...r,
      balance: applyCentering(r.balance, outcome.centering),
    }));
    if (outcome.centering > 0)
      showToast({ text: "天平 · 往安稳偏了一点", tone: "closer" });
    setPending(
      outcome.lines.map((l) => {
        if (l.speaker === "amo")
          historyRef.current.push({ role: "amo", text: l.text });
        return { speaker: l.speaker, text: l.text } as DisplayLine;
      })
    );
    setMode("flow");
    setIdx((i) => i + 1);
  }

  /* ── 开口 ── */
  const talkOptions = activeTalk
    ? [...unlocked, ...activeTalk.impulses]
    : [];

  /* 倒计时 */
  const silenceRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (mode !== "talk" || loading || pending.length > 0) return;
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        const nt = Math.max(0, t - 0.1);
        if (nt <= 0) {
          clearInterval(iv);
          silenceRef.current();
        }
        return nt;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [mode, loading, pending.length]);

  async function submitTalk(rawText: string, opts: { silence?: boolean } = {}) {
    if (!activeTalk || loading || !rel) return;
    const trimmed = rawText.trim();
    if (!trimmed && !opts.silence) return;

    setLoading(true);
    setError(null);
    setFreeInput(false);

    const zone = zoneOf(rel.balance);
    try {
      let inner: string;
      let spoken: string;
      let kind: TurnIntensity;
      let note: string;
      let tone: "secure" | "avoid" | "anxious" | "pierce";
      let centering = 0;

      if (opts.silence) {
        if (pierceActive) {
          inner = "(过滤器碎了。你却什么都没说。)";
          spoken = "……";
          kind = "pierce";
          tone = "pierce";
          note = "——沉默,也是原话。";
        } else {
          inner = "(话到了嘴边。你在犹豫里,错过了它。)";
          spoken = zone === "anxious" ? "算了,当我没说。" : "……没事。";
          kind = zone === "anxious" ? "anxious" : "high";
          tone = zone === "anxious" ? "anxious" : "avoid";
          note = "——你犹豫得太久,沉默替你做了选择。";
          centering = -15;
        }
      } else if (pierceActive) {
        inner = trimmed;
        spoken = trimmed;
        kind = "pierce";
        tone = "pierce";
        note = "——没有任何东西替你修饰。";
      } else if (zone === "secure") {
        inner = trimmed;
        spoken = trimmed;
        kind = "secure";
        tone = "secure";
        note = "——原话,一字没改。";
        centering = 4;
      } else {
        inner = trimmed;
        const exposing = zone === "avoid" && hasExposure(trimmed);
        const apiIntensity =
          zone === "anxious" ? "anxious" : exposing ? "low" : "high";
        kind = apiIntensity as TurnIntensity;
        tone = zone === "anxious" ? "anxious" : "avoid";
        note =
          zone === "anxious"
            ? "——焦虑抢在你前面开了口。"
            : exposing
              ? "——漏出了一半,又找补了回去。"
              : "——过滤器把它拧了一下。";
        centering = exposing ? 10 : -8;

        const filterRes = await fetch("/api/filter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: trimmed,
            intensity: apiIntensity,
            context: {
              sceneId: scene.id,
              sceneBrief: scene.brief,
              situation: activeTalk.situation,
              amosLastLine: [...historyRef.current]
                .reverse()
                .find((h) => h.role === "amo")?.text,
            },
          }),
        });
        const filterData = await filterRes.json();
        if (!filterData.ok)
          throw new Error(filterData.error || "过滤器调用失败");
        spoken = filterData.spoken;
      }

      historyRef.current.push({ role: "chen", text: spoken });

      const npcRes = await fetch("/api/npc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            sceneId: scene.id,
            sceneBrief: scene.brief,
            situation: activeTalk.situation,
            amoDirection: activeTalk.amoDirection,
            chenSpoken: spoken,
            dialogueHistory: historyRef.current.slice(0, -1),
            balance: rel.balance,
            spokenTone: tone,
            pierced: kind === "pierce",
          },
        }),
      });
      const npcData = await npcRes.json();
      if (!npcData.ok) throw new Error(npcData.error || "NPC 调用失败");
      const amoReply: string = npcData.reply;
      const amoInner: string = npcData.inner ?? "";
      historyRef.current.push({ role: "amo", text: amoReply });

      /* 关系状态更新 */
      const exposedTruth =
        kind === "pierce" ? !opts.silence && hasExposure(trimmed) : false;
      updateRel((r) => {
        const next = { ...r };
        next.balance = applyCentering(next.balance, centering);
        if (kind === "secure") next.exposureCount += 1;
        if (kind === "pierce") {
          next.pierced = true;
          next.pierceExposed = exposedTruth;
        }
        return next;
      });

      showToast(
        kind === "pierce"
          ? { text: "过滤器 · 碎裂", tone: "pierce" }
          : kind === "secure"
            ? { text: "过滤器 · 裂了一道纹", tone: "closer" }
            : kind === "anxious"
              ? { text: "焦虑 · 话变了形", tone: "farther" }
              : { text: "回避 · 话被拧弯了", tone: "farther" }
      );

      setTurns((prev) => [
        ...prev,
        { inner, spoken, amoReply, amoInner, intensity: kind },
      ]);

      /* 播放本轮:内心 → 出口 → 她的回应 */
      const seq: DisplayLine[] = [
        { speaker: "inner", label: "你心里想的", text: inner },
        { speaker: "chen", note, text: spoken },
        { speaker: "amo", text: amoReply },
      ];

      /* 穿透且说了真话:替换默认收尾 */
      if (kind === "pierce" && exposedTruth && scene.piercedClosing) {
        piercedExitRef.current = true;
        seq.push(
          ...scene.piercedClosing.map(
            (t) => ({ speaker: "narr", text: t }) as DisplayLine
          )
        );
        setPending(seq);
        setUnlocked([]);
        setMode("flow");
        setIdx(script.length); // 跳过默认收尾旁白
      } else {
        setPending(seq);
        setUnlocked([]);
        setMode("flow");
        setIdx((i) => i + 1);
      }
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeLeft(CHOICE_SECONDS);
    } finally {
      setLoading(false);
    }
  }
  silenceRef.current = () => submitTalk("", { silence: true });

  /* ── 本幕结束 ── */
  function finishScene() {
    if (turns.length > 0) {
      saveSceneRecord({
        sceneId: scene.id,
        sceneName: scene.name,
        goldenQuote: scene.goldenQuote,
        turns,
        finishedAt: new Date().toISOString(),
      });
    }
    if (scene.isEpilogue) {
      router.push("/ending");
      return;
    }
    const next = nextScene(scene.id);
    if (next) {
      router.push(`/game?scene=${next.id}`);
    } else {
      // 终幕结束 → 按结果选尾声
      const r = rel ?? loadRelationship();
      const epilogue =
        r.pierced && r.pierceExposed ? "epilogue_open" : "epilogue_weathered";
      router.push(`/game?scene=${epilogue}`);
    }
  }

  /* ── 键盘 ── */
  const keyCtx = useRef<(e: KeyboardEvent) => void>(() => {});
  keyCtx.current = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLInputElement
    )
      return;
    if (chapterCard || loading) return;

    /* 对话框有内容:空格/Enter 推进(活动模式的空格留给活动) */
    if (pending.length > 0) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        advance();
      }
      return;
    }

    if (mode === "done") {
      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        finishScene();
      }
      return;
    }

    if (mode === "explore" && moment?.kind === "explore") {
      const spots = moment.hotspots;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx((i) => (i + 1) % spots.length);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIdx((i) => (i - 1 + spots.length) % spots.length);
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (spots[focusIdx]) examine(spots[focusIdx]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        finishExplore();
      }
      return;
    }

    if (mode === "talk") {
      const n = Number(e.key);
      if (n >= 1 && n <= talkOptions.length) {
        e.preventDefault();
        submitTalk(talkOptions[n - 1]);
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        setFreeInput(true);
      }
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyCtx.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ────────────────────────── 渲染 ────────────────────────── */

  const sceneIndex = ACT_SEQUENCE.findIndex((s) => s.id === scene.id) + 1;
  const timerPct = (timeLeft / CHOICE_SECONDS) * 100;
  const needlePct = ((balance + 100) / 200) * 100;
  const closingPierced = piercedExitRef.current;

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* 章节卡 */}
      {chapterCard && (
        <div className="chapter-card fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          {!scene.isEpilogue && (
            <p className="text-[10px] text-white/40 tracking-[0.5em] mb-5">
              {sceneIndex > 0
                ? `${sceneIndex} / ${ACT_SEQUENCE.length}`
                : "· · ·"}
            </p>
          )}
          <h2 className="chapter-title text-3xl font-serif text-white/90">
            {scene.name}
          </h2>
        </div>
      )}

      {/* 背景 */}
      <div className="fixed inset-0 z-0">
        <Image
          src={scene.background}
          alt={scene.name}
          fill
          priority
          className="object-cover ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/35 to-black/70" />
        <div className="absolute inset-0 backdrop-blur-[1px]" />
      </div>

      {/* 立绘:阿沉(可走动) + 阿默(隔着过滤器玻璃) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div
          className={`absolute bottom-0 h-[52vh] w-[24vw] max-w-[280px] min-w-[140px] -translate-x-1/2 ${
            walking ? "walk-bob" : ""
          }`}
          style={{
            left: `${chenX}%`,
            transition: "left 900ms ease-in-out",
            opacity: 0.9,
          }}
        >
          <Image
            src={chenPortrait}
            alt="阿沉"
            fill
            className="object-contain object-bottom drop-shadow-2xl transition-opacity duration-700"
          />
        </div>
        <div
          className={`absolute bottom-0 right-0 w-[35vw] max-w-[400px] min-w-[200px] h-[70vh] transition-all duration-700 ${
            loading ? "scale-[1.02]" : ""
          }`}
          style={{
            filter: rel?.pierced
              ? "blur(0px) brightness(1.05)"
              : `blur(${Math.max(0, 2.4 - cracks * 0.7)}px) brightness(${
                  loading ? 1.08 : 0.92
                })`,
            transition: "filter 900ms ease",
          }}
        >
          <Image
            src={amoPortrait}
            alt="阿默"
            fill
            className="object-contain object-bottom drop-shadow-2xl"
          />
        </div>
      </div>

      {/* 过滤器玻璃裂纹 */}
      {rel && (cracks > 0 || rel.pierced) && (
        <div
          className={`fixed inset-0 z-[12] pointer-events-none ${
            rel.pierced ? "shatter-out" : ""
          }`}
        >
          {CRACK_SPOTS.slice(
            0,
            Math.min(
              rel.pierced ? Math.max(cracks, 3) : cracks,
              CRACK_SPOTS.length
            )
          ).map((c, i) => (
            <svg
              key={i}
              viewBox="0 0 100 100"
              className="crack-in absolute w-28 h-28"
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                transform: `translate(-50%, -50%) rotate(${c.r}deg) scale(${c.s})`,
              }}
            >
              <path
                d={CRACK_PATHS[i % CRACK_PATHS.length]}
                fill="none"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              <path
                d={CRACK_PATHS[i % CRACK_PATHS.length]}
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          ))}
        </div>
      )}

      {/* 检视光点 */}
      {mode === "explore" &&
        moment?.kind === "explore" &&
        pending.length === 0 && (
          <div className="fixed inset-0 z-[25] pointer-events-none">
            {moment.hotspots.map((h, i) => {
              const done = examined.includes(h.id);
              const focused = i === focusIdx;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setFocusIdx(i);
                    examine(h);
                  }}
                  className="group absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                >
                  <span
                    className={`block w-5 h-5 rounded-full border-2 transition-all ${
                      done
                        ? "border-white/25 bg-white/10"
                        : "border-accent bg-accent/20 soft-pulse"
                    } ${focused ? "ring-2 ring-white/80 scale-110" : ""}`}
                  />
                  <span
                    className={`absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tracking-widest text-white bg-black/70 px-2 py-0.5 rounded transition-opacity ${
                      focused
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {h.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

      {/* 状态通知 */}
      {toast && (
        <div
          key={toast.key}
          className={`fixed top-6 right-6 z-40 fade-in px-4 py-2 border backdrop-blur-md text-xs tracking-widest ${
            toast.tone === "closer" || toast.tone === "unlock"
              ? "border-accent/60 bg-black/60 text-accent"
              : toast.tone === "pierce"
                ? "border-white bg-black/80 text-white"
                : "border-white/30 bg-black/60 text-white/60"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* 顶部:幕名 + 情绪天平 */}
      <header className="relative z-20 pt-5 text-center">
        <p className="text-xs tracking-widest text-white/80 uppercase drop-shadow">
          {scene.name}
        </p>
        {!scene.isEpilogue && rel && (
          <div className="mx-auto mt-3 w-60">
            <div className="relative h-1.5 rounded-full overflow-hidden bg-white/10">
              <div className="absolute inset-y-0 left-0 w-[37.5%] bg-red-400/25" />
              <div className="absolute inset-y-0 left-[37.5%] w-[25%] bg-accent/30" />
              <div className="absolute inset-y-0 right-0 w-[37.5%] bg-white/10" />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow transition-all duration-700"
                style={{ left: `${needlePct}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] tracking-[0.3em] text-white/40 mt-1">
              <span>焦虑</span>
              <span className="text-accent/80">安稳</span>
              <span>回避</span>
            </div>
          </div>
        )}
      </header>

      {/* 中部:活动面板 */}
      {mode === "activity" &&
        moment?.kind === "activity" &&
        pending.length === 0 && (
          <ActivityPanel
            key={idx}
            spec={moment.activity}
            onResolve={(good) => resolveActivity(moment.activity, good)}
          />
        )}

      {/* 开口选项(浮在对话框上方) */}
      {mode === "talk" && pending.length === 0 && !loading && activeTalk && (
        <div className="fixed bottom-[13.5rem] left-0 right-0 z-30 px-6">
          <div className="max-w-2xl mx-auto space-y-2">
            {/* 倒计时 */}
            <div className="h-1 bg-white/10 rounded overflow-hidden">
              <div
                className={`h-full ${
                  timerPct < 30 ? "bg-red-400/80" : "bg-accent/80"
                }`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/50">
              <span className={pierceActive ? "text-white" : undefined}>
                {pierceActive
                  ? "过滤器碎了。说什么,就是什么。"
                  : activeTalk.prompt}
              </span>
              <span>犹豫太久,话会自己咽回去</span>
            </div>
            <div className="space-y-1.5">
              {talkOptions.map((im, i) => {
                const isUnlocked = unlocked.includes(im);
                return (
                  <button
                    key={im}
                    type="button"
                    onClick={() => submitTalk(im)}
                    className={`block w-full text-left text-xs leading-relaxed transition-colors px-3 py-2 rounded border backdrop-blur-md ${
                      isUnlocked
                        ? "text-accent border-accent/50 bg-black/60 hover:bg-accent hover:text-ink"
                        : "text-white/80 border-white/15 bg-black/60 hover:border-accent/70 hover:text-white"
                    }`}
                  >
                    <span className="text-white/35 mr-2">{i + 1}</span>
                    {isUnlocked && <span className="mr-1">◆</span>}
                    {im}
                  </button>
                );
              })}
            </div>
            {!freeInput ? (
              <button
                type="button"
                onClick={() => setFreeInput(true)}
                className="w-full text-center text-[11px] text-white/40 hover:text-white/70 transition-colors py-0.5"
              >
                ……或者,用你自己的话(T)
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitTalk(input);
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitTalk(input);
                    } else if (e.key === "Escape") {
                      setFreeInput(false);
                    }
                  }}
                  autoFocus
                  placeholder="此刻真正想说的话……(Enter 说出口 · Esc 收起 · 倒计时不会停)"
                  className="w-full bg-black/60 backdrop-blur-md border border-white/20 p-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-accent/60 rounded"
                  rows={2}
                  maxLength={500}
                />
              </form>
            )}
          </div>
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="fixed bottom-[13.5rem] left-1/2 -translate-x-1/2 z-30 text-sm text-red-300 border border-red-500/30 bg-red-900/40 backdrop-blur-sm px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* 底部:传统 VN 对话框 */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4">
        <div
          className="max-w-3xl mx-auto min-h-[11rem] border border-white/15 bg-black/75 backdrop-blur-md rounded-lg px-6 py-4 cursor-pointer select-none"
          onClick={() => {
            if (pending.length > 0) advance();
            else if (mode === "done") finishScene();
            else if (mode === "explore") {
              /* 点框不做事,提示玩家去点光点 */
            }
          }}
        >
          {loading ? (
            <div className="h-full flex flex-col justify-center items-center py-8">
              <p className="text-sm text-white/60 soft-pulse">
                {pierceActive
                  ? "你听见自己的声音,没有隔着任何东西……"
                  : "……"}
              </p>
            </div>
          ) : currentLine ? (
            <DialogContent line={currentLine} tw={tw} />
          ) : mode === "explore" && moment?.kind === "explore" ? (
            <div className="py-2">
              <p className="text-xs text-accent/80 tracking-widest mb-2">
                检 视
              </p>
              <p className="text-sm text-white/80 leading-relaxed">
                {moment.hint ?? "看看这个地方。"}
              </p>
              <p className="text-[11px] text-white/40 mt-4">
                点击光点(或 ←→ 选 + E 检视) · 已看{" "}
                {
                  examined.filter((id) =>
                    moment.hotspots.some((h) => h.id === id)
                  ).length
                }
                /{moment.hotspots.length} · Enter 继续
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  finishExplore();
                }}
                className="mt-2 py-1.5 px-6 border border-white/25 text-xs tracking-[0.3em] text-white/80 hover:border-white hover:text-white transition-colors rounded"
              >
                继 续(Enter)
              </button>
            </div>
          ) : mode === "activity" ? (
            <div className="py-2">
              <p className="text-xs text-accent/80 tracking-widest mb-2">
                {moment?.kind === "activity" ? moment.activity.title : ""}
              </p>
              <p className="text-sm text-white/80 leading-relaxed">
                {moment?.kind === "activity"
                  ? moment.activity.instruction
                  : ""}
              </p>
            </div>
          ) : mode === "talk" ? (
            <div className="py-2">
              <p className="text-xs text-white/50 tracking-widest mb-2">
                开 口
              </p>
              <p className="text-sm text-white/70 leading-relaxed">
                {pierceActive
                  ? "咔。你听见什么东西碎掉的声音。"
                  : "话在喉咙口。选一个念头,或者用你自己的话。"}
              </p>
            </div>
          ) : mode === "done" ? (
            <div className="py-4 text-center space-y-3">
              <p className="text-sm text-white/70">
                {scene.isEpilogue
                  ? "完"
                  : closingPierced
                    ? "灯还亮着。"
                    : "这一晚,到这里。"}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  finishScene();
                }}
                className="py-2 px-8 border border-white/40 hover:border-white hover:bg-white hover:text-ink transition-colors text-sm tracking-[0.3em] text-white"
              >
                {scene.isEpilogue
                  ? "看 见 结 局"
                  : nextScene(scene.id)
                    ? "进 入 下 一 幕"
                    : "最 后"}
                <span className="ml-2 text-[10px] opacity-50">Enter</span>
              </button>
            </div>
          ) : null}
        </div>
      </footer>
    </main>
  );
}

/* ────────────────────────── 对话框内容 ────────────────────────── */

function DialogContent({
  line,
  tw,
}: {
  line: DisplayLine;
  tw: { shown: string; done: boolean };
}) {
  const nameplate =
    line.speaker === "amo"
      ? "阿默"
      : line.speaker === "chen"
        ? "阿沉"
        : line.speaker === "inner"
          ? (line.label ?? "你心里想的")
          : line.speaker === "observe"
            ? (line.label ?? "检视")
            : line.speaker === "hint"
              ? (line.label ?? "提示")
              : null;

  const nameColor =
    line.speaker === "amo"
      ? "text-accent"
      : line.speaker === "chen"
        ? "text-white/80"
        : line.speaker === "inner" || line.speaker === "observe"
          ? "text-white/45"
          : "text-accent/80";

  const textStyle =
    line.speaker === "narr"
      ? "text-white/85"
      : line.speaker === "inner" || line.speaker === "observe"
        ? "text-white/60 italic"
        : line.speaker === "hint"
          ? "text-white/70"
          : "text-white/95";

  const quoted = line.speaker === "amo" || line.speaker === "chen";

  return (
    <div className="py-1">
      {nameplate && (
        <p className={`text-xs tracking-[0.3em] mb-2 ${nameColor}`}>
          {nameplate}
        </p>
      )}
      <p className={`text-[15px] leading-loose ${textStyle}`}>
        {quoted && "“"}
        {tw.shown}
        <span className="opacity-0">
          {/* 占位防抖动 */}
          {line.text.slice(tw.shown.length)}
        </span>
        {quoted && "”"}
      </p>
      {line.note && tw.done && (
        <p className="text-[11px] text-white/40 italic mt-2 fade-in">
          {line.note}
        </p>
      )}
      {tw.done && (
        <p className="text-right text-white/40 soft-pulse text-xs mt-1">▼</p>
      )}
    </div>
  );
}

/* ────────────────────────── 活动面板 ────────────────────────── */

function ActivityPanel({
  spec,
  onResolve,
}: {
  spec: ActivitySpec;
  onResolve: (good: boolean) => void;
}) {
  return (
    <div className="fixed bottom-[13.5rem] left-0 right-0 z-30 px-6">
      <div className="max-w-2xl mx-auto border border-white/20 bg-black/70 backdrop-blur-md rounded-lg p-5">
        {spec.type === "hold" && <HoldActivity spec={spec} onResolve={onResolve} />}
        {spec.type === "pick" && <PickActivity spec={spec} onResolve={onResolve} />}
        {spec.type === "brush" && <BrushActivity spec={spec} onResolve={onResolve} />}
        {spec.type === "balance" && (
          <BalanceActivity spec={spec} onResolve={onResolve} />
        )}
      </div>
    </div>
  );
}

/** 按住不放:进度条充满 = good;开始后松手 / 超时不按 = bad */
function HoldActivity({
  spec,
  onResolve,
}: {
  spec: Extract<ActivitySpec, { type: "hold" }>;
  onResolve: (good: boolean) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setHolding(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setHolding(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setProgress((p) => {
        if (doneRef.current) return p;
        if (holding) {
          startedRef.current = true;
          const np = p + 0.1 / spec.seconds;
          if (np >= 1) {
            doneRef.current = true;
            setTimeout(() => onResolve(true), 350);
            return 1;
          }
          return np;
        }
        if (startedRef.current && p > 0) {
          // 松手了
          doneRef.current = true;
          setTimeout(() => onResolve(false), 350);
        }
        return p;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [holding, spec.seconds, onResolve]);

  /* 10 秒没动作 = 没伸手 */
  useEffect(() => {
    const t = setTimeout(() => {
      if (!startedRef.current && !doneRef.current) {
        doneRef.current = true;
        onResolve(false);
      }
    }, 10000);
    return () => clearTimeout(t);
  }, [onResolve]);

  return (
    <div className="text-center space-y-3">
      <div className="h-1.5 bg-white/10 rounded overflow-hidden">
        <div
          className="h-full bg-accent transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <button
        type="button"
        onMouseDown={() => setHolding(true)}
        onMouseUp={() => setHolding(false)}
        onMouseLeave={() => setHolding(false)}
        onTouchStart={() => setHolding(true)}
        onTouchEnd={() => setHolding(false)}
        className={`w-full py-3 border text-sm tracking-[0.3em] rounded transition-colors ${
          holding
            ? "border-accent bg-accent/20 text-white"
            : "border-white/30 text-white/80"
        }`}
      >
        {holding ? "……" : "按 住(空格)"}
      </button>
    </div>
  );
}

/** 挑选:选够数量后结算;命中她的喜好≥2 且没踩雷 = good */
function PickActivity({
  spec,
  onResolve,
}: {
  spec: Extract<ActivitySpec, { type: "pick" }>;
  onResolve: (good: boolean) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);

  function toggle(name: string) {
    setPicked((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : prev.length < spec.picks
          ? [...prev, name]
          : prev
    );
  }

  function confirm() {
    if (picked.length < spec.picks) return;
    const hersHit = spec.items.filter(
      (it) => it.hers && picked.includes(it.name)
    ).length;
    const mineHit = spec.items.some(
      (it) => it.avoid && picked.includes(it.name)
    );
    onResolve(hersHit >= 2 && !mineHit);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {spec.items.map((it) => {
          const on = picked.includes(it.name);
          return (
            <button
              key={it.name}
              type="button"
              onClick={() => toggle(it.name)}
              className={`py-2.5 px-2 text-xs rounded border transition-colors ${
                on
                  ? "border-accent bg-accent/20 text-white"
                  : "border-white/20 text-white/70 hover:border-white/50"
              }`}
            >
              {it.name}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={picked.length < spec.picks}
        onClick={confirm}
        className="w-full py-2 border border-white/30 text-xs tracking-[0.3em] text-white rounded disabled:opacity-40 hover:border-accent hover:bg-accent hover:text-ink transition-colors"
      >
        就 这 几 样({picked.length}/{spec.picks})
      </button>
    </div>
  );
}

/** 刷酱:连点攒次数,及时收手 = good;刷过头 = 糊 */
function BrushActivity({
  spec,
  onResolve,
}: {
  spec: Extract<ActivitySpec, { type: "brush" }>;
  onResolve: (good: boolean) => void;
}) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const doneRef = useRef(false);
  const max = spec.target + 3;

  const brush = useCallback(() => {
    if (doneRef.current) return;
    setCount((c) => {
      const nc = c + 1;
      countRef.current = nc;
      if (nc >= max) {
        doneRef.current = true;
        setTimeout(() => onResolve(false), 350); // 糊了
      }
      return nc;
    });
  }, [max, onResolve]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        brush();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        stop();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brush]);

  function stop() {
    if (doneRef.current) return;
    doneRef.current = true;
    const c = countRef.current;
    onResolve(c >= spec.target - 2 && c <= spec.target + 2);
  }

  const pct = Math.min(100, (count / spec.target) * 100);
  const over = count > spec.target + 1;

  return (
    <div className="space-y-3 text-center">
      <div className="h-1.5 bg-white/10 rounded overflow-hidden">
        <div
          className={`h-full transition-none ${over ? "bg-red-400" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={brush}
          className="flex-1 py-3 border border-white/30 text-sm tracking-[0.3em] text-white rounded hover:border-accent transition-colors"
        >
          刷 酱(空格)
        </button>
        <button
          type="button"
          onClick={stop}
          className="flex-1 py-3 border border-white/30 text-sm tracking-[0.3em] text-white/80 rounded hover:border-white transition-colors"
        >
          收 手(Enter)
        </button>
      </div>
      <p className={`text-[11px] ${over ? "text-red-300" : "text-white/40"}`}>
        {over ? "有点冒烟了——" : "火候看着办。"}
      </p>
    </div>
  );
}

/** 控伞:按住 ←→ 调倾向,统计偏向她的时间占比 */
function BalanceActivity({
  spec,
  onResolve,
}: {
  spec: Extract<ActivitySpec, { type: "balance" }>;
  onResolve: (good: boolean) => void;
}) {
  const [tilt, setTilt] = useState(0); // -1 你 … +1 她
  const [elapsed, setElapsed] = useState(0);
  const [caption, setCaption] = useState<string | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const scoreRef = useRef(0);
  const firedRef = useRef<number[]>([]);
  const doneRef = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        keysRef.current.left = true;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        keysRef.current.right = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keysRef.current.left = false;
      if (e.key === "ArrowRight") keysRef.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      if (doneRef.current) return;
      setTilt((t) => {
        let nt = t;
        if (keysRef.current.right) nt += 0.08;
        if (keysRef.current.left) nt -= 0.08;
        nt -= 0.025; // 风往你这边压,不管它伞就回正到你头上
        return Math.max(-1, Math.min(1, nt));
      });
      setElapsed((el) => {
        const ne = el + 0.1;
        const pct = (ne / spec.seconds) * 100;
        spec.during?.forEach((d, di) => {
          if (pct >= d.at && !firedRef.current.includes(di)) {
            firedRef.current.push(di);
            setCaption(
              `${d.speaker === "amo" ? "阿默:" : ""}${d.text}`
            );
            setTimeout(() => setCaption(null), 2600);
          }
        });
        return ne;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [spec]);

  /* 计分 + 结算 */
  useEffect(() => {
    if (tilt > 0.25) scoreRef.current += 0.1;
  }, [tilt]);
  useEffect(() => {
    if (elapsed >= spec.seconds && !doneRef.current) {
      doneRef.current = true;
      const ratio = scoreRef.current / spec.seconds;
      setTimeout(() => onResolve(ratio >= 0.45), 350);
    }
  }, [elapsed, spec.seconds, onResolve]);

  const pct = Math.min(100, (elapsed / spec.seconds) * 100);

  return (
    <div className="space-y-3">
      {/* 伞的倾向 */}
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white/40">
          你
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-accent/80">
          她
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-lg transition-all duration-150"
          style={{ left: `${50 + tilt * 38}%` }}
        >
          ☂
        </div>
      </div>
      <div className="h-1 bg-white/10 rounded overflow-hidden">
        <div className="h-full bg-white/40" style={{ width: `${pct}%` }} />
      </div>
      {caption && (
        <p className="text-xs text-white/70 text-center fade-in">{caption}</p>
      )}
      <p className="text-[11px] text-white/40 text-center">
        按住 ← → 控制伞。雨一直在下。
      </p>
    </div>
  );
}
