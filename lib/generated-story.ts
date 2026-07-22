/**
 * Rose Infinity · 用户自述故事 → AI 工作流 · 共享数据契约
 *
 * 这是"输入你自己的故事 → 拆解 → 生成可玩情节 → 个案心理咨询/感情复盘修复"
 * 整条管线的唯一契约。四段 agent 各占一段，全部只 import 本文件的类型：
 *
 *   用户自由文本
 *     └─ Agent A 拆解    /api/deconstruct     → StoryOutline
 *          └─ Agent B 情节 /api/generate-scenes → GeneratedGame (复用 story.ts 引擎)
 *          └─ Agent C 音画 /api/generate-media  → MediaManifest (可后台/可选)
 *          └─ Agent D 咨询 /api/counsel         → CounselState → 感情复盘修复
 *
 * ⚠️ 改这里的任何类型 = 改所有人的接口。要动，回 W0 改一次并广播，不要各自私改。
 */

import type { Scene, Lookback, Phase } from "@/lib/story";
import type { ChoiceLogEntry } from "@/lib/choice-log";

/* ─────────────────────────────────────────────────────────
 * Agent A · 故事拆解产出
 * 把一段自由叙述拆成结构化骨架。这是 B / C / D 共同的事实来源；
 * 下游只能引用这里出现过的内容，不许自行补写用户没提供的事实。
 * ───────────────────────────────────────────────────────── */

/** 关系里可辨认的破裂类型，直接沿用 letter.ts 的处置分支，护栏才对得上 */
export type BreachType = "none" | "trust" | "unspoken-care" | "distance";
export const BREACH_TYPES: readonly BreachType[] = [
  "none",
  "trust",
  "unspoken-care",
  "distance",
] as const;

export interface OutlinePerson {
  /** self = 讲述者本人；other = 关系里的另一方 */
  role: "self" | "other";
  name?: string;
  gender?: "f" | "m";
}

/** 一个冲突/错过节点 → 未来会被 Agent B 展开成一幕 */
export interface OutlineConflict {
  id: string;
  /** 一句话情境，如"他异地发烧，她在上夜班" */
  situation: string;
  /** 讲述者当时怎么做的（只取用户提供的） */
  selfMove: string;
  /** 另一方当时怎么回应的 */
  otherMove: string;
  /** 谁伸了手没被接住（对应 story.ts 的 reach 灵魂机制） */
  missedReach: string;
  phase: Phase;
}

export interface StoryOutline {
  people: OutlinePerson[];
  /** 关系阶段时间线，从暖到冷 */
  arc: { phase: Phase; label: string }[];
  /** 冲突节点，按时间排序；每个日后成为一幕 */
  conflicts: OutlineConflict[];
  /** 反复出现的情感模式，如"总先保护自己""总等对方先开口" */
  patterns: string[];
  breachType: BreachType;
  /** 关键原话，供 counsel / 复盘逐字引用，绝不改写 */
  keyLines: string[];
}

/** 拆解失败 / 断网时的安全兜底：不开天窗，也不编内容 */
export const EMPTY_OUTLINE: StoryOutline = {
  people: [{ role: "self" }, { role: "other" }],
  arc: [],
  conflicts: [],
  patterns: [],
  breachType: "none",
  keyLines: [],
};

/** 轻量运行时校验：LLM 输出至少要长这样才放行，否则各 route 落兜底 */
export function isStoryOutline(value: unknown): value is StoryOutline {
  if (!value || typeof value !== "object") return false;
  const o = value as Partial<StoryOutline>;
  return (
    Array.isArray(o.people) &&
    Array.isArray(o.arc) &&
    Array.isArray(o.conflicts) &&
    Array.isArray(o.patterns) &&
    Array.isArray(o.keyLines) &&
    typeof o.breachType === "string" &&
    (BREACH_TYPES as readonly string[]).includes(o.breachType)
  );
}

/* ─────────────────────────────────────────────────────────
 * Agent B · 情节生成产出
 * 直接复用 story.ts 的 Scene / Lookback 接口 —— 生成物即可玩，不改引擎。
 * ───────────────────────────────────────────────────────── */

export interface GeneratedGame {
  scenes: Scene[];
  lookbacks: Lookback[];
  /** 从哪一幕进入（scenes 里某个 id） */
  entrySceneId: string;
}

export function isGeneratedGame(value: unknown): value is GeneratedGame {
  if (!value || typeof value !== "object") return false;
  const g = value as Partial<GeneratedGame>;
  return (
    Array.isArray(g.scenes) &&
    g.scenes.length > 0 &&
    Array.isArray(g.lookbacks) &&
    typeof g.entrySceneId === "string" &&
    g.scenes.some((s) => s?.id === g.entrySceneId)
  );
}

/* ─────────────────────────────────────────────────────────
 * Agent C · 音画生成产出（可后台、可选，不挡主线）
 * ───────────────────────────────────────────────────────── */

export interface MediaManifest {
  /** sceneId 或 bg key → 背景图 URL/路径 */
  bg: Record<string, string>;
  /** 台词行 id → 腾讯云 TTS 生成的音频路径 */
  tts: Record<string, string>;
}

export const EMPTY_MANIFEST: MediaManifest = { bg: {}, tts: {} };

/* ─────────────────────────────────────────────────────────
 * Agent D · 心理咨询 buddy 多轮状态
 * 一步步引导：先确认情节，再点出情感模式，最后落到感情复盘修复。
 * 护栏沿用 letter.ts：不诊断、不编事实、信任破裂不洗白。
 * ───────────────────────────────────────────────────────── */

export type CounselTurnKind =
  | "confirm-scene" // "是这个情节吗？"
  | "probe-feeling" // "我感觉你在这段关系里，总是…是这样吗？"
  | "reframe" // 把模式温和地重述一遍
  | "repair"; // 落到一句可以补上的话 / 一次迟到的伸手

export interface CounselTurn {
  role: "buddy" | "user";
  text: string;
  kind?: CounselTurnKind;
}

export interface CounselState {
  outline: StoryOutline;
  /** 若用户玩过生成的剧情，把选择足迹带进来做个案依据 */
  choices: ChoiceLogEntry[];
  turns: CounselTurn[];
}

/** 一轮咨询的 API 返回：buddy 的下一句 + 是否已到收尾复盘 */
export interface CounselReply {
  turn: CounselTurn;
  /** 到达 repair 收尾时，附一页感情复盘修复正文 */
  reflection?: string;
  done: boolean;
}
