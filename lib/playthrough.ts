/**
 * 对话历史持久化
 *
 * 用 localStorage 跨页传递玩家在所有幕中的"真心 vs 出口"对照,
 * 以及贯穿全局的关系状态(距离、暴露次数、穿透)。
 * 结局页统一生成报告 + 第三视角回放 + 分支结局。
 */

const STORAGE_KEY = "the-filter:playthrough";
const RELATIONSHIP_KEY = "the-filter:relationship";

/**
 * 一次开口的性质:
 * secure=安稳区原话直出 / high=回避改写 / low=回避但漏出一半 /
 * anxious=焦虑失真(变尖) / pierce=穿透(终幕不设防)
 */
export type TurnIntensity = "high" | "low" | "anxious" | "secure" | "pierce";

export interface TurnRecord {
  inner: string;
  spoken: string;
  amoReply: string;
  /** 阿默没说出口的内心话——游戏中不可见,结局第三视角回放才揭示 */
  amoInner: string;
  intensity: TurnIntensity;
}

export interface SceneRecord {
  sceneId: string;
  sceneName: string;
  goldenQuote: string;
  turns: TurnRecord[];
  finishedAt: string; // ISO timestamp
}

export interface Playthrough {
  scenes: SceneRecord[];
}

/** 贯穿整局的关系状态 */
export interface RelationshipState {
  /** 情绪天平 -100(焦虑)~0(安稳)~+100(回避)。初始 +40:开局偏回避 */
  balance: number;
  /** 距离 0-100(旧字段,保留兼容) */
  distance: number;
  /** 真话时刻数(=过滤器裂纹数):在安稳区把原话说出去的次数,达阈值终幕穿透 */
  exposureCount: number;
  /** 终幕是否触发了穿透 */
  pierced: boolean;
  /** 穿透那一刻,玩家说的是不是真话(决定结局分支) */
  pierceExposed: boolean;
}

const DEFAULT_RELATIONSHIP: RelationshipState = {
  balance: 40,
  distance: 50,
  exposureCount: 0,
  pierced: false,
  pierceExposed: false,
};

export function loadRelationship(): RelationshipState {
  if (typeof window === "undefined") return { ...DEFAULT_RELATIONSHIP };
  try {
    const raw = localStorage.getItem(RELATIONSHIP_KEY);
    if (!raw) return { ...DEFAULT_RELATIONSHIP };
    return { ...DEFAULT_RELATIONSHIP, ...(JSON.parse(raw) as Partial<RelationshipState>) };
  } catch {
    return { ...DEFAULT_RELATIONSHIP };
  }
}

export function saveRelationship(state: RelationshipState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RELATIONSHIP_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("[playthrough] 关系状态保存失败:", err);
  }
}

export function saveSceneRecord(record: SceneRecord): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadPlaythrough();
    const scenes = existing?.scenes ?? [];
    // 同一幕重玩则覆盖
    const idx = scenes.findIndex((s) => s.sceneId === record.sceneId);
    if (idx >= 0) scenes[idx] = record;
    else scenes.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scenes }));
  } catch (err) {
    console.error("[playthrough] 保存失败:", err);
  }
}

export function loadPlaythrough(): Playthrough | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Playthrough;
  } catch (err) {
    console.error("[playthrough] 读取失败:", err);
    return null;
  }
}

export function clearPlaythrough(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RELATIONSHIP_KEY);
  } catch (err) {
    console.error("[playthrough] 清除失败:", err);
  }
}

/** 结局分支 */
export type EndingKind = "weathered" | "wasted-pierce" | "door-open";

export function decideEnding(rel: RelationshipState): EndingKind {
  if (rel.pierced && rel.pierceExposed) return "door-open";
  if (rel.pierced) return "wasted-pierce";
  return "weathered";
}

/**
 * 从对话历史生成"过滤器报告"静态分析。
 * 不调 LLM(MVP 阶段),用规则统计 + 模板拼接。
 * 后续扩展可改成 LLM 个性化归纳。
 */
export interface FilterReport {
  totalScenes: number;
  totalTurns: number;
  highCount: number;
  lowCount: number;
  pierceCount: number;
  /** 玩家最常用来代替真心的"出口话"特征词 */
  spokenHabits: string[];
  /** 真心话里出现的暴露词(出现在 inner 中) */
  exposedFeelings: string[];
  /** 报告总结句 */
  summary: string;
  /** 一句个人化的"画像"——玩家带走的句子 */
  portrait: string;
  /** 各幕金句列表 */
  goldenQuotes: Array<{ sceneName: string; quote: string }>;
}

const EXPOSURE_LEXICON = [
  "想你", "想见", "需要", "在乎", "喜欢", "爱", "别走", "别离开", "留下来",
  "害怕", "怕", "担心", "难过", "撑不住", "累", "孤独", "孤单",
  "对不起", "错了", "不好", "抱歉",
  "算什么", "我们之间", "谈谈", "到底", "为什么",
  "陪你", "一直在", "我在",
];

const SPOKEN_HABIT_LEXICON = [
  { kw: "没事", label: "没事" },
  { kw: "都行", label: "都行" },
  { kw: "随便", label: "随便" },
  { kw: "还好", label: "还好" },
  { kw: "顺路", label: "顺路" },
  { kw: "开玩笑", label: "开玩笑的" },
  { kw: "看你", label: "看你" },
  { kw: "你呢", label: "反问'你呢'" },
  { kw: "累", label: "有点累" },
  { kw: "算了", label: "算了" },
];

export function buildReport(play: Playthrough): FilterReport {
  const allTurns = play.scenes.flatMap((s) => s.turns);
  const totalTurns = allTurns.length;
  // 统计口径:high/anxious 都算"被失真",low 算半失真,secure/pierce 算真话
  const highCount = allTurns.filter(
    (t) => t.intensity === "high" || t.intensity === "anxious"
  ).length;
  const lowCount = allTurns.filter((t) => t.intensity === "low").length;
  const pierceCount = allTurns.filter(
    (t) => t.intensity === "pierce" || t.intensity === "secure"
  ).length;

  const exposedSet = new Set<string>();
  for (const t of allTurns) {
    for (const kw of EXPOSURE_LEXICON) {
      if (t.inner.includes(kw)) exposedSet.add(kw);
    }
  }

  const habitCounts = new Map<string, number>();
  for (const t of allTurns) {
    for (const { kw, label } of SPOKEN_HABIT_LEXICON) {
      if (t.spoken.includes(kw)) {
        habitCounts.set(label, (habitCounts.get(label) ?? 0) + 1);
      }
    }
  }
  const spokenHabits = Array.from(habitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);

  let summary: string;
  if (pierceCount > 0) {
    summary = `共 ${totalTurns} 次开口。前面 ${lowCount} 次暴露让过滤器一点点松动,直到最后一刻,它碎了——那一句话,是你自己说的,没有任何东西替你修饰。`;
  } else if (lowCount === 0) {
    summary =
      "全程没有一次让过滤器松动。每一句真心话都被完整改写成客套,关系在不亏不欠中走向风化。";
  } else if (lowCount === totalTurns) {
    summary =
      "每一次输入都让过滤器漏了一半——你尝试过卸下防御,但每一次都立刻找补了回去。";
  } else {
    summary = `共 ${totalTurns} 次开口,其中 ${lowCount} 次让过滤器松动,${highCount} 次被完全改写。你在靠近与后退之间反复,最终谁也没真正接住谁。`;
  }

  let portrait: string;
  if (spokenHabits.length > 0) {
    portrait = `你最常用来代替真心话的词是:"${spokenHabits[0]}"。`;
  } else if (exposedSet.size > 0) {
    const feelings = Array.from(exposedSet).slice(0, 2).join("、");
    portrait = `你心里反复出现的词是:"${feelings}",但它们大多没说出口。`;
  } else {
    portrait = "你的真心话很安静,你的出口话更安静。";
  }

  const goldenQuotes = play.scenes.map((s) => ({
    sceneName: s.sceneName,
    quote: s.goldenQuote,
  }));

  return {
    totalScenes: play.scenes.length,
    totalTurns,
    highCount,
    lowCount,
    pierceCount,
    spokenHabits,
    exposedFeelings: Array.from(exposedSet),
    summary,
    portrait,
    goldenQuotes,
  };
}
