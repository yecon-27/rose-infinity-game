/**
 * 用户自述故事流程 · 会话状态
 *
 * /create 输入 → 拆解(A) → 生成情节(B) → 玩 → 心理陪伴(D) 这条链路跨了好几个页面，
 * 需要一个地方把这一局的 outline、生成的可玩游戏、buddy 对话历史存起来共享。
 * 沿用 choice-log.ts 的本地存储写法：SSR 安全、坏数据自愈、失败不炸。
 *
 * 另提供 getSessionScene / getSessionLookback，让现有游戏引擎(game/look 页)
 * 在写死的 STORY 里找不到时，回退到这一局生成的场景，从而"生成即可玩"。
 */

import type { Scene, Lookback } from "@/lib/story";
import {
  isStoryOutline,
  type CounselTurn,
  type GeneratedGame,
  type StoryOutline,
} from "@/lib/generated-story";

const KEY = "rose:create-session";

export interface CreateSession {
  /** 用户原始自述 */
  story: string;
  /** 拆解产出 */
  outline: StoryOutline;
  /** 情节生成产出(可玩)；未生成时无 */
  game?: GeneratedGame;
  /** 心理陪伴 buddy 的对话历史 */
  counsel?: CounselTurn[];
  updatedAt: number;
}

function isCreateSession(value: unknown): value is CreateSession {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<CreateSession>;
  return (
    typeof s.story === "string" &&
    isStoryOutline(s.outline) &&
    typeof s.updatedAt === "number"
  );
}

export function readCreateSession(): CreateSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCreateSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCreateSession(session: CreateSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...session, updatedAt: Date.now() })
    );
  } catch {
    // 隐私模式或空间不足时，流程本身仍可继续(内存态由页面自己持有)。
  }
}

/**
 * 用一份新的 outline 开一局(会清掉上一局的 game / counsel)。
 */
export function startCreateSession(
  story: string,
  outline: StoryOutline
): CreateSession {
  const session: CreateSession = { story, outline, updatedAt: Date.now() };
  writeCreateSession(session);
  return session;
}

/**
 * 往当前会话上打补丁(如写入 game 或追加 counsel)。没有在跑的会话则忽略。
 */
export function patchCreateSession(
  patch: Partial<Omit<CreateSession, "updatedAt">>
): CreateSession | null {
  const current = readCreateSession();
  if (!current) return null;
  const next: CreateSession = { ...current, ...patch, updatedAt: Date.now() };
  writeCreateSession(next);
  return next;
}

export function clearCreateSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 清不掉也不影响开新局。
  }
}

/* ─── 引擎解析器：让 game / look 页能玩这一局生成的内容 ─── */

/**
 * 生成场景优先按 id 命中；找不到返回 undefined，调用方再回退写死的 STORY。
 *
 * onDone 被就地改写：生成局不接固定故事的回看地图，一幕演完接下一幕，
 * 演完最后一幕回到 /create 的心理陪伴环节。这样游戏引擎无需改动跳转逻辑。
 */
export function getSessionScene(id: string): Scene | undefined {
  const game = readCreateSession()?.game;
  if (!game) return undefined;
  const idx = game.scenes.findIndex((s) => s.id === id);
  if (idx < 0) return undefined;
  const next = game.scenes[idx + 1];
  return {
    ...game.scenes[idx],
    onDone: next ? `/game?scene=${next.id}` : "/create?step=buddy",
  };
}

export function getSessionLookback(id: string): Lookback | undefined {
  return readCreateSession()?.game?.lookbacks.find((l) => l.id === id);
}
