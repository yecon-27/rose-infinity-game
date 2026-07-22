"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useSoundscape } from "@/components/soundscape-provider";
import { ChoiceTrace } from "@/components/choice-trace";
import { GestureChoice } from "@/components/gesture-choice";
import { AUDIO, soundscapeForScene } from "@/lib/audio";
import { preloadImageSources } from "@/lib/preload";
import { appendChoiceLog, readChoiceLog } from "@/lib/choice-log";
import { getSessionScene } from "@/lib/create-session";
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
  /** 这句显示时,说话者切换到的表情(emotion key) */
  face?: string;
  /** 聊天演出里这条消息的时间戳(如 "02:03") */
  time?: string;
  variant?: "red-packet";
  amount?: number;
}

type Mode = "flow" | "beat" | "done";

/* 立绘 · 按幕套装解析
 * public/images/characters/ 实际存在的文件（去 .webp 注册在这），
 * 解析顺序：{who}-{emotion}-{faceSet} → {who}-{emotion} → {who}-warm-{faceSet} → 默认。
 * 新增/删除图片后同步这份注册表。
 */
const PORTRAIT_FILES = new Set([
  // vera
  "vera-warm",
  "vera-composed",
  "vera-wistful",
  "vera-warm-cloth",
  "vera-earnest-cloth",
  "vera-warm-bench",
  "vera-staring-bench",
  "vera-anxious-phone",
  "vera-accusing-phone",
  "vera-hurt-phone",
  "vera-crying-sunny",
  "vera-smile-sunny",
  "vera-composed-sunny",
  "vera-calm-konbini",
  // sean
  "sean-focused-hackthon",
  "sean-tired-hackthon",
  "sean-guilty-hackthon",
  "sean-warm-cloth",
  "sean-neutral-cloth",
  "sean-thinking-bench",
  "sean-staring-bench",
  "sean-cold-phone",
  "sean-wooded-phone",
  "sean-smile-sunny",
  "sean-pleading-sunny",
  "sean-grieving-sunny",
]);

const GAME_IMAGE_SOURCES = Array.from(
  new Set([
    ...STORY.flatMap((storyScene) => [
      storyScene.bg,
      ...(storyScene.bgSplit ?? []),
      ...storyScene.script.flatMap((moment) =>
        moment.kind === "bg" ? [moment.src] : []
      ),
    ]),
    ...Array.from(
      PORTRAIT_FILES,
      (name) => `/images/characters/${name}.webp`
    ),
    "/images/motifs/rose-bud.webp",
    "/images/motifs/rose-bloom.webp",
  ])
);

function portraitSrc(
  who: "vera" | "sean",
  emotion: string,
  faceSet?: string
): string {
  const fallback = who === "vera" ? "vera-composed" : "sean-focused-hackthon";
  // 有套装的幕优先在套装内解决(缺的表情用套装 warm/composed 顶),
  // 避免退回无后缀基础图导致服装跳戏;套装内全无才落到基础图。
  const candidates = [
    faceSet ? `${who}-${emotion}-${faceSet}` : "",
    faceSet ? `${who}-warm-${faceSet}` : "",
    faceSet ? `${who}-composed-${faceSet}` : "",
    `${who}-${emotion}`,
    fallback,
  ].filter(Boolean);
  const hit = candidates.find((c) => PORTRAIT_FILES.has(c)) ?? fallback;
  return `/images/characters/${hit}.webp`;
}

/** 聊天里"说出口"的部分;纯动作选项(如"（没回，放下手机）")保留原样 */
function chatText(t: string): string {
  const spoken = t.replace(/（[^）]*）?/g, "").trim();
  return spoken || t;
}
/** 这行是不是一条真正发出去的消息(纯动作/旁白不进手机) */
function isChatMsg(l: DisplayLine): boolean {
  return l.who !== "narr" && l.text.replace(/（[^）]*）/g, "").trim() !== "";
}

function RedPacketMessage({ amount }: { amount?: number }) {
  return (
    <div
      role="img"
      aria-label={`Sean 发来的红包${amount ? `，金额 ${amount} 元` : ""}`}
      className="w-[11.5rem] overflow-hidden rounded-lg bg-[#f05a3c] text-left shadow-[0_5px_16px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center gap-3 px-3 py-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ffe7a7]/80 bg-[#e84b30] text-lg font-medium text-[#ffe7a7] shadow-inner">
          ¥
        </span>
        <span className="min-w-0 text-white">
          <span className="block text-sm leading-5">给你发了一个红包</span>
          <span className="mt-0.5 block text-[10px] text-white/70">
            领取红包
          </span>
        </span>
      </div>
      <div className="bg-[#fff8ee] px-3 py-1.5 text-[9px] tracking-[0.18em] text-[#9b8b7d]">
        红包
      </div>
    </div>
  );
}

/* Vera 默认表情由周目决定:一周目 composed,二周目(pov=sean)wistful */
const veraDefaultEmotion = (pov?: string) =>
  pov === "sean" ? "wistful" : "composed";

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
      } h-[62vh] w-[30vw] max-w-[340px] min-w-[160px] transition-[opacity,filter] duration-700`}
      style={{
        opacity: active ? 1 : 0.48,
        filter: active ? "none" : "blur(1px) saturate(0.68)",
      }}
    >
      {layers.map((l, i) => {
        const top = i === layers.length - 1;
        return (
          <Image
            key={l.id}
            src={l.src}
            alt={alt}
            fill
            priority
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
  // 写死的 STORY 找不到时，回退到这一局生成的场景（getSessionScene 会改写 onDone 串场）。
  const scene: Scene =
    getStoryScene(sceneId) ?? getSessionScene(sceneId) ?? STORY[0];
  const script = scene.script;
  const { playSfx } = useSoundscape(soundscapeForScene(scene.id));

  // 当前背景由 priority 先取；稍后后台加载其余场景与表情，避免生产环境
  // 每次换幕、换脸都等 CDN 首次下载。
  useEffect(() => {
    const timer = window.setTimeout(
      () => preloadImageSources(GAME_IMAGE_SOURCES),
      600
    );
    return () => window.clearTimeout(timer);
  }, []);

  const [idx, setIdx] = useState(0);
  const [queue, setQueue] = useState<DisplayLine[]>([]);
  /** 已读台词历史:聊天演出的消息流复用它,←倒退查看也走它 */
  const [log, setLog] = useState<DisplayLine[]>([]);
  /** 回退查看:0=跟随当前;n>0=正在看倒数第 n 条已读台词(只查看,不回滚剧情) */
  const [backIdx, setBackIdx] = useState(0);
  /** 聊天演出开关:整幕(presentation)或幕中 phone 时刻切换 */
  const [phoneOn, setPhoneOn] = useState(scene.presentation === "phone");
  /** 区分“手机出现前”和“聊天结束后”这两个 phoneOn=false 状态 */
  const [phoneSequenceCompleted, setPhoneSequenceCompleted] = useState(false);
  const [mode, setMode] = useState<Mode>("flow");
  const [optIdx, setOptIdx] = useState(0);
  const [actionKeyHeld, setActionKeyHeld] = useState(false);
  const [phoneHintTop, setPhoneHintTop] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [entering, setEntering] = useState(true);
  const [bg, setBg] = useState(scene.bg);
  const [veraEmotion, setVeraEmotion] = useState(
    scene.veraFace ?? veraDefaultEmotion(scene.pov)
  );
  const [seanEmotion, setSeanEmotion] = useState(scene.seanFace ?? "warm");
  const [choiceTrace, setChoiceTrace] = useState({
    count: 0,
    reach: false,
    visible: false,
  });

  const historyRef = useRef<Array<{ role: "vera" | "sean"; text: string }>>([]);
  /** 聊天窗口容器:内容超高时钉在最新一条(旧消息从顶部滑出隐藏) */
  const chatBoxRef = useRef<HTMLDivElement | null>(null);
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const phoneChoiceRefs = useRef<Array<HTMLButtonElement | null>>([]);
  /** 防止 Strict Mode 重跑 effect 时，同一条消息重复震动。 */
  const lastVibratedMessageRef = useRef("");
  const traceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setChoiceTrace((trace) => ({
      ...trace,
      count: readChoiceLog().length,
    }));
    return () => {
      if (traceTimerRef.current) clearTimeout(traceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (scene.id === "after_konbini") playSfx(AUDIO.sfx.konbiniDoor, 0.2);
  }, [playSfx, scene.id]);

  /* 进入新场景:重置 */
  useEffect(() => {
    setIdx(0);
    setQueue([]);
    setLog([]);
    setBackIdx(0);
    setPhoneOn(scene.presentation === "phone");
    setPhoneSequenceCompleted(false);
    setMode("flow");
    setOptIdx(0);
    setActionKeyHeld(false);
    setPhoneHintTop(null);
    setLoading(false);
    setEntering(true);
    setBg(scene.bg);
    setVeraEmotion(scene.veraFace ?? veraDefaultEmotion(scene.pov));
    setSeanEmotion(scene.seanFace ?? "warm");
    lastVibratedMessageRef.current = "";
    historyRef.current = [];
    // 2200ms:与 .memory-focus / .memory-title 动画时长一致,画面对焦完成、幕名隐去后再放行。
    const t = setTimeout(() => setEntering(false), 2200);
    return () => clearTimeout(t);
  }, [sceneId]);

  const current = queue[0];
  const tw = useTypewriter(current?.text ?? "");

  /* 只有收到 Sean 的新消息才震动；Vera 自己发出的消息、旁白、回退查看不触发。 */
  useEffect(() => {
    if (
      !phoneOn ||
      backIdx > 0 ||
      !current ||
      current.who !== "sean" ||
      !isChatMsg(current)
    )
      return;
    const messageKey = `${scene.id}:${idx}:${current.who}:${
      current.time ?? ""
    }:${current.text}`;
    if (lastVibratedMessageRef.current === messageKey) return;
    lastVibratedMessageRef.current = messageKey;

    playSfx(AUDIO.sfx.phoneVibrate, 0.34);
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate([120, 55, 180]);
    }
  }, [backIdx, current, idx, phoneOn, playSfx, scene.id]);

  /* 表情随当前显示的台词切换 */
  useEffect(() => {
    if (!current?.face) return;
    if (current.who === "sean") setSeanEmotion(current.face);
    else if (current.who === "vera" && !scene.lockVeraFace)
      setVeraEmotion(current.face);
  }, [current, scene.lockVeraFace]);

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
      setQueue([
        {
          who: m.who,
          text: m.text,
          face: m.face,
          time: m.time,
          variant: m.variant,
          amount: m.amount,
        },
      ]);
      historyRef.current.push({ role: m.who, text: m.text });
      setIdx((i) => i + 1);
    } else if (m.kind === "face") {
      if (m.who === "sean") setSeanEmotion(m.emotion);
      else if (!scene.lockVeraFace) setVeraEmotion(m.emotion);
      setIdx((i) => i + 1);
    } else if (m.kind === "phone") {
      setPhoneOn(m.on);
      if (!m.on) setPhoneSequenceCompleted(true);
      setIdx((i) => i + 1);
    } else if (m.kind === "beat") {
      setOptIdx(0);
      setMode("beat");
    }
  }, [
    idx,
    queue.length,
    mode,
    entering,
    loading,
    playSfx,
    scene.lockVeraFace,
    script,
  ]);

  /* 推进对话框;回退查看中则先一步步走回当前 */
  const advance = useCallback(() => {
    if (entering || loading) return;
    if (backIdx > 0) {
      setBackIdx((i) => i - 1);
      return;
    }
    if (mode === "beat") return;
    if (queue.length > 0) {
      if (!tw.done) tw.skip();
      else {
        const head = queue[0];
        if (head) setLog((l) => [...l, head]);
        setQueue((q) => q.slice(1));
      }
    } else if (mode === "done") {
      router.push(scene.onDone ?? "/");
    }
  }, [entering, loading, backIdx, mode, queue, tw, router, scene]);

  /* ← 倒退一句:只在已读历史里查看,不改变剧情进度 */
  const goBack = useCallback(() => {
    if (entering || loading) return;
    setBackIdx((i) => Math.min(i + 1, log.length));
  }, [entering, loading, log.length]);

  /* 玩家做出选择 */
  const npcRole: "vera" | "sean" = scene.pov === "sean" ? "vera" : "sean";
  const playerRole: "vera" | "sean" = scene.pov === "sean" ? "sean" : "vera";

  const choose = useCallback(
    async (choice: Choice) => {
      if (mode !== "beat" || loading) return;
      const m = script[idx];
      if (!m || m.kind !== "beat") return;

      playSfx(AUDIO.sfx.softTap, 0.2);

      appendChoiceLog({
        sceneId: scene.id,
        momentIdx: idx,
        text: choice.text,
        reach: !!choice.reach,
      });
      if (traceTimerRef.current) clearTimeout(traceTimerRef.current);
      setChoiceTrace((trace) => ({
        count: trace.count + 1,
        reach: !!choice.reach,
        visible: true,
      }));
      traceTimerRef.current = setTimeout(
        () => setChoiceTrace((trace) => ({ ...trace, visible: false })),
        3200
      );
      historyRef.current.push({ role: playerRole, text: choice.say ?? choice.text });

      // 先显示玩家这一句（say 为说出口的纯净台词，缺省回退到选项文案）
      const playerLine: DisplayLine = {
        who: playerRole,
        text: choice.say ?? choice.text,
        face:
          scene.lockVeraFace && playerRole === "vera"
            ? undefined
            : choice.face,
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
    [mode, loading, script, idx, scene, playerRole, npcRole, playSfx]
  );

  /* 键盘 */
  const beatMoment =
    mode === "beat" && script[idx]?.kind === "beat"
      ? (script[idx] as Extract<Moment, { kind: "beat" }>)
      : null;
  const selectedPhoneGesture = beatMoment?.choices[optIdx]?.gesture;

  /* 桌面端把提示放在手机左侧，并让尖角纵向对准当前选项。 */
  useLayoutEffect(() => {
    if (!phoneOn || !selectedPhoneGesture) {
      setPhoneHintTop(null);
      return;
    }

    function updateHintAnchor() {
      const phone = phoneRef.current;
      const choice = phoneChoiceRefs.current[optIdx];
      if (!phone || !choice) return;
      const phoneRect = phone.getBoundingClientRect();
      const choiceRect = choice.getBoundingClientRect();
      setPhoneHintTop(choiceRect.top + choiceRect.height / 2 - phoneRect.top);
    }

    updateHintAnchor();
    window.addEventListener("resize", updateHintAnchor);
    return () => window.removeEventListener("resize", updateHintAnchor);
  }, [optIdx, phoneOn, selectedPhoneGesture]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (entering || loading) return;
      if (beatMoment) {
        const n = beatMoment.choices.length;
        if (e.key === "ArrowLeft") {
          // 选择前也能倒回去重读
          e.preventDefault();
          goBack();
        } else if (e.key === "ArrowRight" && backIdx > 0) {
          e.preventDefault();
          advance();
        } else if (
          e.key === "ArrowRight" &&
          beatMoment.choices[optIdx]?.gesture === "swipe"
        ) {
          e.preventDefault();
          if (!e.repeat) setActionKeyHeld(true);
        } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          setActionKeyHeld(false);
          setOptIdx((i) => (i + 1) % n);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActionKeyHeld(false);
          setOptIdx((i) => (i - 1 + n) % n);
        } else if (e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          if (e.repeat) return;
          const choice = beatMoment.choices[optIdx];
          if (choice.gesture) setActionKeyHeld(true);
          else choose(choice);
        } else if (Number(e.key) >= 1 && Number(e.key) <= n) {
          e.preventDefault();
          const choiceIndex = Number(e.key) - 1;
          const choice = beatMoment.choices[choiceIndex];
          setOptIdx(choiceIndex);
          setActionKeyHeld(false);
          if (!choice.gesture) choose(choice);
        }
        return;
      }
      if (e.code === "Space" || e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (
        e.key === "Enter" ||
        e.code === "Space" ||
        e.key === "ArrowRight"
      )
        setActionKeyHeld(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [beatMoment, optIdx, choose, advance, goBack, backIdx, entering, loading]);

  /* ────────────────────────── 渲染 ────────────────────────── */

  const veraPortrait = portraitSrc("vera", veraEmotion, scene.faceSet);
  const seanPortrait = portraitSrc("sean", seanEmotion, scene.faceSet);
  /** 回退查看中显示的那句 */
  const reviewLine = backIdx > 0 ? log[log.length - backIdx] : undefined;
  /** 对话框实际显示的行与文本（回看时显示历史全文，否则打字机） */
  const boxLine = reviewLine ?? current;
  const boxText = reviewLine ? reviewLine.text : tw.shown;
  const speaker = boxLine?.who;
  const phoneMode = phoneOn;
  /* 聊天演出:手机里只放消息(旁白不进手机);回退查看时窗口跟着往回翻 */
  const chatWindow = phoneMode
    ? (backIdx > 0
        ? log.slice(0, log.length - backIdx + 1)
        : [...log, ...(current ? [current] : [])]
      )
        .filter(isChatMsg)
    : [];
  const chatTyping =
    phoneMode && backIdx === 0 && !!current && isChatMsg(current);
  const chatClock =
    [...chatWindow].reverse().find((l) => l.time)?.time ?? "02:03";

  /* 聊天窗口钉底:新消息、打字机推进、回退查看时都滚到最新一条可见 */
  useEffect(() => {
    const el = chatBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatWindow.length, backIdx, tw.shown]);

  const hideBeforeSunnyPhoneChat =
    scene.id === "end_breakup" && !phoneSequenceCompleted;
  const showPortraits =
    !phoneMode && scene.portraits !== "none" && !hideBeforeSunnyPhoneChat;
  const showSean = showPortraits && scene.portraits !== "vera";
  /**
   * 剧本里的 beat 就是明确的情绪拍：暖场向对方推近，冷场从对方拉远。
   * 普通台词不反复运镜，只让背景保持极慢的环境视差。
   */
  const shotFocus: "vera" | "sean" | undefined = beatMoment
    ? npcRole
    : speaker === "vera" || speaker === "sean"
    ? speaker
    : undefined;
  const focusSide: "left" | "right" | undefined = shotFocus
    ? shotFocus === "vera"
      ? scene.pov === "vera"
        ? "right"
        : "left"
      : scene.pov === "vera"
      ? "left"
      : "right"
    : undefined;
  const shotOrigin =
    focusSide === "left" ? "28%" : focusSide === "right" ? "72%" : "50%";
  const shotClass =
    beatMoment && !reviewLine && !phoneMode
      ? scene.phase === "strained"
        ? "camera-shot--pull"
        : "camera-shot--push"
      : "";

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black"
      onClick={advance}
    >
      <ChoiceTrace
        count={choiceTrace.count}
        reach={choiceTrace.reach}
        visible={choiceTrace.visible}
      />
      {/* 镜头层：情绪拍推/拉整幅画面；背景在里面做更慢的环境视差。 */}
      <div
        className={`fixed inset-0 z-0 overflow-hidden ${
          entering ? "memory-focus" : ""
        }`}
      >
        <div
          className={`camera-stage ${shotClass}`}
          style={{ "--shot-origin-x": shotOrigin } as React.CSSProperties}
        >
          {/* 背景多留出一圈出血，拉镜时不会露出黑边。 */}
          <div className="camera-backdrop">
            <div
              className={`environment-drift absolute inset-0 ${
                scene.phase === "strained" ? "environment-drift--strained" : ""
              }`}
            >
              {scene.bgSplit ? (
                <div className="absolute inset-0 flex">
                  <div className="relative h-full w-1/2">
                    <Image
                      src={scene.bgSplit[0]}
                      alt=""
                      fill
                      priority
                      className="object-cover fade-in-slow"
                    />
                  </div>
                  <div className="h-full w-[3px] bg-black/90 shadow-[0_0_18px_rgba(0,0,0,0.9)]" />
                  <div className="relative h-full flex-1">
                    <Image
                      src={scene.bgSplit[1]}
                      alt=""
                      fill
                      priority
                      className="object-cover fade-in-slow"
                    />
                  </div>
                </div>
              ) : (
                <Image
                  key={bg}
                  src={bg}
                  alt=""
                  fill
                  priority
                  className="object-cover fade-in-slow"
                />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/35 to-black/80" />
            <div
              aria-hidden="true"
              className={`cinematic-vignette ${
                scene.phase === "strained" ? "cinematic-vignette--strained" : ""
              }`}
            />
          </div>

          {/* 立绘:Vera + Sean,表情交叉淡入,高亮当前说话者
           * 一周目(pov=vera)交换站位:Sean 在左、Vera 在右;二周目恢复默认。
           * portraits/presentation 可整幕隐藏(人物已画进背景,或聊天演出)。 */}
          {showPortraits && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <Portrait
                src={veraPortrait}
                alt="Vera"
                active={shotFocus === "vera"}
                side={scene.pov === "vera" ? "right" : "left"}
              />
              {showSean && (
                <Portrait
                  src={seanPortrait}
                  alt="Sean"
                  active={shotFocus === "sean"}
                  side={scene.pov === "vera" ? "left" : "right"}
                />
              )}
            </div>
          )}

          {/* 不说话的一侧轻微失焦、压暗；中心用渐变收口，避免硬切半屏。 */}
          {showPortraits && focusSide && (
            <div
              aria-hidden="true"
              className={`scene-side-muted scene-side-muted--${
                focusSide === "left" ? "right" : "left"
              } ${
                scene.phase === "strained" ? "scene-side-muted--strained" : ""
              }`}
            />
          )}
        </div>
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

      {/* 悬浮手机:聊天演出。固定尺寸;底边贴住旁白框上沿,水平对齐旁白框中线。
       * 第一条消息进来("手机震了一下")才浮起,旁白不进手机。 */}
      {phoneMode && (chatWindow.length > 0 || !!beatMoment) && (
        <div className="fixed bottom-[12.5rem] left-1/2 z-20 -translate-x-1/2">
          <div
            ref={phoneRef}
            className="phone-rise flex h-[min(620px,66vh)] aspect-[10/19] flex-col overflow-hidden rounded-[2.2rem] border-2 border-white/20 bg-black/85 shadow-2xl backdrop-blur-md"
          >
            {/* 状态栏 + 刘海 */}
            <div className="relative flex items-center justify-between px-5 pb-1 pt-2.5 text-[9px] text-white/45">
              <span>{chatClock}</span>
              <span className="absolute left-1/2 top-2 h-3.5 w-14 -translate-x-1/2 rounded-full bg-white/10" />
              <span className="flex items-center gap-1.5">
                {/* 信号 */}
                <span className="flex items-end gap-[2px]">
                  <span className="h-1 w-[3px] rounded-sm bg-white/45" />
                  <span className="h-1.5 w-[3px] rounded-sm bg-white/45" />
                  <span className="h-2 w-[3px] rounded-sm bg-white/45" />
                  <span className="h-2.5 w-[3px] rounded-sm bg-white/25" />
                </span>
                {/* 电量 */}
                <span className="flex items-center">
                  <span className="flex h-2.5 w-5 items-center rounded-[3px] border border-white/40 px-[2px]">
                    <span className="h-1.5 w-3/5 rounded-[1px] bg-white/45" />
                  </span>
                  <span className="ml-[1px] h-1 w-[2px] rounded-r-sm bg-white/40" />
                </span>
              </span>
            </div>
            <p className="border-b border-white/10 pb-2 pt-0.5 text-center text-xs tracking-[0.3em] text-white/60">
              Sean
            </p>
            <div
              ref={chatBoxRef}
              className="scrollbar-none flex flex-1 flex-col justify-start space-y-2 overflow-y-auto px-3 pb-3 pt-2"
            >
              {chatWindow.map((l, i, arr) => {
                const isCur = chatTyping && i === arr.length - 1;
                const shown = (isCur ? tw.shown : l.text).replace(
                  /（[^）]*）?/g,
                  ""
                );
                const mine = l.who === "vera";
                return (
                  <div key={i}>
                    {l.time && (
                      <p className="py-1 text-center text-[10px] text-white/35">
                        {l.time}
                      </p>
                    )}
                    <div
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      {l.variant === "red-packet" ? (
                        <RedPacketMessage amount={l.amount} />
                      ) : (
                        <p
                          className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                            mine
                              ? "rounded-br-sm bg-accent/25 text-white"
                              : "rounded-bl-sm bg-white/10 text-white/90"
                          }`}
                        >
                          {shown}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 选择 · 输入法候选条:她想说的话浮在候选栏里,点哪句发哪句 */}
            {beatMoment && !reviewLine && (
              <div
                className="border-t border-white/10 px-3 pb-3 pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-wrap gap-1.5 pb-2">
                  {beatMoment.choices.map((c, i) => (
                    <GestureChoice
                      key={i}
                      gesture={c.gesture}
                      onCommit={() => choose(c)}
                      disabled={loading}
                      selected={i === optIdx}
                      keyboardPressed={actionKeyHeld && i === optIdx}
                      showHint={false}
                      buttonRef={(node) => {
                        phoneChoiceRefs.current[i] = node;
                      }}
                      ariaDescribedBy={
                        i === optIdx && c.gesture
                          ? "phone-gesture-hint"
                          : undefined
                      }
                      className={`rounded px-2 py-1 text-left text-xs leading-snug transition-colors ${
                        i === optIdx
                          ? "bg-accent/30 text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      <span
                        onPointerEnter={() => setOptIdx(i)}
                        className="block"
                      >
                        <span className="mr-1 text-white/35">{i + 1}</span>
                        {chatText(c.text)}
                      </span>
                    </GestureChoice>
                  ))}
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2">
                  <span className="flex-1 truncate text-xs text-white/85">
                    {chatText(beatMoment.choices[optIdx]?.text ?? "")}
                  </span>
                  <span className="soft-pulse text-white/60">丨</span>
                  {beatMoment.choices[optIdx]?.gesture ? (
                    <span className="ml-1 whitespace-nowrap text-[9px] tracking-wider text-accent/70">
                      在上方完成动作
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => choose(beatMoment.choices[optIdx])}
                      disabled={loading}
                      className="ml-1 rounded-full bg-accent/40 px-2.5 py-1 text-[11px] tracking-widest text-white transition-colors hover:bg-accent/60"
                    >
                      发送
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          {selectedPhoneGesture && phoneHintTop !== null && (
            <div
              id="phone-gesture-hint"
              role="status"
              className="phone-gesture-callout"
              style={{ "--phone-hint-top": `${phoneHintTop}px` } as React.CSSProperties}
            >
              <p>
                <span>选项 {optIdx + 1}</span>
                {selectedPhoneGesture === "swipe"
                  ? "向右滑动"
                  : selectedPhoneGesture === "longpress"
                  ? "长按"
                  : "按住不放"}
              </p>
              <small>
                {selectedPhoneGesture === "swipe"
                  ? "键盘 · 按住 →"
                  : "键盘 · 按住 Enter 或空格"}
              </small>
            </div>
          )}
        </div>
      )}

      {/* 底部:对话框 or 选择 */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-6 pb-10">
        <div className="mx-auto max-w-2xl">
          {/* 选择（回退查看时先让位给历史台词；聊天演出的选择走输入法候选条） */}
          {beatMoment && !reviewLine && !phoneMode ? (
            <div
              className="space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white/70 text-sm leading-loose mb-2 text-center">
                {beatMoment.prompt}
              </p>
              {beatMoment.choices.map((c, i) => (
                <GestureChoice
                  key={i}
                  gesture={c.gesture}
                  onCommit={() => choose(c)}
                  disabled={loading}
                  selected={i === optIdx}
                  keyboardPressed={actionKeyHeld && i === optIdx}
                  showHint={i === optIdx && !!c.gesture}
                  hintVariant="bubble"
                  className={`block w-full text-left px-5 py-3 border text-sm leading-relaxed transition-colors ${
                    i === optIdx
                      ? "border-white bg-white/10 text-white"
                      : "border-white/25 text-white/75 hover:border-white/60"
                  }`}
                >
                  <span
                    onPointerEnter={() => setOptIdx(i)}
                    className="block"
                  >
                    {c.text}
                  </span>
                </GestureChoice>
              ))}
            </div>
          ) : phoneMode && beatMoment && !reviewLine ? (
            /* 聊天演出的引导语走旁白框(手机里只放消息和候选) */
            <div className="bg-black/55 backdrop-blur-sm border border-white/10 rounded px-6 py-5 min-h-[7rem]">
              <p className="leading-loose text-white/70 italic text-center">
                {beatMoment.prompt}
              </p>
            </div>
          ) : boxLine && (!phoneMode || !isChatMsg(boxLine)) ? (
            <div
              className={`bg-black/55 backdrop-blur-sm border rounded px-6 py-5 min-h-[7rem] cursor-pointer ${
                reviewLine ? "border-white/30" : "border-white/10"
              }`}
            >
              {boxLine.who !== "narr" && (
                <p
                  className={`text-xs tracking-[0.3em] mb-2 ${
                    boxLine.who === npcRole ? "text-accent" : "text-white/80"
                  }`}
                >
                  {boxLine.who === "sean" ? "Sean" : "Vera"}
                </p>
              )}
              <p
                className={`leading-loose ${
                  boxLine.who === "narr"
                    ? "text-white/70 italic text-center"
                    : "text-white/95"
                }`}
              >
                {boxText}
              </p>
            </div>
          ) : mode === "done" ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                router.push(scene.onDone ?? "/");
              }}
              className="group block w-full space-y-4 py-3 text-center focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-white/60"
            >
              <p className="text-white/80 tracking-[0.2em]">本章结束</p>
              <p className="text-white/40 text-xs tracking-[0.3em] transition-colors group-hover:text-white/65">
                点击进入下一幕
              </p>
            </button>
          ) : null}

          {/* 提示行 */}
          {(reviewLine || (!beatMoment && current)) && (
            <p className="mt-3 text-center text-[10px] tracking-[0.3em] text-white/30 soft-pulse">
              {backIdx > 0
                ? `◂ 回看 ${log.length - backIdx + 1}/${log.length} · → 返回`
                : loading
                ? "……"
                : tw.done
                ? "空格 / 点击 继续 · ← 上一句"
                : ""}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
