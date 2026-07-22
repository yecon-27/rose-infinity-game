/**
 * Agent C · 画面托底映射
 *
 * B 生成的场景一律用 title_keyart 兜底(不破图但画面空)。这里按场景的
 * 标题/简介/phase 关键词，把它映射到项目现有的真实场景图，画面立刻有内容。
 * 纯查表，不调任何模型：快、稳、零破图。要更进一步再上大模型生图(见 docs)。
 *
 * 背景音不在这里管：生成场景 id 命不中 SCENE_SOUNDS，soundscapeForScene 会
 * 自动回退到默认背景乐，已满足"只要背景音"的需求。
 */

import type { GeneratedGame } from "@/lib/generated-story";
import type { Moment, Phase, Scene } from "@/lib/story";

const img = (name: string) => `/images/scenes/${name}.webp`;

/** 关键词 → 现有场景图。命中即用，从上到下先到先得。 */
const KEYWORD_BG: ReadonlyArray<readonly [RegExp, string]> = [
  [/发烧|生病|退烧|不舒服|病了/, "fever-night"],
  [/便利店|夜班|超市|收银|店里/, "konbini-night"],
  [/车站|高铁|火车|机场|异地|送别|离开|远行/, "departure-station"],
  [/门口|门前|敲门|门外/, "dorm-doorway-night"],
  [/宿舍|寝室|出租屋/, "dorm-room-night"],
  [/商场|逛街|试衣|买衣|购物/, "mall-fitting"],
  [/校园|操场|教室|图书馆|上课|学校|毕业/, "campus-bench"],
  [/加班|项目|比赛|通宵|赶工|黑客松|deadline|工位/, "hackathon-venue"],
  [/未来|搬家|新家|房子|以后一起|同居/, "future-apartment"],
  [/阳光|晴|白天|早上/, "sunny-dorm"],
];

const PHASE_FALLBACK: Record<Phase, string> = {
  warm: "warm-room",
  strained: "dorm-room-night",
};

/** 给一段文字 + phase 选一张最贴的现有背景图 */
export function pickSceneBg(text: string, phase: Phase): string {
  for (const [re, name] of KEYWORD_BG) {
    if (re.test(text)) return img(name);
  }
  return img(PHASE_FALLBACK[phase]);
}

function remapScene(scene: Scene): Scene {
  const text = `${scene.title} ${scene.brief}`;
  const bg = pickSceneBg(text, scene.phase);
  const script: Moment[] = scene.script.map((m) =>
    // 幕中背景切换也一并托底，避免 title_keyart 中途跳回来
    m.kind === "bg" ? { ...m, src: bg } : m
  );
  return { ...scene, bg, script };
}

/**
 * 把生成游戏里所有场景的背景图，从 title_keyart 兜底替换成贴题的真实图。
 * 不改台词、不改玩法，只动画面。
 */
export function withMappedBg(game: GeneratedGame): GeneratedGame {
  return { ...game, scenes: game.scenes.map(remapScene) };
}
