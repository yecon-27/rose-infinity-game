/**
 * 场景数据结构
 *
 * 把每幕的脚本抽成数据,游戏页通用渲染。
 * 一幕 = 开场旁白 + 阿默开场白 + N 轮玩家输入 + 收尾旁白 + 金句回响
 */

export interface Scene {
  /** 唯一标识 */
  id: string;
  /** 显示名,如 "幕一 · AA 制" */
  name: string;
  /** 场景简述,喂给 LLM 当上下文 */
  brief: string;
  /** 开场旁白(多段) */
  openingNarration: string[];
  /** 阿默的开场白 */
  amosOpening: string;
  /** 教学提示(可选,首幕才显示) */
  teachingHint?: string;
  /** 本幕最大轮数 */
  maxTurns: number;
  /** 每轮阿默的"引导语"(可选,作为阿默上一句的 fallback) */
  amosPrompts?: string[];
  /** 收尾旁白(多段) */
  closingNarration: string[];
  /** 本幕金句(结局页回响用) */
  goldenQuote: string;
  /** 场景背景图路径 */
  background: string;
  /** 阿默在该幕的立绘(可选,默认 amo.png) */
  amoPortrait?: string;
  /** AI 生成内容留痕 ID,对应 docs/ai-generated/world-and-story.md */
  aiGeneratedRef: string;
}

export const SCENES: Record<string, Scene> = {
  act1_aa: {
    id: "act1_aa",
    name: "幕一 · AA 制",
    brief: "两人第七次约会,吃完饭,账单放在桌上,阿默提议 AA。",
    openingNarration: [
      "第七次约会。一家不算便宜也不算贵的餐厅,灯光暖,人不多。账单放在桌上,白纸黑字,清清楚楚。服务员站在一旁,姿势礼貌,但没走。",
      "阿默摸出手机,扫了一下二维码。动作很快——快得像是怕慢一点就会发生什么。AA 是她先提出来的,每次都是。这不是现代、独立、体面,这是她给自己留的退路。",
    ],
    amosOpening: "扫这个吧,我们 AA。",
    teachingHint:
      "下面的输入框里,写下阿沉真正想说的话。屏幕会同时显示两行:灰色半透明的是你的真心,正常显示的是他实际说出口的——那是你拦不住的。(试试写出脆弱一点的词,看看过滤器会不会松动。)",
    maxTurns: 3,
    amosPrompts: [
      "那走吧。",
      "你定呗,都行。",
      "嗯,也是。",
    ],
    closingNarration: [
      "账单清清楚楚地分完了。两个人各自付了各自的那份,不亏不欠。",
      "走出餐厅的时候,夜风有点凉。阿默走在半步之外的距离——正好够不碰到肩膀,正好够不说心里话。",
    ],
    goldenQuote: "账算得越清的两个人,越不敢欠对方一句真话。",
    background: "/images/scenes/act1_restaurant.png",
    aiGeneratedRef: "#004 / #005 / #006",
  },

  act2_bbq: {
    id: "act2_bbq",
    name: "幕二 · 烧烤局",
    brief:
      "阿默的朋友攒的烧烤局,阿沉第一次以对象身份出席。人前默契十足,散场后一路无话。",
    openingNarration: [
      "阿默的朋友攒了个烧烤局。她问你去不去的时候,语气很轻,像是无论你怎么答都行。",
      "你去了。她把你介绍给朋友的时候,笑容恰到好处——不过分热络,也不显得敷衍。她在人前总是这样,得体得像排练过。",
      "饭桌上话题来回飞,有人起哄问你们怎么在一起的。所有人的眼睛突然都亮起来,看向你们俩。",
    ],
    amosOpening: "讲讲呗,你俩怎么认识的?",
    maxTurns: 3,
    amosPrompts: [
      "哈哈,行吧。来,吃肉。",
      "哎你别说,这家烤得还真行。",
      "散了吧?有点晚了。",
    ],
    closingNarration: [
      "散场了。朋友们各自散去,你们俩并排走在回家的路上。",
      "夜里的风把烧烤味吹散了一些。阿默走在你旁边,半步距离——和餐厅里那个会笑会接话的她,像两个人。",
      "走了很久,她忽然开口。",
    ],
    goldenQuote: "人前的默契是表演,表演是安全的;人后的沉默才是真的。",
    background: "/images/scenes/act2_bbq.png",
    amoPortrait: "/images/characters/amo-distant.png",
    aiGeneratedRef: "#008 / #009 / #010",
  },

  act5_end: {
    id: "act5_end",
    name: "幕五 · 没有争吵的结束",
    brief:
      "普通的一天,没有导火索。一句'最近好像都挺忙的',关系就结束了——没有人说出'分手'两个字。",
    openingNarration: [
      "又是一个普通的周末。没有什么特别的事发生。",
      "阿默在收拾东西,动作不快不慢。她忽然停下来,看了一眼窗外,像在想什么,又像什么都没想。",
      "然后她转过头,说出了那句话。语气很轻,轻到像是怕砸坏什么。",
    ],
    amosOpening: "最近好像都挺忙的……要不,先这样?",
    maxTurns: 1,
    amosPrompts: [],
    closingNarration: [
      "你没有挽留。她也没有等你挽留。",
      "门关上的时候很轻,轻到不像一次结束。",
      "你们没有吵架,没有摔东西,没有一句重话。谁也说不清是哪天结束的——这才是最窒息的部分。",
    ],
    goldenQuote: "他们的爱情没有死因。它只是没有活下去。",
    background: "/images/scenes/act5_room.png",
    amoPortrait: "/images/characters/amo-resigned.png",
    aiGeneratedRef: "#011 / #012 / #013",
  },
};

/** 游戏流程:幕一 → 幕二 → 幕五 */
export const ACT_SEQUENCE: Scene[] = [SCENES.act1_aa, SCENES.act2_bbq, SCENES.act5_end];

/** 根据 URL 参数或 ID 查找场景 */
export function getScene(id: string): Scene | undefined {
  return SCENES[id];
}

/** 下一幕 */
export function nextScene(currentId: string): Scene | undefined {
  const idx = ACT_SEQUENCE.findIndex((s) => s.id === currentId);
  if (idx === -1 || idx >= ACT_SEQUENCE.length - 1) return undefined;
  return ACT_SEQUENCE[idx + 1];
}
