/**
 * Agent B · 情节生成
 *
 * LLM 只负责在既有事实内润色。本文件同时保留一套确定性的本地生成器，
 * 所以没有网络、没有密钥或模型输出坏 JSON 时，游戏仍然能进入一幕并完成回看。
 */

import {
  isGeneratedGame,
  type GeneratedGame,
  type OutlineConflict,
  type StoryOutline,
} from "@/lib/generated-story";

type Scene = GeneratedGame["scenes"][number];
type Lookback = GeneratedGame["lookbacks"][number];
type Choice = Extract<Scene["script"][number], { kind: "beat" }>["choices"][number];

const FALLBACK_BG = "/images/scenes/title_keyart.webp";
const TITLE_POOL = ["余温", "稍后", "空白", "回声", "未读", "原地"] as const;
const GESTURES = new Set(["hold", "swipe", "longpress"]);

function cleanText(value: unknown, max = 240): string {
  return typeof value === "string"
    ? value.trim().replace(/——/g, "，").slice(0, max)
    : "";
}

function normalizeOutline(outline: StoryOutline): StoryOutline {
  const rawConflicts = Array.isArray(outline.conflicts)
    ? (outline.conflicts as unknown[])
    : [];
  const conflicts = rawConflicts
    .map((value, index): OutlineConflict | null => {
      if (!value || typeof value !== "object") return null;
      const item = value as Record<string, unknown>;
      const situation = cleanText(item.situation);
      if (!situation) return null;
      return {
        id: cleanText(item.id, 48) || `conflict-${index + 1}`,
        situation,
        selfMove: cleanText(item.selfMove),
        otherMove: cleanText(item.otherMove),
        missedReach:
          cleanText(item.missedReach) || "当时看不清是谁先把话收了回去。",
        phase: item.phase === "warm" ? "warm" : "strained",
      };
    })
    .filter((value): value is OutlineConflict => value !== null)
    .slice(0, 6);

  const cleanList = (value: unknown, maxItems: number) =>
    (Array.isArray(value) ? value : [])
      .map((item) => cleanText(item, 200))
      .filter(Boolean)
      .slice(0, maxItems);

  return {
    people: Array.isArray(outline.people) ? outline.people : [],
    arc: Array.isArray(outline.arc)
      ? outline.arc
          .filter(
            (item): item is StoryOutline["arc"][number] =>
              Boolean(
                item &&
                  (item.phase === "warm" || item.phase === "strained") &&
                  cleanText(item.label)
              )
          )
          .map((item) => ({ ...item, label: cleanText(item.label, 120) }))
          .slice(0, 8)
      : [],
    conflicts,
    patterns: cleanList(outline.patterns, 6),
    breachType: outline.breachType,
    keyLines: cleanList(outline.keyLines, 12),
  };
}

function slugPart(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return slug || "memory";
}

function sceneIdsFor(outline: StoryOutline): string[] {
  const used = new Set<string>();
  return outline.conflicts.map((conflict, index) => {
    const base = `gen-${slugPart(conflict.id || `conflict-${index + 1}`)}`;
    let id = base;
    let suffix = 2;
    while (used.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(id);
    return id;
  });
}

function meaningfulChars(value: string): Set<string> {
  return new Set(
    Array.from(value).filter(
      (char) => /[\p{L}\p{N}]/u.test(char) && !"的了是在有我他她你就都又把很".includes(char)
    )
  );
}

function overlapScore(line: string, fact: string): number {
  const factChars = meaningfulChars(fact);
  return Array.from(meaningfulChars(line)).reduce(
    (score, char) => score + (factChars.has(char) ? 1 : 0),
    0
  );
}

function bestLine(lines: string[], fact: string, excluded?: string): string | undefined {
  if (!fact) return undefined;
  let best: string | undefined;
  let bestScore = 1;
  for (const line of lines) {
    if (line === excluded) continue;
    const score = overlapScore(line, fact);
    if (score > bestScore) {
      best = line;
      bestScore = score;
    }
  }
  return best;
}

function hiddenSpeaker(outline: StoryOutline, conflict: OutlineConflict): "vera" | "sean" {
  const self = outline.people.find((person) => person.role === "self");
  const other = outline.people.find((person) => person.role === "other");
  const text = conflict.missedReach.trim();

  if (self?.name && text.includes(self.name)) return "vera";
  if (other?.name && text.includes(other.name)) return "sean";
  if (/^(她|他)/.test(text)) {
    const pronoun = text[0];
    if (self?.gender === "f" && pronoun === "她") return "vera";
    if (self?.gender === "m" && pronoun === "他") return "vera";
    if (other?.gender === "f" && pronoun === "她") return "sean";
    if (other?.gender === "m" && pronoun === "他") return "sean";
  }
  return "sean";
}

function actualChoice(
  conflict: OutlineConflict,
  selfLine: string | undefined,
  otherLine: string | undefined
): Choice {
  const reply: NonNullable<Choice["reply"]> = otherLine
    ? [{ who: "sean", text: otherLine }]
    : conflict.otherMove
      ? [{ who: "narr", text: conflict.otherMove }]
      : [{ who: "narr", text: "对面安静了一会儿。" }];

  return {
    text: conflict.selfMove || "照当时那样回应",
    ...(selfLine ? { say: selfLine } : {}),
    gesture: "hold",
    reach: true,
    reply,
    direction: `只依据这段事实回应：${conflict.otherMove || conflict.missedReach}`,
  };
}

function askAgainChoice(): Choice {
  return {
    text: "问一句“你是不是还有话没说？”",
    say: "你是不是还有话没说？",
    gesture: "swipe",
    reach: true,
    reply: [{ who: "narr", text: "这一次，你没有替对方把答案说完。" }],
    direction: "这是一次重走的选择，不补写对方当年的答案。",
  };
}

function sceneFromConflict(
  outline: StoryOutline,
  conflict: OutlineConflict,
  index: number,
  id: string
): { scene: Scene; lookback: Lookback } {
  const selfLine = bestLine(outline.keyLines, conflict.selfMove);
  const otherLine = bestLine(outline.keyLines, conflict.otherMove, selfLine);
  const title = TITLE_POOL[index % TITLE_POOL.length];
  const surface = [conflict.selfMove, conflict.otherMove].filter(Boolean).join("。") || conflict.situation;

  const scene: Scene = {
    id,
    title,
    phase: conflict.phase,
    bg: FALLBACK_BG,
    portraits: "none",
    brief: [conflict.situation, conflict.selfMove, conflict.otherMove]
      .filter(Boolean)
      .join("。"),
    pov: "vera",
    onDone: `/look?id=${encodeURIComponent(id)}`,
    script: [
      { kind: "narr", text: conflict.situation },
      {
        kind: "beat",
        prompt: "话到了这里。你想怎么接？",
        situation: conflict.situation,
        choices: [
          actualChoice(conflict, selfLine, otherLine),
          askAgainChoice(),
        ],
      },
      { kind: "narr", text: "这一刻过去了。有句话留在了当时。" },
    ],
  };

  const lookback: Lookback = {
    id,
    title,
    intro: ["再回到这一刻。", "这次，慢一点看。"],
    moments: [
      {
        bg: FALLBACK_BG,
        surface,
        hidden: conflict.missedReach,
        who: hiddenSpeaker(outline, conflict),
      },
    ],
    hidePortraits: true,
    reachback: {
      prompt: "如果能把这一刻接回来，你想怎么做？",
      choice: "把那句没说完的话问清楚",
      response: ["这一次，那句话有了被听见的位置。"],
    },
    outro: ["不是所有迟到的话，都来不及说。"],
  };

  return { scene, lookback };
}

function emptyGame(outline: StoryOutline): GeneratedGame {
  const id = "gen-memory";
  const fact = outline.keyLines[0] || outline.patterns[0];
  return {
    entrySceneId: id,
    scenes: [
      {
        id,
        title: "未寄出",
        phase: outline.arc.at(-1)?.phase ?? "warm",
        bg: FALLBACK_BG,
        portraits: "none",
        brief: fact || "这段故事还没有拆出可以重走的一幕。",
        pov: "vera",
        onDone: `/look?id=${id}`,
        script: [
          {
            kind: "narr",
            text: fact || "有些话还没整理好。先从这一刻停下来。",
          },
          {
            kind: "beat",
            prompt: "先停一下。",
            choices: [
              {
                text: "把这一刻记下来",
                say: "我还想再想想。",
                gesture: "hold",
                reach: true,
                reply: [{ who: "narr", text: "好，先留在这里。" }],
              },
            ],
          },
        ],
      },
    ],
    lookbacks: [
      {
        id,
        title: "未寄出",
        intro: ["先不急着往前。"],
        moments: [
          {
            bg: FALLBACK_BG,
            surface: fact || "当时留下的内容还不够清楚。",
            hidden: "没说完的地方，先留在这里。",
            who: "sean",
          },
        ],
        hidePortraits: true,
        reachback: {
          prompt: "现在想补一句什么？",
          choice: "等想清楚了，再好好说",
          response: ["这一次，不用急着替沉默下结论。"],
        },
        outro: ["故事可以从下一句再开始。"],
      },
    ],
  };
}

/** 不依赖网络的确定性兜底。每个 conflict 恰好生成一幕和一段同 id 回看。 */
export function buildFallbackGame(rawOutline: StoryOutline): GeneratedGame {
  const outline = normalizeOutline(rawOutline);
  if (outline.conflicts.length === 0) {
    const game = emptyGame(outline);
    if (!isGeneratedGame(game) || !isPlayableGeneratedGame(game)) {
      throw new Error("本地场景兜底生成失败");
    }
    return game;
  }

  const ids = sceneIdsFor(outline);
  const generated = outline.conflicts.map((conflict, index) =>
    sceneFromConflict(outline, conflict, index, ids[index])
  );
  const game: GeneratedGame = {
    scenes: generated.map((item) => item.scene),
    lookbacks: generated.map((item) => item.lookback),
    entrySceneId: ids[0],
  };

  if (!isGeneratedGame(game) || !isPlayableGeneratedGame(game, ids)) {
    throw new Error("本地场景兜底生成失败");
  }
  return game;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

/**
 * 比共享 guard 更严格的引擎入口检查。共享 guard 负责契约顶层，本检查确保
 * beat、gesture、reach、回看揭示和 reachback 都实际存在。
 */
export function isPlayableGeneratedGame(
  value: unknown,
  expectedSceneIds?: string[]
): value is GeneratedGame {
  if (!isGeneratedGame(value)) return false;
  if (JSON.stringify(value).includes("——")) return false;

  const sceneIds = new Set<string>();
  for (const scene of value.scenes) {
    if (
      !scene ||
      typeof scene.id !== "string" ||
      !scene.id ||
      sceneIds.has(scene.id) ||
      typeof scene.title !== "string" ||
      !scene.title ||
      (scene.phase !== "warm" && scene.phase !== "strained") ||
      typeof scene.bg !== "string" ||
      !scene.bg ||
      typeof scene.brief !== "string" ||
      !Array.isArray(scene.script)
    ) {
      return false;
    }
    sceneIds.add(scene.id);

    const beats = scene.script.filter(
      (moment): moment is Extract<typeof moment, { kind: "beat" }> =>
        moment?.kind === "beat"
    );
    if (beats.length === 0) return false;
    if (
      !beats.some(
        (beat) =>
          Array.isArray(beat.choices) &&
          beat.choices.some(
            (choice) =>
              choice &&
              typeof choice.text === "string" &&
              Boolean(choice.text) &&
              choice.reach === true &&
              typeof choice.gesture === "string" &&
              GESTURES.has(choice.gesture)
          )
      )
    ) {
      return false;
    }
  }

  if (expectedSceneIds) {
    if (value.scenes.length !== expectedSceneIds.length) return false;
    if (expectedSceneIds.some((id) => !sceneIds.has(id))) return false;
  }

  const lookbackIds = new Set<string>();
  for (const lookback of value.lookbacks) {
    if (
      !lookback ||
      typeof lookback.id !== "string" ||
      !sceneIds.has(lookback.id) ||
      lookbackIds.has(lookback.id) ||
      !Array.isArray(lookback.moments) ||
      lookback.moments.length === 0 ||
      !lookback.moments.every(
        (moment) =>
          isRecord(moment) &&
          typeof moment.bg === "string" &&
          Boolean(moment.bg) &&
          typeof moment.surface === "string" &&
          Boolean(moment.surface) &&
          typeof moment.hidden === "string" &&
          Boolean(moment.hidden) &&
          (moment.who === "vera" || moment.who === "sean")
      ) ||
      !lookback.reachback ||
      typeof lookback.reachback.prompt !== "string" ||
      !lookback.reachback.prompt ||
      typeof lookback.reachback.choice !== "string" ||
      !lookback.reachback.choice ||
      !Array.isArray(lookback.reachback.response) ||
      lookback.reachback.response.length === 0
    ) {
      return false;
    }
    lookbackIds.add(lookback.id);
  }

  return Array.from(sceneIds).every((id) => lookbackIds.has(id));
}

export function buildSceneGenerationPrompt(rawOutline: StoryOutline): string {
  const outline = normalizeOutline(rawOutline);
  const fallback = buildFallbackGame(outline);
  return `你是叙事游戏《玫瑰无限》的场景编剧。把下一条消息里的 StoryOutline 写成可直接交给游戏引擎的 GeneratedGame JSON。

只输出一个 JSON 对象，不要 Markdown，不要代码块，不要解释。

硬性规则：
- 唯一事实来源是 StoryOutline，不新增时间、地点、动作、病症、创伤、动机或过去发生的对话。
- 每个 conflict 恰好生成一幕 Scene 和一段同 id 的 Lookback，scene id 必须使用指定 id。
- 每幕 script 至少有一个 beat。关键选择必须带 gesture，值只能是 hold、swipe、longpress；伸手的选择必须有 reach:true。
- 每段 Lookback 必须有非空 moments，包含 surface、hidden、who，并有完整 reachback。
- entrySceneId 必须是第一幕 id。
- 标题两到四个字，含蓄，不直接概括冲突。台词要像人平常说话。
- 任何文本都不要使用连续破折号。
- bg 一律使用 ${FALLBACK_BG}，portraits 使用 none，避免引用不存在的素材。
- self 映射为 vera，other 映射为 sean，玩家视角 pov 为 vera。
- 可以设计“重走一次”的反事实选项，但必须明确是此刻的新选择，不能伪装成过去真实发生过的事。

下面是完全合法的字段形状参考。只参考结构，不要抄它的文案：
${JSON.stringify(fallback)}

指定 scene ids：${JSON.stringify(fallback.scenes.map((scene) => scene.id))}`;
}

/** 解析模型 JSON，并用共享 guard 与可玩性检查双重自校验。 */
export function parseGeneratedGame(
  raw: string,
  rawOutline: StoryOutline
): GeneratedGame | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }

  const outline = normalizeOutline(rawOutline);
  const expectedIds =
    outline.conflicts.length > 0 ? sceneIdsFor(outline) : ["gen-memory"];
  return isGeneratedGame(parsed) && isPlayableGeneratedGame(parsed, expectedIds)
    ? parsed
    : null;
}
