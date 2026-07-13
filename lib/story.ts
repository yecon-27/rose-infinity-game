/**
 * Rose Infinity · 场景数据(新模型)
 *
 * 彻底告别旧的"过滤器"结构。核心不是"输入被改写",是**选择 + 看见**:
 *   - 前段"活一遍":玩家(Vera)从几个都合理的选项里挑一个,推进温暖的日常。
 *   - reach 标记:标出"伸手"的瞬间(她/他在靠近)。第一遍玩家未必看得出;
 *     回看时,"看见"机制据此揭示对方那一侧当时没说出口的心情。
 *   - phase 决定语气温度(warm 热 / strained 冷),对齐 npc-prompt 与设计基准。
 *
 * 设计依据:docs/writing/dialogue-style-guide.md 第一部分。
 */

export type Phase = "warm" | "strained";
export type Speaker = "vera" | "sean" | "narr";

/** 开口节拍里,玩家可选的一句话 */
export interface Choice {
  text: string;
  /**
   * 这句(或这一拍)是不是"伸手"——她/他在靠近、在给对方一个机会。
   * 第一遍未必看得出;"看见"机制用它标记玩家当年错过/接住的瞬间。
   */
  reach?: boolean;
  /** 选这项时,玩家角色切换到的表情(emotion key,如 "composed") */
  face?: string;
  /**
   * 选后对方的回应。可留空 → 交给 /api/npc 依 phase + direction 现场生成。
   * 写死则用于关键情感拍,保证情绪精准。每句可带 face 切换说话者表情。
   */
  reply?: Array<{ who: Speaker; text: string; face?: string }>;
  /** 编剧给 NPC 的自然语言表演指示(喂 LLM,也供作者理解) */
  direction?: string;
}

export type Moment =
  | { kind: "narr"; text: string }
  | { kind: "line"; who: Exclude<Speaker, "narr">; text: string; face?: string }
  /** 幕中切换背景(如从会场走到楼梯间);瞬间生效,不占对话框 */
  | { kind: "bg"; src: string }
  /** 不带台词地切换某人的表情(emotion key) */
  | { kind: "face"; who: Exclude<Speaker, "narr">; emotion: string }
  | {
      kind: "beat";
      /** 引导语,如"他眼睛没离屏幕。你想凑近他——" */
      prompt: string;
      /** 此刻在发生什么(给玩家情境,也作 NPC 上下文) */
      situation?: string;
      choices: Choice[];
    };

export interface Scene {
  id: string;
  title: string;
  phase: Phase;
  /** 背景图路径 */
  bg: string;
  /** 进场时的初始表情(emotion key),默认 warm */
  veraFace?: string;
  seanFace?: string;
  brief: string;
  /** 玩家视角(默认 vera) */
  pov?: Exclude<Speaker, "narr">;
  script: Moment[];
}

/* ─────────── 甜蜜期 · 锚点一 · 那晚的荷叶包鸡 ───────────
 * 取自真实经历,已典型化。表面是甜蜜期的暖,底下是全局"做对的一次"的范本:
 * 一次成功的修复——她先肯定、再用事实说需求;他接住、承认、道谢。
 * 种子:①他一过载就对她下线;②她把自己的需求排在后勤和肯定他之后(优雅,也是自我消音)。
 */
export const HACKATHON_NIGHT: Scene = {
  id: "warm_hackathon",
  title: "那晚的荷叶包鸡",
  phase: "warm",
  bg: "/images/scenes/hackathon-venue.png",
  seanFace: "focused",
  brief:
    "黑客松熬到深夜。晚饭凉在长桌那头,他还在赶代码。你也是这队的人,手里只有一杯给他续到第三回的美式。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "深夜的黑客松现场。长桌那头,主办方包的晚饭凉了。屏幕的光把一屋子人的脸照得发青。",
    },
    {
      kind: "narr",
      text: "你也是这队的人。但此刻你手里没有代码,只有一杯给他续到第三回、早就不冒热气的美式。",
    },
    {
      kind: "line",
      who: "sean",
      text: "等一下下,等阿泽把那个分支 push 上来就好……马上。",
    },
    { kind: "narr", text: "“马上”,他今晚说过第四回了。" },
    {
      kind: "beat",
      prompt: "他眼睛没离屏幕。你想凑近他——",
      situation: "黑客松深夜,他埋头赶代码,你想要一点回应。",
      choices: [
        {
          text: "从背后捶捶他的肩。",
          reach: true,
          reply: [{ who: "sean", text: "嗯……你先歇会儿。" }],
        },
        {
          text: "握住他敲键盘的那只手。",
          reach: true,
          reply: [
            {
              who: "narr",
              text: "他“嗯”了一声,手从你掌心底下抽出来,继续打字。",
            },
          ],
        },
        {
          text: "凑过去,等一个眼神。",
          reach: true,
          reply: [{ who: "narr", text: "他没有看你。屏幕的光在他镜片上跳。" }],
        },
      ],
    },
    { kind: "narr", text: "好,收到。今晚全世界最要紧的,是那个分支。" },
    { kind: "narr", text: "别人吃完陆续回来了。" },
    { kind: "line", who: "vera", text: "那我点外卖了。" },
    { kind: "line", who: "sean", text: "随便。你点吧。" },
    {
      kind: "beat",
      prompt: "他说“随便”。可他要真吃了辣的,会一整晚不吭声。你点——",
      situation: "替他点外卖。他广东人,吃清淡。",
      choices: [
        {
          text: "荷叶包鸡。你们常点的那家。",
          reach: true,
          reply: [
            { who: "narr", text: "你没问他,直接点了。你太清楚他的胃了。" },
          ],
        },
        {
          text: "问一句“你想吃什么”。",
          reply: [{ who: "sean", text: "都行,你定。" }],
        },
      ],
    },
    { kind: "bg", src: "/images/scenes/hackathon-stairs.png" },
    {
      kind: "narr",
      text: "外卖到了。你把他从屏幕前拽起来。楼梯间,夜黑透了,有人陆续下楼回家,脚步声在楼道里荡。",
    },
    { kind: "line", who: "sean", text: "好累。", face: "tired" },
    {
      kind: "narr",
      text: "他抱住你,一股脑倒出来:队友好多东西不懂,早上技术选型选错了,review 代码纯属浪费工夫,vercel 免费版简直是垃圾……",
    },
    { kind: "narr", text: "你一句没插,把打包盒一个个开好,筷子摆正。" },
    {
      kind: "beat",
      prompt: "他终于停下来。这一刻,你想说——",
      situation: "楼梯上,他刚倒完苦水。你等了他一整晚,他一直没正面回应你。",
      choices: [
        {
          text: "“你当队长已经很好了。……不过你今天也忽略我了,我说了好几次我饿,你都没正面回应。但我知道你难,所以这些我弄好了。”",
          reach: true,
          direction:
            "她先肯定他、再用事实(不是指责)说出自己的委屈。这是成功修复的范本。",
          reply: [
            {
              who: "sean",
              text: "……谢谢你能跟我说。我都没意识到。我就是太累了,累到没法回应你。",
              face: "warm",
            },
            { who: "narr", text: "他抱得更紧了。楼梯间的灯忽明忽暗。" },
          ],
        },
        {
          text: "“没事,你辛苦了,快趁热吃。”",
          face: "composed",
          direction: "她把委屈咽下去,只哄他——又一次把自己排在后面。",
          reply: [
            { who: "sean", text: "嗯。你也吃。" },
            {
              who: "narr",
              text: "你把委屈和荷叶一起,叠好,压在了盒底。",
            },
          ],
        },
        {
          text: "“你眼里就只有代码。”",
          direction: "带刺先扎。他会缩。",
          reply: [
            { who: "sean", text: "……我不是。今天真的忙。", face: "guilty" },
            {
              who: "narr",
              text: "他松开手去够筷子。那点想靠近的气,散了。",
            },
          ],
        },
      ],
    },
    {
      kind: "narr",
      text: "楼梯上两盒饭,热气重新升起来。荷叶掀开,是他老家的味道。",
    },
    {
      kind: "narr",
      text: "你们没聊房子。可那天晚上,那座还没影的小房子,好像又近了一点。",
    },
  ],
};

/** 剧本序列(随开发递增) */
export const STORY: Scene[] = [HACKATHON_NIGHT];

export function getStoryScene(id: string): Scene | undefined {
  return STORY.find((s) => s.id === id);
}
