/**
 * 过滤强度隐藏判定
 *
 * prd 2.2 设计意图:"玩家会逐渐发现'我可以通过某些行为让过滤器变弱'
 * ——努力的方向不是'说服对方',而是'卸下自己的防御'。"
 *
 * MVP 简化规则:
 *   - 默认高档(完全改写)
 *   - 玩家输入中含"暴露性关键词"→ 降为低档(漏一半再找补)
 *   - 暴露性关键词 = 直接表达脆弱/需求/依恋的词
 *
 * 后续扩展(prd 四档):加入"暴露时刻"累积系统、穿透特殊触发
 */

export type FilterIntensity = "high" | "low";

/**
 * 穿透触发阈值:整局累积的"暴露时刻"(低强度轮次)达到该值,
 * 终幕最后一拍过滤器碎裂,玩家的话原样说出——prd 2.2 的"穿透"档。
 * 努力的方向不是说服对方,而是卸下自己的防御:卸得够多,最后才有资格说真话。
 */
export const PIERCE_THRESHOLD = 3;

/**
 * 暴露性关键词词典。
 * 命中任一即视为玩家在尝试卸下防御 → 过滤器减弱。
 */
const EXPOSURE_KEYWORDS: string[] = [
  // 直接的依恋表达
  "想你",
  "想见你",
  "需要你",
  "在乎你",
  "喜欢你",
  "我爱你",
  "别走",
  "别离开",
  "留下来",
  // 脆弱/恐惧
  "害怕",
  "怕",
  "担心",
  "难过",
  "难过",
  "撑不住",
  "累",
  "孤独",
  "孤单",
  // 道歉/认错(暴露责任感的让步)
  "对不起",
  "我错了",
  "是我不好",
  "抱歉",
  // 关系追问(暴露想要确定性的渴望)
  "我们算什么",
  "我们之间",
  "我们需要谈谈",
  "你到底",
  "为什么不",
  // 承诺意愿
  "我想陪你",
  "我在",
  "我一直在",
];

/**
 * 判定本次输入应使用的过滤强度。
 *
 * @param input 玩家输入的真心话
 * @param turnIndex 当前是第几轮(0-based),用于后续做累积规则
 * @param history 前序输入历史,用于未来扩展累积暴露时刻
 */
export function decideIntensity(
  input: string,
  _turnIndex: number,
  _history: string[] = []
): FilterIntensity {
  // 命中任意暴露词 → 低档(漏一半)
  // 没命中 → 高档(完全改写)
  return hasExposure(input) ? "low" : "high";
}

/** 输入中是否含暴露性表达(也用于判定穿透时刻玩家有没有真的说出真话) */
export function hasExposure(input: string): boolean {
  const text = input.toLowerCase();
  return EXPOSURE_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

/**
 * 给玩家的隐式反馈:在 UI 上用文案暗示强度的变化。
 * 不直接说"过滤强度:低",而是用叙事性提示。
 */
export function intensityHint(intensity: FilterIntensity): string | null {
  return intensity === "low"
    ? "你迟疑了一下,某个词差点溜出来。"
    : null;
}
