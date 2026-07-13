/**
 * Rose Infinity · 场景数据（新模型）
 *
 * 彻底告别旧的"过滤器"结构。核心不是"输入被改写"，是**选择 + 看见**:
 *   - 前段"活一遍"：玩家（Vera）从几个都合理的选项里挑一个，推进温暖的日常。
 *   - reach 标记：标出"伸手"的瞬间（她/他在靠近）。第一遍玩家未必看得出；
 *     回看时，"看见"机制据此揭示对方那一侧当时没说出口的心情。
 *   - phase 决定语气温度（warm 热 / strained 冷），对齐 npc-prompt 与设计基准。
 *
 * 设计依据：docs/writing/dialogue-style-guide.md 第一部分。
 */

export type Phase = "warm" | "strained";
export type Speaker = "vera" | "sean" | "narr";

/** 开口节拍里，玩家可选的一句话 */
export interface Choice {
  text: string;
  /**
   * 这句（或这一拍）是不是"伸手"——她/他在靠近、在给对方一个机会。
   * 第一遍未必看得出；"看见"机制用它标记玩家当年错过/接住的瞬间。
   */
  reach?: boolean;
  /** 选这项时，玩家角色切换到的表情（emotion key，如 "composed") */
  face?: string;
  /**
   * 选完后实际"说出口"的那句。留空则等于 text（选项按钮文案即台词）。
   * 用于选项文案带动作提示/引号（如 "问一句"你想吃什么"。"），
   * 但说出口时只想保留纯净台词（"你想吃什么。"）的场景。
   */
  say?: string;
  /**
   * 选后对方的回应。可留空 → 交给 /api/npc 依 phase + direction 现场生成。
   * 写死则用于关键情感拍，保证情绪精准。每句可带 face 切换说话者表情。
   */
  reply?: Array<{ who: Speaker; text: string; face?: string }>;
  /**
   * 本选项专属的收尾（接在 reply 之后）。让不同情感方向的选择走向不同的结尾，
   * 而不是三条路汇到同一句。是这一拍"分支"的落点。
   */
  after?: Array<{ who: Speaker; text: string; face?: string }>;
  /** 编剧给 NPC 的自然语言表演指示（喂 LLM，也供作者理解） */
  direction?: string;
}

export type Moment =
  | { kind: "narr"; text: string }
  | { kind: "line"; who: Exclude<Speaker, "narr">; text: string; face?: string }
  /** 幕中切换背景（如从会场走到楼梯间）；瞬间生效，不占对话框 */
  | { kind: "bg"; src: string }
  /** 不带台词地切换某人的表情（emotion key) */
  | { kind: "face"; who: Exclude<Speaker, "narr">; emotion: string }
  | {
      kind: "beat";
      /** 引导语，如"他眼睛没离屏幕。你想凑近他——" */
      prompt: string;
      /** 此刻在发生什么（给玩家情境，也作 NPC 上下文） */
      situation?: string;
      choices: Choice[];
    };

export interface Scene {
  id: string;
  title: string;
  phase: Phase;
  /** 背景图路径 */
  bg: string;
  /** 进场时的初始表情（emotion key)，默认 warm */
  veraFace?: string;
  seanFace?: string;
  brief: string;
  /** 玩家视角（默认 vera) */
  pov?: Exclude<Speaker, "narr">;
  /** 本幕走完后去哪（默认回首页；设为 /look?id=xxx 进入"看见"回看） */
  onDone?: string;
  script: Moment[];
}

/* ─────────── "看见" · 回看数据 ───────────
 * 活过一遍之后，回到同一段记忆：这次不推进，而是找出当年没看见的"伸手",
 * 点开才浮现对方那一侧当时没说出口的心情。这是本作的玩法灵魂。
 */
export interface LookbackMoment {
  /** 这一刻的背景 */
  bg: string;
  /** 当年表面上发生的（旁白视角，你当时看到的） */
  surface: string;
  /** 点开才看见：对方当年没说出口的那句 */
  hidden: string;
  /** 这句藏话是谁的 */
  who: "sean" | "vera";
}

export interface Lookback {
  id: string;
  title: string;
  /** 开场旁白 */
  intro: string[];
  moments: LookbackMoment[];
  /** 看见之后的"接住"：回到那一刻，这一次伸手。治愈的落点（可选）。 */
  reachback?: {
    prompt: string;
    choice: string;
    response: string[];
  };
  /** 收尾旁白 */
  outro: string[];
}

/* ─────────── 甜蜜期 · 锚点一 · 那晚的荷叶包鸡 ───────────
 * 取自真实经历，已典型化。表面是甜蜜期的暖，底下是全局"做对的一次"的范本：
 * 一次成功的修复——她先肯定、再用事实说需求；他接住、承认、道谢。
 * 种子：①他一过载就对她下线；②她把自己的需求排在后勤和肯定他之后（优雅，也是自我消音）。
 */
export const HACKATHON_NIGHT: Scene = {
  id: "warm_hackathon",
  title: "那晚的荷叶包鸡",
  phase: "warm",
  bg: "/images/scenes/hackathon-venue.png",
  veraFace: "warm",
  seanFace: "focused",
  onDone: "/look?id=warm_hackathon",
  brief:
    "黑客松熬到深夜。晚饭凉在长桌那头，他还在赶代码。你也是这队的人，手里只有一杯给他续到第三回的美式。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "深夜的黑客松现场。长桌那头，主办方包的晚饭凉了。屏幕的光把一屋子人的脸照得发青。",
    },
    {
      kind: "narr",
      text: "你也是这队的人。但此刻你手里没有代码，只有一杯给他续到第三回、早就不冒热气的美式。",
    },
    {
      kind: "line",
      who: "sean",
      text: "等一下下，等阿泽把那个分支 push 上来就好……",
    },
    { kind: "narr", text: "“等一下”，他今晚说过第四回了。" },
    {
      kind: "beat",
      prompt: "他眼睛没离屏幕。你想凑近他——",
      situation: "黑客松深夜，他埋头赶代码，你想要一点回应。",
      choices: [
        {
          text: "（从背后捶捶他的肩）",
          reach: true,
          reply: [{ who: "sean", text: "嗯……你先歇会儿。" }],
        },
        {
          text: "（握住他敲键盘的那只手）",
          reach: true,
          reply: [
            {
              who: "narr",
              text: "他“嗯”了一声，手从你掌心底下抽出来，继续打字。",
            },
          ],
        },
        {
          text: "（凑过去，等一个眼神）",
          reach: true,
          reply: [{ who: "narr", text: "他没有看你。屏幕的光在他镜片上跳。" }],
        },
      ],
    },
    { kind: "narr", text: "好，收到。今晚全世界最要紧的，是那个分支。" },
    { kind: "narr", text: "别人吃完陆续回来了。" },
    { kind: "line", who: "vera", text: "那我点外卖了。", face: "warm" },
    { kind: "line", who: "sean", text: "随便。你点吧。" },
    { kind: "face", who: "vera", emotion: "composed" },
    {
      kind: "beat",
      prompt: "他说“随便”。可他要真吃了辣的，会一整晚不吭声。你点——",
      situation: "替他点外卖。他广东人，吃清淡。",
      choices: [
        {
          text: "那我就还是点荷叶包鸡了。",
          reach: true,
          reply: [
            { who: "narr", text: "你没问他，直接点了。你太清楚他的胃了。" },
          ],
        },
        {
          text: "问一句“你想吃什么”。",
          say: "你想吃什么。",
          reply: [{ who: "sean", text: "都行,你定。" }],
        },
      ],
    },
    { kind: "bg", src: "/images/scenes/hackathon-stairs.png" },
    {
      kind: "narr",
      text: "外卖到了。你把他从屏幕前拽起来。楼梯间，夜黑透了，有人陆续下楼回家，脚步声在楼道里荡。",
    },
    { kind: "line", who: "sean", text: "好累。", face: "tired" },
    {
      kind: "narr",
      text: "他抱住你，一股脑倒出来：队友好多东西不懂，早上技术选型选错了，review 代码纯属浪费工夫，vercel 免费版简直是垃圾……",
    },
    { kind: "narr", text: "你一句没插，把打包盒一个个开好，筷子摆正。" },
    {
      kind: "beat",
      prompt: "他终于停下来。这一刻，你想说——",
      situation: "楼梯上，他刚倒完苦水。你等了他一整晚，他一直没正面回应你。",
      choices: [
        {
          text: "“你当队长已经很好了。……不过你今天也忽略我了，我说了好几次我饿，你都没正面回应。但我知道你难，所以这些我弄好了。”",
          reach: true,
          direction:
            "她先肯定他、再用事实（不是指责）说出自己的委屈。这是成功修复的范本。",
          reply: [
            {
              who: "sean",
              face: "tired",
              text: "……谢谢你能跟我说。我都没意识到。我就是太累了，累到没法回应你。",
            },
            { who: "narr", text: "他抱得更紧了。楼梯间的灯忽明忽暗。" },
          ],
          after: [
            {
              who: "narr",
              text: "楼梯上两盒饭，热气重新升起来。荷叶掀开，是他老家的味道。",
            },
            {
              who: "narr",
              text: "你们没聊房子。可那天晚上，那座还没影的小房子，好像又近了一点。",
            },
          ],
        },
        {
          text: "“没事，你辛苦了，快趁热吃。”",
          face: "composed",
          direction: "她把委屈咽下去，只哄他——又一次把自己排在后面。",
          reply: [
            { who: "sean", text: "嗯。你也吃。" },
            {
              who: "narr",
              text: "你把委屈和荷叶一起，叠好，压在了盒底。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "两盒饭静静开着。他吃得很快，你没怎么动筷子。",
            },
            {
              who: "narr",
              text: "小房子没人提。它就停在那儿，像一句谁都没接住的话。",
            },
          ],
        },
        {
          text: "“你眼里就只有代码。”",
          direction: "带刺先扎。他会缩。",
          reply: [
            { who: "sean", text: "……我不是。今天真的忙。" },
            {
              who: "narr",
              text: "他松开手去够筷子。那点想靠近的气，散了。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "他闷头吃饭。楼道的灯灭了一次，谁也没去按。",
            },
            {
              who: "narr",
              text: "那座还没影的小房子，今晚，离得更远了。",
            },
          ],
        },
      ],
    },
    { kind: "face", who: "vera", emotion: "warm" },
  ],
};

/** 剧本序列（随开发递增） */
/* ─────────── 甜蜜期 · 幕2 · 挑衣服 ───────────
 * 商场试衣间外。她用自己的审美把他从头到脚捯饬一遍。
 * 此刻是可爱的强势；同一只手日后会变成控制。种子：照顾里的掌控欲。
 */
const WARM_SHOPPING: Scene = {
  id: "warm_shopping",
  title: "挑衣服",
  phase: "warm",
  bg: "/images/scenes/mall-fitting.png",
  seanFace: "focused",
  onDone: "/game?scene=warm_nvc",
  brief:
    "周末的商场。她拉着你进店，眼睛亮得不像来买衣服，像来改造一件作品。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "试衣间外的长椅。她把你按在椅子上，自己转身扎进衣架里，像在挑今晚的战术。",
    },
    {
      kind: "line",
      who: "sean",
      text: "我真不用试这件吧……家里那件还没穿几次。",
    },
    {
      kind: "beat",
      prompt: "她拎出一件深蓝的，在你身上比了比——",
      situation: "她用自己的审美给你挑衣服，乐在其中。",
      choices: [
        {
          text: "（举起那件深蓝的）就这件，去试。",
          face: "focused",
          reply: [
            { who: "sean", text: "……行。" },
            {
              who: "narr",
              text: "他拎着衣服钻进试衣间，门帘垂下来。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你在门外，把他的鞋带一根根理直。那一刻你很确定，挑衣服就是你爱他的方式。",
            },
          ],
        },
        {
          text: "（把他领口翻好）领子这样才立得住。",
          face: "focused",
          reply: [
            {
              who: "narr",
              text: "你伸手替他翻领子，指尖蹭到他下巴。他下意识往后仰了半寸，又站定。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "他没躲开，也没迎。你把这当作默许，悄悄记在心里。",
            },
          ],
        },
        {
          text: "（蹲下去替他系鞋带）散了。",
          reach: true,
          face: "warm",
          reply: [
            { who: "sean", text: "我自己来——" },
            {
              who: "narr",
              text: "你已经系好了，打了个你偏爱的紧结。他低头看你，没再说话。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "后来你才懂，那一下蹲下去，是照顾，也是想把他按进你节奏里的那点掌控。",
            },
          ],
        },
      ],
    },
    {
      kind: "line",
      who: "sean",
      text: "你比我自己还清楚我穿什么。",
    },
    {
      kind: "narr",
      text: "镜子里，你俩站在一起。她侧头打量，像在确认一件作品完工。",
    },
    {
      kind: "beat",
      prompt: "出门前，她还想最后调一处——",
      situation: "临出门，她对你的穿着还有最后一处不满意。",
      choices: [
        {
          text: "（拍他肩）走，帅的。",
          reply: [
            {
              who: "narr",
              text: "她退后半步，满意地眯眼。你们并肩走出店，玻璃门映出两个很合衬的影子。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "她没说出口：这样捯饬你，是她最顺手的爱法。",
            },
          ],
        },
        {
          text: "（捏他脸）我的。不许换。",
          face: "warm",
          reply: [
            { who: "sean", text: "知道了知道了。" },
            {
              who: "narr",
              text: "她笑，他也笑。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "那句“我的”此刻黏糊得好听——她没听见，日后这只会变成控制的另一张脸。",
            },
          ],
        },
        {
          text: "（忽然认真）其实你穿什么都好看。",
          reach: true,
          reply: [
            {
              who: "narr",
              text: "他愣了一下，耳根有点红。你没补第二句，怕说多了就假。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你没说出口的是：把他从头到脚捯饬一遍，是爱，也是想掌控。甜蜜期叫可爱，后来叫管太多。",
            },
          ],
        },
      ],
    },
  ],
};

/* ─────────── 甜蜜期 · 幕3 · 分享《非暴力沟通》 ───────────
 * 校园长椅。她承认急脾气想改；他欣赏，说她也在包容他。两人真诚、想一起成长。
 * 反讽：他们正握着沟通的工具，日后 drift 里却没用上。憧憬的小房子并入本幕。
 */
const WARM_NVC: Scene = {
  id: "warm_nvc",
  title: "非暴力沟通",
  phase: "warm",
  bg: "/images/scenes/campus-bench.png",
  seanFace: "focused",
  onDone: "/game?scene=burst_phone",
  brief:
    "校园长椅，下午。她怀里抱着本《非暴力沟通》，像抱着个检讨。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "长椅，树影晃在她书页上。她翻到折角那页，又合上，像下不定决心。",
    },
    {
      kind: "line",
      who: "vera",
      text: "我性子太急了。这阵子老冲你发火……我想学学非暴力沟通。",
    },
    {
      kind: "line",
      who: "sean",
      text: "我挺喜欢你这股劲的。其实，你也一直在包容我。",
    },
    {
      kind: "narr",
      text: "他没把这当委屈讲，像在说一件他真心觉得幸运的事。",
    },
    {
      kind: "beat",
      prompt: "她想把书递过去——",
      situation: "她想拉他一起学，也怕显得在教他。",
      choices: [
        {
          text: "（把书推过去）学到什么，多跟我讲讲。",
          reach: true,
          face: "warm",
          reply: [
            { who: "sean", text: "好。那你看完，划重点给我。" },
            {
              who: "narr",
              text: "他接了书，认真得像个要交作业的人。两个人头挨着头，影子叠在书页上。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "他们正握着沟通的工具，还互相欣赏地讨论怎么更好地爱。",
            },
          ],
        },
        {
          text: "（笑）你先改你的“等我搞完”吧。",
          face: "focused",
          reply: [
            { who: "sean", text: "……这个我认。" },
            {
              who: "narr",
              text: "他举手投降，她笑出声。空气松下来，谁都没较真。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "此刻的轻松是真的。只是日后 drift 里，这句玩笑没能再接住。",
            },
          ],
        },
        {
          text: "（低头）我也不是总对的。",
          reply: [
            {
              who: "narr",
              text: "她把这句含在嘴里，没说全。他等了等，没追问——此刻他以为是体贴。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "后来他才懂，那半句没说出口的，是她在试着把骄傲收起来。",
            },
          ],
        },
      ],
    },
    {
      kind: "narr",
      text: "和黑客松那次一样：他们做得到，只是没接住。工具在手，压力一来还是滑走了。",
    },
    {
      kind: "narr",
      text: "暮色里，她忽然说：等毕业，房子要朝南，狗要养柯基。他说行，又补一句，得先能养活自己。",
    },
    {
      kind: "line",
      who: "sean",
      text: "未来的事，慢慢来。",
    },
    {
      kind: "narr",
      text: "憧憬越具体，后来被现实压下来时越疼。可此刻，长椅上的两个人谁都没想到要停。",
    },
  ],
};

/* ─────────── 爆发期 · 幕4 · 查手机 ───────────
 * 宿舍夜，紧绷。她翻他手机、关注/点赞，看到异性痕迹，越查越信，质问、爆发。
 * 整段关系里唯一“大声”的一段。两人都有错，事后羞耻，缩回冷处理。
 * （本轮不接 LLM，吵架逐字写死，纯确定性。）
 */
const BURST_PHONE: Scene = {
  id: "burst_phone",
  title: "查手机",
  phase: "strained",
  bg: "/images/scenes/dorm-room-night.png",
  seanFace: "focused",
  onDone: "/game?scene=cold_fever",
  brief:
    "约会散场后的宿舍。灯关了大半，你盯着他亮着的手机，不安全感到顶点。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "他洗澡去了。手机亮在床头，一条消息弹出来，署名是个女生的名字。你没想查——手先动了。",
    },
    {
      kind: "line",
      who: "vera",
      text: "（点开他的关注列表）……怎么这么多。",
    },
    {
      kind: "beat",
      prompt: "你一条条往下划，呼吸变轻——",
      situation: "她翻他的手机、关注和点赞，越看越信。",
      choices: [
        {
          text: "（继续划，停在一张合照上）这是谁。",
          reply: [
            {
              who: "narr",
              text: "合照里他搂着别人肩膀，笑得没什么特别。你却觉得那笑刺眼，像他藏了另一半生活。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你告诉自己只是同事。可手指已经划到了下一条。",
            },
          ],
        },
        {
          text: "（退出，把手机扣回去）别看了。",
          reach: true,
          reply: [
            {
              who: "narr",
              text: "你放下手机，又拿起来。扣回去，又翻开。最后那一下，是你自己没忍住。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你没查到定罪证据，却已经不信了。",
            },
          ],
        },
        {
          text: "（截图）留个底。",
          reply: [
            {
              who: "narr",
              text: "截图的光照亮你下巴。你盯着那张图，像在找一句能定罪的证词。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "一张图，够你熬到天亮。",
            },
          ],
        },
      ],
    },
    {
      kind: "narr",
      text: "他擦着头发出来，看见你举着手机。空气啪地绷紧。",
    },
    {
      kind: "line",
      who: "sean",
      text: "你动我手机？",
    },
    {
      kind: "beat",
      prompt: "话到嘴边，你压不住了——",
      situation: "她把不安变成质问，爆发。整段关系里唯一大声的一段。",
      choices: [
        {
          text: "（举着屏幕）这些人，你一个都没跟我说过。",
          face: "composed",
          reply: [
            { who: "sean", text: "同事。项目组的人，你认识。" },
            {
              who: "narr",
              text: "他声音没高，却往后退了半步——被不信任刺到的人，先把自己缩起来。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你听见解释，却听不进。不安已经替你判了。",
            },
          ],
        },
        {
          text: "（声音发抖）你是不是，早就不止我了。",
          reach: true,
          face: "composed",
          reply: [
            { who: "sean", text: "你疯了？" },
            {
              who: "narr",
              text: "他像被烫到。你这句话不是问，是判。两个人都听见了那句不该出口的。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "这句一旦出口，就收不回。你们都知道。",
            },
          ],
        },
        {
          text: "（冷笑）行，你忙。",
          face: "composed",
          reply: [
            { who: "sean", text: "……你非要这么想。" },
            {
              who: "narr",
              text: "他关掉手机屏幕，像关上一扇门。音量没变，温度骤降。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "冷处理开始了，谁都没再开口。",
            },
          ],
        },
      ],
    },
    {
      kind: "narr",
      text: "她幕3 才说要练非暴力沟通——工具在手，压力一来还是没接住。他没解释，也没哄，把不安原样还了回去。",
    },
    {
      kind: "narr",
      text: "吵完，两个人都红了耳根，却谁也没再开口。羞耻像水，漫上来，把刚才的话全泡软了。",
    },
    {
      kind: "line",
      who: "sean",
      text: "……先睡了。",
    },
    {
      kind: "narr",
      text: "他背过身。你盯着他的后脑勺，忽然很想收回刚才每一句。可手指还攥着那张截图。僵持期，从这晚开始。",
    },
  ],
};

/* ─────────── 僵持期 · 幕5 · 发烧夜（扳机 · 两人都有错） ───────────
 * 分屏/两地。他发烧想她来陪；她被任务绊住。他用愧疚绑架，要“被排第一”；
 * 她用“责任”当挡箭牌，把体贴收在安全距离。谁都有理，谁也没接住谁。
 */
const COLD_FEVER: Scene = {
  id: "cold_fever",
  title: "发烧夜",
  phase: "strained",
  bg: "/images/scenes/fever-night.png",
  seanFace: "tired",
  onDone: "/game?scene=end_breakup",
  brief:
    "两地。他发烧缩在宿舍床上，手机亮在手边；你在自习室，手机扣在桌上，对着老师的任务。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "他的消息在凌晨两点亮起：发烧了，三十八度八。你盯着屏幕，手指在“回”和“不回”之间停了很久。",
    },
    {
      kind: "line",
      who: "sean",
      text: "没事，你忙。睡了。",
    },
    {
      kind: "narr",
      text: "你看见他打了“睡了”又撤回，换成“多喝水”。他不想让你来，也不想让你安心。",
    },
    {
      kind: "beat",
      prompt: "任务还剩最后一段，你盯着屏幕——",
      situation: "她被老师的任务绊住，责任感强放不下；他发烧想她来陪。",
      choices: [
        {
          text: "（回）我马上好，给你叫个外卖粥。",
          reach: true,
          face: "composed",
          reply: [
            { who: "sean", text: "真不用。" },
            {
              who: "narr",
              text: "他收了外卖，没再说话。你以为尽了心，他听见的是“我有用，但排不上前头”。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你回到屏幕前。粥的热，隔着距离到不了他。",
            },
          ],
        },
        {
          text: "（放下电脑，起身）我去你那。",
          reach: true,
          face: "warm",
          reply: [
            { who: "sean", text: "别——你任务。" },
            {
              who: "narr",
              text: "你真站起来了。可老师的截止就在早上，你站了三秒，又坐回去。他那边，灯灭了。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "那三秒，是你们之间最近的一次。你坐回去，它也灭了。",
            },
          ],
        },
        {
          text: "（继续敲键盘）嗯，多喝水。",
          face: "composed",
          reply: [
            {
              who: "narr",
              text: "你回了三个字，眼睛没离屏幕。那句“多喝水”和他对你说过无数次的一模一样——客气，也远。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你把体贴收在一个能自我说服的安全距离里。",
            },
          ],
        },
      ],
    },
    {
      kind: "narr",
      text: "凌晨四点，他烧得迷糊，发了一句又删：你来好不好。最后发出去的是“没事”。",
    },
    {
      kind: "line",
      who: "sean",
      text: "以后结婚了，工作也比家庭重要吗？",
    },
    {
      kind: "narr",
      text: "他把一次没来，上升成对整个未来的审判。这话刺，因为他真的怕。你看着屏幕，像被将了一军。",
    },
    {
      kind: "beat",
      prompt: "他这句砸过来，你想回——",
      situation:
        "他用愧疚绑架，要“被排在第一位”；她用“责任”当挡箭牌，把体贴收在安全距离。",
      choices: [
        {
          text: "（认真）这周真的关键，过了这阵我补偿你。",
          face: "composed",
          reply: [
            { who: "sean", text: "……行。" },
            {
              who: "narr",
              text: "他回得轻，像把这点委屈又折好，塞回兜里。两个人都觉得自己有理，都没接住谁。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "没有坏人。只是谁都没接住谁。",
            },
          ],
        },
        {
          text: "（软下来）明天一早，我先去看你。",
          reach: true,
          face: "warm",
          reply: [
            { who: "sean", text: "睡吧你。" },
            {
              who: "narr",
              text: "他没接那句“看我”，也没拒绝。空气里那点软，被“睡吧”轻轻按了回去。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你没再坚持。那点软，就这样按了回去。",
            },
          ],
        },
        {
          text: "（带刺）你是在跟我算账吗。",
          face: "composed",
          reply: [
            { who: "sean", text: "我没算。" },
            {
              who: "narr",
              text: "他关了灯。你扣下手机，听见自己心跳，比任务截止还响。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "没有坏人。只是谁都没接住谁。",
            },
          ],
        },
      ],
    },
    {
      kind: "narr",
      text: "她用“负责”当面具，把体贴收在一个能自我说服的安全距离；他用愧疚要“被排第一”，把焦虑装成价值观质问。那晚她可能就决定了——只是拖了很久才说。",
    },
  ],
};

/* ─────────── 结束 & 事后 · 幕6 · 分手夜 ───────────
 * 收走留在对方宿舍的东西。一个轻得不像样的袋子，门口的灯。好天，没导火索。
 * “最近好像都挺忙的……先这样？”谁也没说分手。他平静接受体面；她平静压着、指节攥白。
 */
const END_BREAKUP: Scene = {
  id: "end_breakup",
  title: "分手夜",
  phase: "strained",
  bg: "/images/scenes/dorm-doorway.png",
  seanFace: "focused",
  onDone: "/game?scene=after_konbini",
  brief:
    "收走你留在他宿舍的东西。一个轻得不像样的袋子，门口的灯惨白。天光太好，连下雨的借口都不给。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "你把他桌上你落下的东西收进一个袋子：一支用秃的眉笔、半包没吃完的糖、一张电影票根。轻得像没来过。",
    },
    {
      kind: "line",
      who: "sean",
      text: "都拿好了？",
    },
    {
      kind: "narr",
      text: "他靠在门框上，很平静。平静得让你怀疑，这段日子对他是不是早就轻了。",
    },
    {
      kind: "beat",
      prompt: "门口的灯下，你想说点什么——",
      situation: "一个普通的好天，没有导火索。关系走到门口。",
      choices: [
        {
          text: "（把袋子递过去）最近好像都挺忙的……先这样？",
          face: "composed",
          reply: [
            { who: "sean", text: "好。" },
            {
              who: "narr",
              text: "他接了袋子，没留你。谁也没说“分手”。天太亮，连一句体面的谎都不用编。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "关系走到门口，没人动手，自己就散了。",
            },
          ],
        },
        {
          text: "（认真）其实，我们是不是……早就不太对了。",
          reach: true,
          face: "wistful",
          reply: [
            { who: "sean", text: "……嗯。" },
            {
              who: "narr",
              text: "他顿了一瞬，像被你抢先说出了他想说的。那点“被挽留的慌”，只闪了一下，就灭了。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "若你给过一句真话，或许有过一瞬的裂。可你没接，他也没挽。",
            },
          ],
        },
        {
          text: "（沉默，转身）那我走了。",
          face: "composed",
          reply: [
            { who: "sean", text: "路上小心。" },
            {
              who: "narr",
              text: "他说的是你们老夫老妻的口头禅。你指节攥白了，背影没停。他当晚睡得很好——痛要半年后才砸下来。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "他平静接受、体面，下线到底；你平静压着、自我消音到底。",
            },
          ],
        },
      ],
    },
  ],
};

/* ─────────── 事后 / 治愈 · 幕7 · 半年后 ───────────
 * 还是那家便利店，她一个人。一句没修饰的真话（“要，谢谢，今天有点冷”）——
 * 说得慢，但说完整了。她开始能好好说话。痛过去了，人长出来一点。
 */
const AFTER_KONBINI: Scene = {
  id: "after_konbini",
  title: "半年后",
  phase: "warm",
  bg: "/images/scenes/konbini-night.png",
  seanFace: "focused",
  onDone: "/",
  brief:
    "还是那家便利店。玻璃门开开合合，冷气扑脸。你一个人，站在关东煮前。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "半年后。你下了班，习惯性地拐进这家便利店。玻璃门开合，冷气扑脸，像什么都没变。",
    },
    {
      kind: "line",
      who: "vera",
      text: "（对店员）要，谢谢。今天有点冷。",
    },
    {
      kind: "narr",
      text: "你说得很慢，但说完整了：要，谢谢，今天有点冷。一句没经过任何修饰的真话。",
    },
    {
      kind: "beat",
      prompt: "你捧着纸杯，忽然想起从前——",
      situation: "她一个人，却开始能好好说话。痛过去了，人长出来一点。",
      choices: [
        {
          text: "（对自己笑）慢慢来。",
          reach: true,
          face: "warm",
          reply: [
            {
              who: "narr",
              text: "你没想起他的脸，想起的是那个敢把真话说出口的自己。玫瑰不是为这一对开的，是为往后的人生。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "痛过去了，人长出来一点。",
            },
          ],
        },
        {
          text: "（望向窗外）天黑得正好。",
          face: "composed",
          reply: [
            {
              who: "narr",
              text: "窗外车流亮成一条河。你站着，没急着走。这一段，终于不用赶着去接住谁，也不用赶着被谁接住。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "安静，是治愈给的。",
            },
          ],
        },
        {
          text: "（轻声）要，谢谢。",
          reply: [
            {
              who: "narr",
              text: "你又对空气说了一遍。这次没有人接，但你说得稳了。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "痛过去了，人长出来了一点。",
            },
          ],
        },
      ],
    },
    {
      kind: "narr",
      text: "玫瑰还在，下次。你开始能好好说话了——这件事本身，就是那朵花开了。",
    },
  ],
};

export const STORY: Scene[] = [
  HACKATHON_NIGHT,
  WARM_SHOPPING,
  WARM_NVC,
  BURST_PHONE,
  COLD_FEVER,
  END_BREAKUP,
  AFTER_KONBINI,
];

export function getStoryScene(id: string): Scene | undefined {
  return STORY.find((s) => s.id === id);
}

/* ─────────── 回看 · 那晚的荷叶包鸡（看 Sean 那一侧） ───────────
 * 你以为你都记得。可当时你只看见他没回应你——没看见他那一侧在沉。
 * 这不是控诉他，是让玩家"看见"：他不是不爱，是先被自己淹没了。
 */
export const HACKATHON_LOOKBACK: Lookback = {
  id: "warm_hackathon",
  title: "回看 · 那晚的荷叶包鸡",
  intro: [
    "那一晚，你以为你都记得。",
    "可有些东西，当时你没看见。",
    "再看一遍。这次，看他。",
  ],
  moments: [
    {
      bg: "/images/scenes/hackathon-venue.png",
      surface: "你握住他敲键盘的那只手。他“嗯”了一声，把手抽了回去。",
      hidden:
        "我知道那是她的手。可我一抬头，那个 bug 就从脑子里溜了。等我搞完，一定好好牵回来——我总是说“等我搞完”。",
      who: "sean",
    },
    {
      bg: "/images/scenes/hackathon-venue.png",
      surface: "你问他吃什么，他头也不抬：“随便，你点吧。”",
      hidden:
        "不是随便。是我连挑一个菜的力气，都想省下来给代码。她记得我不吃辣、爱清淡——我却把这份记得，当成了理所当然。",
      who: "sean",
    },
    {
      bg: "/images/scenes/hackathon-stairs.png",
      surface: "楼梯上，他抱住你，一口气倒完了一肚子苦水。",
      hidden:
        "她等了我一整晚。我却先说了我的累。等她开口我才发现——原来我一直在被她接住，却从没问过她，累不累。",
      who: "sean",
    },
  ],
  reachback: {
    prompt: "那一晚，你们都在笨拙地爱着。只是谁也没接住谁。",
    choice: "如果能回到那晚——这次，先开口的是你：“我也累了。你呢？”",
    response: [
      "你回不去那一晚了。",
      "但你记住了：接住，是两个人的事。",
      "下次有人向你伸手，你会认得出——也记得，伸出自己的手。",
    ],
  },
  outro: [
    "原来那晚，他不是没看见你。",
    "他只是，先被自己淹没了。",
    "有些手，当年没能牵住。",
    "但你已经开始看见了。",
  ],
};

export const LOOKBACKS: Record<string, Lookback> = {
  warm_hackathon: HACKATHON_LOOKBACK,
};

export function getLookback(id: string): Lookback | undefined {
  return LOOKBACKS[id];
}
