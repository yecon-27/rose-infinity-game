/**
 * Rose Infinity · 禁词表(台词风格圣经第二部分 · 三)
 *
 * 来源:docs/writing/dialogue-style-guide.md 第三部分「禁词表」。
 *
 * 语气分级(核心):
 *   - 甜蜜期(warm)放宽:允许长句、会闹会贫、感叹号、两人共享的旧梗、有生气。
 *   - 僵持期(strained)收紧:话极短、冷处理、圆滑躲闪 / 体面收住。
 *   - 但有**三条两个阶段都禁**:①撒娇/嗲、②让角色"知道自己在可爱"的台词、③网文梗。
 *
 * 一句话原则:**幽默是熟的,不是甜的——她自己不觉得好笑。**
 *
 * 本文件是禁词表的唯一来源(npc-prompt.ts / 任何 prompt 构造器都从这里取),
 * 改这里 = 改全局。
 */

export type Phase = "warm" | "strained";

/**
 * 两个阶段都禁的词 / 模式。
 * 这三条是「核心不变」的部分——哪怕甜蜜期放宽,这些也不松。
 */
export const CROSS_PHASE_BANS = {
  /** ① 撒娇 / 嗲:具体词、符号、句式(两阶段都禁) */
  coy: [
    "傻子",
    "~", // 波浪号撒娇
    "噗",
    "哈哈",
    "阿 X 同学", // 「阿 X 同学」式的腻称
    "就喜欢你这么", // 「就喜欢你这么 XX」式自觉可爱
    "我,不,吃", // 字词间加顿号的强调式(代表模式)
  ],
  /** ③ 网文梗(两阶段都禁) */
  webNovel: ["殉职", "上道", "拿捏", "破防"],
  /**
   * 自我点破潜台词(两阶段都禁,带使用约束):
   * 「别想多」「开玩笑的」每幕至多一次,且必须是**溜出真话后的找补**;
   * 「说好了啊」一律禁。
   */
  selfDefeating: ["别想多", "开玩笑的", "说好了啊"],
} as const;

/**
 * 僵持期(strained)额外的禁令——冷语气专属。
 * 甜蜜期不适用,别把冷的克制套到热的段上。
 */
export const STRAINED_ONLY_BANS = {
  /** 感叹号(冷语气里出现即重写) */
  exclamation: "!",
  /** 单句字数上限:超过必须是事务性内容(地址、安排、点单) */
  maxChars: 15,
  /** 额外禁:解释情绪、任何流畅漂亮的告白 */
  extra: [
    "解释情绪",
    "流畅漂亮的告白",
  ],
} as const;

/**
 * 甜蜜期(warm)放宽的清单——明确告诉 LLM 这些在 warm 段是允许的,
 * 防止它把僵持期的克制错套到甜蜜期。
 */
export const WARM_ALLOWANCES = [
  "允许长句",
  "允许会闹会贫",
  "允许感叹号",
  "允许两人共享的旧梗",
  "允许有生气",
] as const;

/** 一句话原则,两阶段都成立 */
export const CORE_PRINCIPLE = "幽默是熟的,不是甜的——她自己不觉得好笑。";

/**
 * 渲染为喂给 LLM 的禁词提示文本。按阶段分级输出。
 * npc-prompt.ts 在「语言铁律」一节里直接拼入这段。
 */
export function bannedWordsNote(phase: Phase): string {
  const cross = CROSS_PHASE_BANS;
  const lines: string[] = [];

  lines.push(`【两阶段都禁(核心不变)】`);
  lines.push(
    `- ① 撒娇/嗲:${cross.coy.join("、")}。以及一切字词间加顿号的强调式(「我,不,吃」)。`
  );
  lines.push(`- ② 网文梗:${cross.webNovel.join("、")}。`);
  lines.push(
    `- ③ 让角色"知道自己在可爱"的台词——幽默必须是干的、冷的、她自己不觉得好笑的。`
  );
  lines.push(
    `- 自我点破潜台词:「${cross.selfDefeating.slice(0, 2).join("」「")}」每幕至多一次,且必须是溜出真话后的找补;「${cross.selfDefeating[2]}」一律禁。`
  );

  if (phase === "warm") {
    lines.push("");
    lines.push(`【甜蜜期(warm)放宽】`);
    lines.push(`${WARM_ALLOWANCES.map((a) => `- ${a}`).join("\n")}`);
    lines.push(
      `- 别把僵持期的克制套到这里:整段关系若全程冷,就不像真实发生。`
    );
  } else {
    const s = STRAINED_ONLY_BANS;
    lines.push("");
    lines.push(`【僵持期(strained)额外禁】`);
    lines.push(`- 感叹号("${s.exclamation}")出现即重写。`);
    lines.push(
      `- 单句常态 ≤ ${s.maxChars} 字;超过 ${s.maxChars} 字必须是事务(地址、安排、点单)。`
    );
    lines.push(`- ${s.extra.join("、")}。`);
  }

  lines.push("");
  lines.push(`原则:${CORE_PRINCIPLE}`);
  return lines.join("\n");
}
