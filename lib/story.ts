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
  | {
      kind: "line";
      who: Exclude<Speaker, "narr">;
      text: string;
      face?: string;
      /** 聊天演出（presentation:"phone"）里这条消息的时间戳，如 "02:03" */
      time?: string;
    }
  /** 幕中切换背景（如从会场走到楼梯间）；瞬间生效，不占对话框 */
  | { kind: "bg"; src: string }
  /** 不带台词地切换某人的表情（emotion key) */
  | { kind: "face"; who: Exclude<Speaker, "narr">; emotion: string }
  /** 幕中开/关手机聊天演出（如幕6 开场的两周荒漠消息） */
  | { kind: "phone"; on: boolean }
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
  /**
   * 左右分屏背景（两地感，如幕5）：[左图, 右图]。
   * 设置后整幕以分屏渲染、忽略 bg 的全屏图与幕中 bg 切换；
   * pov=vera 时立绘 Sean 在左、Vera 在右，正好各站各的半边。
   */
  bgSplit?: [string, string];
  /** 进场时的初始表情（emotion key)，默认 warm */
  veraFace?: string;
  seanFace?: string;
  /**
   * 立绘套装后缀（按幕换装）：解析为 {who}-{emotion}-{faceSet}.png，
   * 套装内缺该表情时回退 warm，再回退无后缀基础图。
   */
  faceSet?: string;
  /** 立绘显示："none" 全隐藏（人物已画进背景）；"vera" 只显示她 */
  portraits?: "none" | "vera";
  /** 特殊演出："phone" = 聊天记录浮层（幕4 关注列表），同时隐藏立绘 */
  presentation?: "phone";
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
  /** 回看页立绘（文件名去 .png）：回看只看他。缺省 sean-tired-hackthon。 */
  seanPortrait?: string;
  /** 整段回看不显示立绘（如外卖粥：分屏背景里人物已画入） */
  hidePortraits?: boolean;
  /** 看见之后的"接住"：回到那一刻，这一次伸手。治愈的落点（可选）。 */
  reachback?: {
    prompt: string;
    choice: string;
    response: string[];
  };
  /** 收尾旁白 */
  outro: string[];
}

/* ─────────── 甜蜜期 · 锚点一 · 叫花鸡 ───────────
 * 取自真实经历，已典型化。表面是甜蜜期的暖，底下是全局"做对的一次"的范本：
 * 一次成功的修复——她先肯定、再用事实说需求；他接住、承认、道谢。
 * 种子：①他一过载就对她下线；②她把自己的需求排在后勤和肯定他之后（优雅，也是自我消音）。
 */
export const HACKATHON_NIGHT: Scene = {
  id: "warm_hackathon",
  title: "叫花鸡",
  phase: "warm",
  bg: "/images/scenes/hackathon-venue.png",
  veraFace: "warm",
  seanFace: "focused",
  faceSet: "hackthon",
  onDone: "/game?scene=warm_shopping",
  brief:
    "黑客松熬到深夜。晚饭凉在长桌那头，他还在赶代码。你也是这队的人，手里端着替他续的第三杯美式。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "深夜的黑客松现场。长桌那头，主办方包的晚饭凉了。屏幕的光把一屋子人的脸照得发青。",
    },
    {
      kind: "narr",
      text: "你也是这队的人。可这会儿你手里没有代码，只有替他续的第三杯美式。前两杯，都是凉透了才被他想起来。",
    },
    {
      kind: "line",
      who: "sean",
      text: "等一下，等阿泽把那个分支 push 上来就好……",
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
          text: "那我就还是点叫花鸡了。",
          reach: true,
          reply: [
            { who: "narr", text: "你没问他，直接点了。因为上次他说过他爱吃。" },
          ],
        },
        {
          text: "问一句“你想吃什么”。",
          say: "想吃什么？",
          reply: [{ who: "sean", text: "都行啊，你定。" }],
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
          text: "“今天你这个队长，撑得很好。……可我说了三次我饿，你一次都没抬头。我不是怪你，我知道你难。所以饭我都摆好了，先吃。”",
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
              text: "楼梯上两盒饭，热气重新升起来。荷叶掀开，是他念叨过的那个味道。",
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
            { who: "sean", text: "……我不是。今天真的忙。", face: "guilty" },
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
  veraFace: "earnest",
  seanFace: "warm",
  faceSet: "cloth",
  onDone: "/game?scene=warm_nvc",
  brief:
    "周末的商场。你拉着他进店。他的衣柜里全是队服和文化衫，你早就想动手了。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "试衣间外的长椅。你把他按在椅子上坐好，自己转身扎进衣架里。深蓝、灰、白，淘汰得飞快。给他挑衣服这件事，你想了不是一天了。",
    },
    {
      kind: "line",
      who: "sean",
      text: "我真不用试这件吧……家里那件还没穿几次。",
    },
    {
      kind: "narr",
      text: "他嘴上这么说，人没动。手机也没掏出来。陪你逛街的时候，他从不看手机。",
    },
    {
      kind: "beat",
      prompt: "你拎出一件深蓝的，在他身上比了比——",
      situation: "你用自己的审美给他挑衣服，乐在其中。",
      choices: [
        {
          text: "（直接递过去）这件。试试。",
          face: "earnest",
          reply: [
            { who: "sean", text: "……行。" },
            {
              who: "narr",
              text: "他拎着衣服钻进试衣间，门帘垂下来。你没跟进去，但你知道他会穿。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你在门外等着，心里已经想好他穿上的样子。挑衣服是你爱他的方式。",
            },
          ],
        },
        {
          text: "这个颜色不会太老气？",
          face: "earnest",
          reply: [
            { who: "sean", text: "不会吧……你选的应该没问题。" },
            {
              who: "narr",
              text: "他说\"应该\"，但眼睛看向你的时候，是确定的。他在等你拿主意。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你享受这个瞬间。他把决定权交给你，信任得理所当然。",
            },
          ],
        },
        {
          text: "（拿起另一件）要不，这件也拿上？",
          reach: true,
          face: "earnest",
          reply: [
            { who: "sean", text: "一次试两件？" },
            {
              who: "narr",
              text: "他的语气是\"又来了\"的无奈，但已经伸手接过去。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "后来你才懂，那一刻的\"帮他挑\"，和后来的\"替他决定\"，是同一只手。",
            },
          ],
        },
      ],
    },
    { kind: "face", who: "sean", emotion: "neutral" },
    {
      kind: "narr",
      text: "帘子拉开。他没先看镜子，先看你。等你点头，像等一个验收。",
    },
    {
      kind: "line",
      who: "sean",
      text: "你比我自己还清楚我穿什么。",
    },
    {
      kind: "narr",
      text: "镜子里，你俩站在一起。你侧头打量，像在确认一件作品完工。",
    },
    { kind: "face", who: "vera", emotion: "warm" },
    {
      kind: "beat",
      prompt: "出门前，你还想最后看一眼——",
      situation: "临出门，你看着镜子里的他。",
      choices: [
        {
          text: "（满意地点头）走吧。",
          reply: [
            {
              who: "narr",
              text: "你退后半步，满意地眯眼。你们并肩走出店，玻璃门映出两个很合衬的影子。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你没说出口：这样捯饬他，是你最顺手的爱法。",
            },
          ],
        },
        {
          text: "（捏他脸）我的品味果然没错。",
          face: "warm",
          reply: [
            { who: "sean", text: "知道了知道了。", face: "warm" },
            {
              who: "narr",
              text: "你笑，他也笑。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "那句“我的”此刻黏糊得好听。你没听出来，日后同一句话，会露出另一张脸。",
            },
          ],
        },
        {
          text: "你穿这个颜色挺好的。",
          reach: true,
          reply: [
            {
              who: "sean",
              text: "是吗……那以后多买这个色。",
            },
            {
              who: "narr",
              text: "他说得随意，但你听出来了：他把你的喜好，记下了。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你没说出口的是：帮他挑衣服，是爱，也藏着掌控欲。甜蜜期叫照顾，后来叫管太多。",
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
  veraFace: "warm",
  seanFace: "thinking",
  faceSet: "bench",
  onDone: "/game?scene=burst_phone",
  brief:
    "校园长椅，下午。你怀里抱着本《非暴力沟通》，像抱着一份检讨。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "下午没课。长椅上，秋天的阳光正好。他把外套脱下来垫在你身后，你没说谢谢，他也没等你说。树影晃在书页上。",
    },
    {
      kind: "narr",
      text: "你翻到折角那页，又合上。这本《非暴力沟通》，在包里背了三天了。",
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
      kind: "line",
      who: "sean",
      text: "你要是学到什么，多跟我讲讲。",
      face: "thinking",
    },
    {
      kind: "beat",
      prompt: "你想把书递过去——",
      situation: "他让你学到什么多跟他讲讲。你想拉他一起学，又怕显得在教他。",
      choices: [
        {
          text: "（把书塞给他）一起看。你先，看完划重点给我。",
          reach: true,
          face: "warm",
          reply: [
            { who: "sean", text: "……行。那我先看。" },
            {
              who: "narr",
              text: "他接了书，认真得像个要交作业的人。两个人头挨着头，影子叠在书页上。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你们就这样握住了沟通的工具，还在互相欣赏地讨论，怎么更好地爱。",
            },
          ],
        },
        {
          text: "（笑）你先改你的“等我搞完”吧。",
          face: "warm",
          reply: [
            { who: "sean", text: "……这个我认。", face: "thinking" },
            {
              who: "narr",
              text: "他举手投降，你笑出声。空气松下来，谁都没较真。",
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
              text: "你把这句含在嘴里，没说全。他等了等，没追问。此刻他以为，这是体贴。",
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
      text: "工具就这样到了两个人手里。那时你们都信，往后的架会越吵越少。",
    },
    {
      kind: "narr",
      text: "暮色下来，话题不知怎么拐到了以后。",
    },
    { kind: "bg", src: "/images/scenes/future-apartment.png" },
    {
      kind: "line",
      who: "vera",
      text: "等毕业了，房子要朝南。阳台要大，能晒被子。",
      face: "warm",
    },
    { kind: "line", who: "sean", text: "行。狗呢？", face: "staring" },
    { kind: "line", who: "vera", text: "柯基。腿短，跑不远。", face: "staring" },
    {
      kind: "line",
      who: "sean",
      text: "我们努力工作，攒够两百万，被动收入能覆盖咱俩花销，咱们就不用天天打工了。",
      face: "staring",
    },
    { kind: "line", who: "vera", text: "两百万？你还算上通胀了吗？" },
    {
      kind: "line",
      who: "sean",
      text: "……那三百万。反正先记上，免得到时候现想。",
    },
    {
      kind: "narr",
      text: "两个学生，把三十年后规划得钉是钉铆是铆，认真得像明天就要交房。谁都没提，毕业其实只隔一年。",
    },
    {
      kind: "line",
      who: "sean",
      text: "未来的事，慢慢来。",
    },
    { kind: "bg", src: "/images/scenes/campus-bench.png" },
    {
      kind: "narr",
      text: "憧憬越具体，后来被现实压下来时越疼。可此刻，长椅上的两个人谁都没想到要停。",
    },
  ],
};

/* ─────────── 爆发期 · 幕4 · 查手机 ───────────
 * 他大四，下周去外地实习报到；她来他宿舍帮他收拾行李（室友不在）。
 * 他下楼取快递时手机亮了——她翻关注/点赞，越查越信，质问、爆发。
 * 整段关系里唯一“大声”的一段。两人都有错，事后羞耻，缩回冷处理。
 * 这一晚也埋下“异地”的现实：幕5 两地、幕6 “实习各在一个城市”由此接上。
 * （本轮不接 LLM，吵架逐字写死，纯确定性。）
 */
const BURST_PHONE: Scene = {
  id: "burst_phone",
  title: "关注列表",
  phase: "strained",
  bg: "/images/scenes/dorm-room-night.png",
  veraFace: "anxious",
  seanFace: "wooded",
  faceSet: "phone",
  onDone: "/game?scene=cold_fever",
  brief:
    "他下周去实习报到。你来他宿舍帮他收拾行李，却在他下楼取快递时，撞见那部亮起来的手机。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "他大四了，下周去实习报到。你来帮他收拾行李。室友都回家了，屋里只有拉链和胶带的声音。",
    },
    {
      kind: "narr",
      text: "他下楼取快递去了，新买的行李箱。手机留在床头，屏幕亮起来，一条消息弹出来，署名是个女生的名字。",
    },
    {
      kind: "narr",
      text: "你只是想把通知划掉。真的。可指尖落下去的时候，拐了个弯。",
    },
    {
      kind: "narr",
      text: "密码是你的生日。他设了两年，从没换过。你跟自己说：看一眼就放回去。看一眼，不算什么。",
    },
    {
      kind: "line",
      who: "vera",
      text: "（点开他的关注列表）……怎么这么多。",
    },
    {
      kind: "narr",
      text: "快递柜在楼下，来回要走一趟。你还有时间。这个念头冒出来的时候，你已经在往下划了。",
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
              text: "你告诉自己只是朋友。可手指已经划到了下一条。",
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
      text: "行李箱的轮子在门口响了一下。他推门进来，看见你举着他的手机。空气啪地绷紧。",
    },
    {
      kind: "line",
      who: "sean",
      text: "你动我手机？",
    },
    { kind: "face", who: "vera", emotion: "hurt" },
    {
      kind: "narr",
      text: "音量不高。是确认，不是质问。可你听出了底下那层：他在失望。",
    },
    {
      kind: "narr",
      text: "有一秒你想道歉。可他的手机还攥在你手里，不安抢先替你开了口。",
    },
    {
      kind: "beat",
      prompt: "话到嘴边，你压不住了——",
      situation: "她把不安变成质问，爆发。整段关系里唯一大声的一段。",
      choices: [
        {
          text: "（举着屏幕）这些人，你一个都没跟我说过。",
          face: "accusing",
          reply: [
            { who: "sean", text: "朋友。骑车认识的。", face: "wooded" },
            { who: "vera", text: "我什么时候见过？" },
            { who: "sean", text: "我删了行了吧。我根本没精力管这些，我没有骗你。", face: "cold" },
            {
              who: "narr",
              text: "他声音没高，却往后退了半步。\"删了行了吧\"这句话，像在哄小孩。被不信任刺到的人，先把自己缩起来。",
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
          text: "你不是跟我说，跟女孩子走得不近吗？那这些是什么？",
          reach: true,
          face: "accusing",
          reply: [
            { who: "sean", text: "朋友。以前一起骑车的。" },
            { who: "vera", text: "那为什么我不知道？" },
            { who: "sean", text: "我删了行了吧。我根本没精力管这些，我没有骗你。", face: "cold" },
            {
              who: "narr",
              text: "他说\"删了行了吧\"，像在妥协。可她听见的是：你闹，我删，然后呢。这句\"没有骗你\"，越说越像辩解。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你把他说过的话，和屏幕上的照片对在一起。对不上的部分，已经够你定罪了。",
            },
          ],
        },
        {
          text: "（把手机推过去）你自己看，这是\"走得不近\"？",
          face: "accusing",
          reply: [
            { who: "sean", text: "……你非要这么想。", face: "cold" },
            {
              who: "narr",
              text: "他关掉手机屏幕，像关上一扇门。音量没变，温度骤降。你想要的不是这句，是解释。",
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
      text: "没人再说话。宿舍楼的声音忽然全冒了出来：走廊的脚步、隔壁的笑、水管里的水。只有你们这间是静的。",
    },
    {
      kind: "narr",
      text: "前几天你还在长椅上说，要学着好好说话。工具在手，压力一来，还是没接住。他也没解释、没哄，把不安原样还了回去。",
    },
    {
      kind: "narr",
      text: "你把他的手机放回床头，屏幕朝下。放下的时候手在抖。刚才那个举着手机质问、声音发尖的人，你不认识。",
    },
    {
      kind: "line",
      who: "sean",
      text: "……不早了。我送你回去。",
      face: "cold",
    },
    {
      kind: "narr",
      text: "行李收到一半，就那么摊着。下楼的路上，他走在你旁边，隔着半步。谁都没提刚才的事，谁也没提，下周他就走了。",
    },
    { kind: "bg", src: "/images/scenes/dorm-doorway-night.png" },
    {
      kind: "narr",
      text: "到你楼下，他只说了句“到了”。你很想收回刚才每一句，可一句也没收回来。冷处理，从这晚开始。",
    },
    { kind: "bg", src: "/images/scenes/departure-station.png" },
    {
      kind: "narr",
      text: "一周后，他走了。行李箱是他自己拖下楼的。",
    },
    {
      kind: "narr",
      text: "你没去送。他也没问你来不来。你们都在等对方先开口。谁都没开。",
    },
  ],
};

/* ─────────── 僵持期 · 幕5 · 外卖粥（扳机 · 两人都有错） ───────────
 * 分屏/两地。他在实习城市发烧，想她来陪；她在便利店上夜班，柜台走不开。
 * 他用愧疚绑架，要“被排第一”；她用“责任”当挡箭牌，把体贴收在安全距离。
 * 谁都有理，谁也没接住谁。便利店与幕7“还是那家便利店”呼应。
 */
const COLD_FEVER: Scene = {
  id: "cold_fever",
  title: "外卖粥",
  phase: "strained",
  bg: "/images/scenes/fever-night.png",
  presentation: "phone",
  onDone: "/game?scene=end_breakup",
  brief:
    "两地。他在实习那边的宿舍，发烧缩在床上，手机亮在手边；你在便利店上夜班，手机扣在收银台边。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "那晚被切成两半。一半是他实习那边的宿舍：床垫还是新的，人缩在被子里，手机的光罩着一张烧红的脸。",
    },
    {
      kind: "narr",
      text: "另一半是你打工的便利店：灯太亮，夜班柜台只有你一个人。时薪多三块，这班是你自己排的。手机扣在收银台边。",
    },
    {
      kind: "narr",
      text: "凌晨两点零三分，手机震了一下。",
    },
    {
      kind: "line",
      who: "sean",
      text: "发烧了，三十八度八。",
      time: "02:03",
    },
    {
      kind: "line",
      who: "sean",
      text: "没事，你忙。睡了🙂",
      time: "02:04",
    },
    {
      kind: "narr",
      text: "你算了一遍：末班城际过去要四十分钟，夜里没有回程；换班的同事六点才来。数字都站在你这边。可那句“三十八度八”，你又读了一遍。",
    },
    {
      kind: "narr",
      text: "手机又震了一下。这次不是消息，是一个红包。",
    },
    {
      kind: "line",
      who: "sean",
      text: "🧧 我想买你一个晚上。你就休息一下，别让自己那么忙。",
      time: "02:31",
    },
    {
      kind: "narr",
      text: "一百五十块。你一个夜班的钱，他算得比你还清楚。",
    },
    {
      kind: "beat",
      prompt: "你盯着那个红包——",
      situation: "他转了夜班工资，想\"买\"她的时间。她不知道该怎么回应。",
      choices: [
        {
          text: "（点开，又退出）我不是为了钱……",
          reach: true,
          face: "composed",
          reply: [
            { who: "sean", text: "我知道。可你总得吃饭。" },
            {
              who: "narr",
              text: "他说得很实际。你想辩解，又说不出口——因为你确实需要这些钱。可他这样说，让你觉得自己更廉价了。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "红包最后没退回去，也没点开。它就挂在那里，像一个解不开的结。",
            },
          ],
        },
        {
          text: "（退回）我能照顾好自己。",
          face: "composed",
          reply: [
            { who: "sean", text: "……那你怎么不能来照顾我一次？" },
            {
              who: "narr",
              text: "红包被退了回来。这句话比发烧更烫。你看着手机屏幕，一个字都打不出来。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你以为自己在守住界限。他听见的是\"你不值得我为你改变计划\"。",
            },
          ],
        },
        {
          text: "（没回，放下手机）",
          face: "composed",
          reply: [
            {
              who: "narr",
              text: "红包挂在那里，你假装没看见。三分钟，五分钟，十分钟。手机没再亮。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你们都在等对方先说话。可谁也没开口。",
            },
          ],
        },
      ],
    },
    {
      kind: "narr",
      text: "僵持了一会儿。货架刚理完，店里还是没有客人。",
    },
    {
      kind: "beat",
      prompt: "你盯着手机，他的消息还停在十分钟前——",
      situation: "夜班柜台只有她一个人，走不开；他在实习城市发烧，想她来陪。",
      choices: [
        {
          text: "（回）给你叫了粥，热的，记得吃。",
          reach: true,
          face: "composed",
          reply: [
            { who: "sean", text: "真不用🙏" },
            {
              who: "narr",
              text: "他收了外卖，没再说话。你以为尽了心，他听见的是“我有用，但排不上前头”。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你转身招呼进门的客人。粥的热，隔着一个城市，到不了他。",
            },
          ],
        },
        {
          text: "（解下围裙，起身）我现在过去。",
          reach: true,
          face: "warm",
          reply: [
            { who: "sean", text: "别。你还上着班。" },
            {
              who: "narr",
              text: "围裙解到一半。可店里只有你一个，柜台不能空。你站了三秒，又把带子系了回去。他那边，灯灭了。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "那三秒，是你们之间最近的一次。带子系回去，它就灭了。",
            },
          ],
        },
        {
          text: "（低头理货）嗯，多喝水。",
          face: "composed",
          reply: [
            {
              who: "narr",
              text: "你回了三个字，手上没停。那句“多喝水”，和他对你说过无数次的一模一样。客气，也远。",
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
      text: "凌晨四点，手机又亮了。这次不是“没事”。",
    },
    { kind: "line", who: "sean", text: "你来好不好。", time: "04:12" },
    {
      kind: "narr",
      text: "五个字。你站在柜台后面盯着它们，很久。久到他等不到回答。",
    },
    {
      kind: "line",
      who: "sean",
      text: "以后结婚了，工作也比家庭重要吗？",
      time: "04:47",
    },
    {
      kind: "narr",
      text: "他把一次没来，上升成对整个未来的审判。这话刺，因为他真的怕。怕的不是这一晚，是往后无数个这样的晚上。你看着屏幕，像被将了一军。",
    },
    {
      kind: "beat",
      prompt: "他这句砸过来，你想回——",
      situation:
        "他用愧疚绑架，要“被排在第一位”；她用“责任”当挡箭牌，把体贴收在安全距离。",
      choices: [
        {
          text: "（认真）这阵子真的走不开。过了这阵，我补偿你。",
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
          text: "（软下来）我六点下班，坐头班车去看你。",
          reach: true,
          face: "warm",
          reply: [
            { who: "sean", text: "忙完了早点休息🌙" },
            {
              who: "narr",
              text: "他没接那句“看我”，也没拒绝。空气里那点软，被“早点休息”轻轻按了回去。",
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
              text: "他关了灯。你扣下手机，听见自己的心跳，比冰柜的嗡嗡声还响。",
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
      text: "早上六点，换班的同事到了，顺口说了句“辛苦”。你愣了一下。一个外人顺口的两个字，竟然比他那句“没事，你忙”暖。这个念头，把你自己吓到了。",
    },
    {
      kind: "narr",
      text: "你用“负责”当面具，把体贴收在一个能自我说服的安全距离；他把焦虑装成一个价值观质问。谁都有道理。道理最多的那晚，人最冷。",
    },
    {
      kind: "narr",
      text: "也许那晚你就决定了。只是这句话，你拖了很久，才说出口。",
    },
  ],
};

/* ─────────── 结束 & 事后 · 幕6 · 分手夜（相爱却走不下去） ───────────
 * 收走留在对方宿舍的东西。不是无声风化：有挽留、有眼泪。
 * 可“在一起还是会吵个不停”横在中间——两个相爱的人，含着泪做了清醒的决定。
 * 哭着把话说明白，然后好好放手。爱是真的，分开也是真的。
 * 延迟的痛：他当晚睡得很好（回避式麻木），真正的痛半年后才砸下来。
 */
const END_BREAKUP: Scene = {
  id: "end_breakup",
  title: "好天气",
  phase: "strained",
  bg: "/images/scenes/sunny-dorm.png",
  seanFace: "smile",
  faceSet: "sunny",
  onDone: "/game?scene=after_konbini",
  brief:
    "他实习后头一次回校的周末。你来收走留在他宿舍的东西，一个轻得不像样的袋子。那天天气很好，好得连一个分手的理由都不给。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "他去实习的第两个星期，周五晚上，手机亮了。",
    },
    { kind: "phone", on: true },
    { kind: "line", who: "sean", text: "早安", time: "昨天 08:37" },
    { kind: "line", who: "vera", text: "早安" },
    { kind: "line", who: "sean", text: "晚安，早点睡", time: "昨天 23:41" },
    { kind: "line", who: "vera", text: "晚安" },
    {
      kind: "narr",
      text: "这两个星期，你们的对话只剩下这些。今晚，是第一句别的。",
    },
    { kind: "line", who: "sean", text: "我周末回学校。能不能见一面。", time: "19:02" },
    { kind: "line", who: "vera", text: "好。正好我有东西落你那了。", face: "composed" },
    { kind: "phone", on: false },
    {
      kind: "narr",
      text: "你答应得很快，又补了那半句。像需要一个不是为了见他的理由。",
    },
    {
      kind: "narr",
      text: "周六下午，你到了他宿舍。天气好得过分。",
    },
    {
      kind: "narr",
      text: "你把落在他这儿的东西收进袋子：一支用秃的眉笔、半包没吃完的糖、一张电影票根。四个季节的痕迹，五分钟就收完了。",
    },
    {
      kind: "narr",
      text: "他没帮忙，也没走开。最后是他先弯腰，把床头那根充电线卷好递过来。用你教他的绕法，三圈，收口朝里。",
    },
    { kind: "line", who: "sean", text: "……这个也是你的。" },
    {
      kind: "narr",
      text: "你接过来。指尖碰了一下，谁都没缩，谁也没停。桌上还摊着那本《非暴力沟通》，你的便利贴还夹在第三章。",
    },
    {
      kind: "line",
      who: "sean",
      text: "你这支眉笔，都秃成这样了还留着。",
      face: "smile",
    },
    {
      kind: "narr",
      text: "他在找话说。声音比平时高半度，像怕屋子一静下来，就要说正事了。",
    },
    {
      kind: "line",
      who: "sean",
      text: "楼下肠粉店换老板了，你知道吗。新老板的酱汁不行。",
    },
    { kind: "line", who: "vera", text: "嗯。", face: "composed" },
    {
      kind: "narr",
      text: "你没接他的话。不是想对他冷。是查手机那晚之后，有个东西碎在了你们中间。你试过，拼不回去。",
    },
    {
      kind: "line",
      who: "sean",
      text: "……别搞得这么伤感。大晴天的。",
      face: "smile",
    },
    { kind: "narr", text: "他笑了一下，没笑成。窗外的阳光好得不讲道理。" },
    {
      kind: "beat",
      prompt: "袋子装满了。话还空着。你开口——",
      situation: "分手在两个人心里各自演练过很多遍。今晚只是把它说出来。",
      choices: [
        {
          text: "最近好像都挺忙的……先这样？",
          face: "smile",
          reply: [
            { who: "sean", text: "……别这样说。", face: "pleading" },
            { who: "sean", text: "要说，就好好说。" },
            {
              who: "narr",
              text: "他没接你递的台阶。这一次，他不肯让这段感情就这么糊弄过去。",
            },
          ],
        },
        {
          text: "我们谈谈吧。好好谈一次。",
          reach: true,
          face: "composed",
          reply: [
            { who: "sean", text: "嗯。我也想说。", face: "pleading" },
            {
              who: "narr",
              text: "他把椅子转过来，面对你坐下，像从前无数次讨论未来那样。只是这次要谈的，是怎么结束。",
            },
          ],
        },
        {
          text: "（低头收拾，不说话）",
          face: "composed",
          reply: [
            { who: "narr", text: "沉默涨满整个房间。最后是他先开口。" },
            { who: "sean", text: "Vera。我们谈谈吧。", face: "pleading" },
          ],
        },
      ],
    },
    {
      kind: "narr",
      text: "这场谈话比想象里平静。查手机那晚、发烧那晚，还有更多连名字都没有的晚上，一件一件摆出来，像在对账。",
    },
    {
      kind: "line",
      who: "sean",
      text: "我知道我老说“等我搞完”。我想改，一忙起来就忘。你等我的时候，我都知道。",
      face: "pleading",
    },
    {
      kind: "line",
      who: "vera",
      text: "我也一样。说好要好好说话，一急，还是那样。",
      face: "composed",
    },
    {
      kind: "narr",
      text: "都认了。认得这么干脆，反而没话了。楼下传来拍球声，一下，一下，很远。",
    },
    { kind: "line", who: "sean", text: "……要不，我们再试试？", face: "pleading" },
    {
      kind: "narr",
      text: "他说得很轻，眼睛却直直看着你。那个眼神你认得，是黑客松楼梯间，他抱住你之前的那个。",
    },
    {
      kind: "beat",
      prompt: "“再试试”。这三个字你等了很久，也怕了很久。你——",
      situation: "他真的挽留了。可查手机、发烧夜那些没解开的结还在，谁都绕不过去。",
      choices: [
        {
          text: "我不想就这么结束。",
          reach: true,
          face: "crying",
          say: "……我也不想就这么结束。",
          reply: [
            {
              who: "narr",
              text: "话一出口，你们俩都哭了。不是嚎啕，是眼泪自己下来的那种。",
            },
            { who: "sean", text: "那就不结束。", face: "grieving" },
            { who: "narr", text: "可谁都没动。因为下一句话，你们都知道。" },
          ],
          after: [
            { who: "vera", text: "可我们在一起，还是会吵个不停。" },
            {
              who: "narr",
              text: "他没反驳。反驳不了。工具你们试过，道歉试过，“下一次一定”也试过。每一次都是真心的，每一次都没撑过下一场忙。",
            },
          ],
        },
        {
          text: "试过了。我们都试过了。",
          face: "composed",
          reply: [
            { who: "sean", text: "……嗯。", face: "grieving" },
            {
              who: "narr",
              text: "他点头点得很慢，像在跟自己确认。眼睛红了，声音没抖。",
            },
          ],
          after: [
            { who: "vera", text: "不是不爱。是我们在一起，还是会吵个不停。" },
            { who: "narr", text: "这句话横在中间。谁也绕不过去。" },
          ],
        },
        {
          text: "（摇头，眼泪先掉下来）",
          face: "crying",
          reply: [
            {
              who: "narr",
              text: "你说不出话。他伸手想替你擦，手到一半停住了。从今晚起，这个动作没有资格了。",
            },
            { who: "sean", text: "……对不起。不是你的错。", face: "grieving" },
          ],
          after: [
            { who: "vera", text: "也不是你的错。可我们在一起，还是会吵个不停。" },
            { who: "narr", text: "他没反驳。反驳不了。" },
          ],
        },
      ],
    },
    {
      kind: "narr",
      text: "然后是那些没得吵的：毕业就在明年，实习各在一个城市，两份都还没落地的人生。你们把小房子规划到了狗的品种，却没算过，两个人先在哪里站稳。",
    },
    { kind: "line", who: "vera", text: "我们没有输。我们只是，到这了。" },
    { kind: "line", who: "sean", text: "……嗯。到这了。", face: "grieving" },
    {
      kind: "narr",
      text: "东西收完了。话也说完了。太阳西斜下来，还是好天气。",
    },
    { kind: "bg", src: "/images/scenes/door-doorway-sunny.png" },
    {
      kind: "narr",
      text: "宿舍楼门口，西斜的太阳把两个影子拉得很长。他替你拉开门，像过去每一次送你下楼。",
    },
    { kind: "line", who: "sean", text: "都拿好了？" },
    { kind: "narr", text: "你点头。他也点头。都在等对方先转身。" },
    {
      kind: "beat",
      prompt: "最后一句话了。你说——",
      situation: "哭着把话说明白了。现在是好好放手的部分。",
      choices: [
        {
          text: "谢谢你。那些都是真的。",
          reach: true,
          face: "crying",
          reply: [
            { who: "sean", text: "……嗯。都是真的。", face: "grieving" },
            {
              who: "narr",
              text: "他哭了。没出声，就那么站在夕阳里，眼泪下来了。你第一次看见他哭。也是最后一次。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你转身下楼。身后的门很久没响。他站了很久，才关上。",
            },
          ],
        },
        {
          text: "照顾好自己。别老熬夜。",
          face: "composed",
          reply: [
            { who: "sean", text: "你也是。……路上小心。" },
            {
              who: "narr",
              text: "还是那句老夫老妻的口头禅。只是从今晚起，它退回成一句客气话。",
            },
          ],
          after: [
            {
              who: "narr",
              text: "你走进暮色里。那句“路上小心”，后来跟了你很多年。",
            },
          ],
        },
        {
          text: "（抱他一下，很快松开）",
          reach: true,
          face: "crying",
          reply: [
            {
              who: "narr",
              text: "他愣了半拍，手才落到你背上。落下来的时候，你感觉到他在抖。",
            },
            {
              who: "sean",
              text: "……走吧。再不走，我要说话不算话了。",
              face: "grieving",
            },
          ],
          after: [
            { who: "narr", text: "你走得很快。眼泪是下了楼才掉的。" },
          ],
        },
      ],
    },
    {
      kind: "narr",
      text: "没有谁做错决定。两个相爱的人，一起承认了现实：爱是真的，分开也是真的。",
    },
    {
      kind: "narr",
      text: "那晚他把相册从头翻到尾。有你的朋友圈，一条，一条，都设成了仅自己可见。没有删。他带着泪痕睡着了。",
    },
    {
      kind: "narr",
      text: "这些，你都是后来才知道的。",
    },
    {
      kind: "narr",
      text: "你走出宿舍楼。天边还亮着，好得不像话。你允许自己哭到路口。路口以后的路，你想清醒地走。",
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
  veraFace: "calm",
  faceSet: "konbini",
  portraits: "vera",
  onDone: "/ending",
  brief:
    "还是那家便利店。玻璃门开开合合，冷气扑脸。你一个人，站在关东煮前。",
  pov: "vera",
  script: [
    {
      kind: "narr",
      text: "半年后。你下了班，习惯性地拐进这家便利店。玻璃门开合，冷气扑脸，像什么都没变。",
    },
    {
      kind: "narr",
      text: "柜台后面站着个新来的兼职生，站在你从前站的位置。",
    },
    {
      kind: "narr",
      text: "你拿了两串关东煮。结账的时候，兼职生问：“要加汤吗？”",
    },
    {
      kind: "line",
      who: "vera",
      text: "要，谢谢。今天有点冷。",
    },
    {
      kind: "narr",
      text: "你说得很慢，但说完整了：要，谢谢，今天有点冷。一句没经过任何修饰的真话。",
    },
    {
      kind: "narr",
      text: "说完，你想起那个发烧的夜晚。他发来“你来好不好”，五个字，你盯着看了很久，最后一个字都没能回。那晚，你连“我想去”都没说出口。",
    },
    {
      kind: "narr",
      text: "换作从前，你也只会说“要”。“冷”这个字你是不说的。听着像抱怨，像索取。现在你知道了：说出来，别人才接得住。",
    },
    {
      kind: "narr",
      text: "收银台边多了个小桶，插着单支装的玫瑰，九块九一支。便利店也开始卖花了。你看了两眼，没买。不急。",
    },
    {
      kind: "beat",
      prompt: "你捧着纸杯，忽然想起从前——",
      situation: "她一个人，却开始能好好说话。痛过去了，人长出来一点。",
      choices: [
        {
          text: "（对自己笑）慢慢来。",
          reach: true,
          face: "calm",
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
          face: "calm",
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
      text: "玫瑰还在，下次。你开始能好好说话了。这件事本身，就是那朵花开了。",
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

/* ─────────── 回看 · 叫花鸡（看 Sean 那一侧） ───────────
 * 你以为你都记得。可当时你只看见他没回应你——没看见他那一侧在沉。
 * 这不是控诉他，是让玩家"看见"：他不是不爱，是先被自己淹没了。
 */
export const HACKATHON_LOOKBACK: Lookback = {
  id: "warm_hackathon",
  title: "回看 · 叫花鸡",
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
        "我知道那是她的手。可我一抬头，那个 bug 就从脑子里溜了。等我搞完，一定好好牵回来。我总是说“等我搞完”。",
      who: "sean",
    },
    {
      bg: "/images/scenes/hackathon-venue.png",
      surface: "你问他吃什么，他头也不抬：“随便，你点吧。”",
      hidden:
        "不是随便。是我连挑一个菜的力气，都想省下来给代码。她记得我不吃辣、爱清淡。我却把这份记得，当成了理所当然。",
      who: "sean",
    },
    {
      bg: "/images/scenes/hackathon-stairs.png",
      surface: "楼梯上，他抱住你，一口气倒完了一肚子苦水。",
      hidden:
        "她等了我一整晚。我却先说了我的累。等她开口我才发现，原来我一直在被她接住，却从没问过她，累不累。",
      who: "sean",
    },
  ],
  reachback: {
    prompt: "那一晚，你们都在笨拙地爱着。只是谁也没接住谁。",
    choice: "如果能回到那晚，这次先开口的是你：“我也累了。你呢？”",
    response: [
      "你回不去那一晚了。",
      "但你记住了：接住，是两个人的事。",
      "下次有人向你伸手，你会认得出，也记得伸出自己的手。",
    ],
  },
  outro: [
    "原来那晚，他不是没看见你。",
    "他只是，先被自己淹没了。",
    "有些手，当年没能牵住。",
    "但你已经开始看见了。",
  ],
};

/* ─────────── 回看 · 挑衣服（看 Sean 那一侧） ───────────
 * 他不是不喜欢被照顾。他只是也想被问一句。你以为的默契，一半是他的退让。
 */
export const SHOPPING_LOOKBACK: Lookback = {
  id: "warm_shopping",
  title: "回看 · 挑衣服",
  seanPortrait: "sean-warm-cloth",
  intro: [
    "那个下午，你记得的全是甜。",
    "可有些话，他当时没说。",
    "再看一遍。这次，看他。",
  ],
  moments: [
    {
      bg: "/images/scenes/mall-fitting.png",
      surface: "你直接把那件深蓝的递给他：\"这件。试试。\"他说了句\"行\"，拎着衣服进了试衣间。",
      hidden:
        "我是真喜欢她挑的。可那天我口袋里存着一张自己看中的外套的照片，比了一路，最后没好意思拿出来。",
      who: "sean",
    },
    {
      bg: "/images/scenes/mall-fitting.png",
      surface: "你问他：\"这个颜色不会太老气？\"他说：\"你选的应该没问题。\"",
      hidden:
        "我说\"应该\"，其实是\"肯定\"。我从来不觉得她选的有问题。只是那句话，我本来想说\"我也喜欢\"，最后还是等她定了。",
      who: "sean",
    },
    {
      bg: "/images/scenes/mall-fitting.png",
      surface: "你拿起另一件：\"要不，这件也拿上？\"他\"又来了\"地笑，还是接了过去。",
      hidden:
        "她一兴奋起来就停不下。我说\"又来了\"，是宠她。但那天其实有点累，两件一起试，镜子前前后后站了挺久。我没说，怕她扫兴。",
      who: "sean",
    },
  ],
  reachback: {
    prompt: "他不是不喜欢被你照顾。他只是也想，被你问一句。",
    choice: "如果能回到那家店，这次你问他：“你想穿哪件？”",
    response: [
      "你回不去那个下午了。",
      "但你记住了：照顾不是替他选，是让他也能选。",
      "爱一个人，要留一点他自己的位置。",
    ],
  },
  outro: [
    "原来他一直都接着你的好。",
    "只是有些“我也想”，他从来没说出口。",
    "你以为的默契，有一半是他的退让。",
    "现在你看见了。",
  ],
};

/* ─────────── 回看 · 非暴力沟通（看 Sean 那一侧） ───────────
 * 两个人都真心想改。工具在手，只是没撑过后来忙起来的日子。
 */
export const NVC_LOOKBACK: Lookback = {
  id: "warm_nvc",
  title: "回看 · 非暴力沟通",
  seanPortrait: "sean-thinking-bench",
  intro: [
    "那条长椅上，你们聊过怎么更好地爱。",
    "你一直以为，只有你在努力。",
    "再看一遍。这次，看他。",
  ],
  moments: [
    {
      bg: "/images/scenes/campus-bench.png",
      surface: "你说想学非暴力沟通。他说：“我挺喜欢你这股劲的。”",
      hidden:
        "她敢把自己的毛病摊开来讲。我不敢。“等我搞完”这四个字，我心里检讨过一百遍，一次都没说出口。",
      who: "sean",
    },
    {
      bg: "/images/scenes/campus-bench.png",
      surface: "他说“你要是学到什么，多跟我讲讲”。你干脆把书塞给了他：一起看。",
      hidden:
        "我真翻了，翻到第三章。后来赶一个截止日期，书垫到了显示器底下。我一直想着要补上。",
      who: "sean",
    },
    {
      bg: "/images/scenes/warm-room.png",
      surface: "暮色里你们规划小房子：朝南，阳台要大，狗养柯基。",
      hidden:
        "我说“慢慢来”，其实是心虚。房子、狗、退休，每一样我都想给她。可我连下个月实习落在哪个城市，都不敢跟她细算。",
      who: "sean",
    },
  ],
  reachback: {
    prompt: "你们都真心想改。只是没有人说：忘了怎么办。",
    choice: "如果能回到那条长椅，这次你说：“我们互相提醒，好不好。忘了，也不怪。”",
    response: [
      "你回不去那条长椅了。",
      "但你记住了：想改是开始，撑住才是路。",
      "两个人的功课，要两个人一起交。",
    ],
  },
  outro: [
    "工具你们真的握过。",
    "不是没用，是没撑过忙起来的日子。",
    "你们做得到，只是撑不住。",
    "看见这一点，就不必再怪谁。",
  ],
};

/* ─────────── 回看 · 查手机（看 Sean 那一侧） ───────────
 * 被不信任刺伤的人，先把自己缩起来。他不是无辜的，你也不是坏人。
 */
export const PHONE_LOOKBACK: Lookback = {
  id: "burst_phone",
  title: "回看 · 关注列表",
  seanPortrait: "sean-wooded-phone",
  intro: [
    "那晚是整段关系里，唯一大声的一次。",
    "你记得自己的慌。没看见他的。",
    "再看一遍。这次，看他。",
  ],
  moments: [
    {
      bg: "/images/scenes/dorm-room-night.png",
      surface: "他拖着新买的行李箱推门进来，看见你举着他的手机。他问：“你动我手机？”",
      hidden:
        "密码是她的生日，设了两年，没换过。我以为这就算把话说清楚了。原来该说的话，不能只靠一串密码替我说。",
      who: "sean",
    },
    {
      bg: "/images/scenes/dorm-room-night.png",
      surface: "你举着屏幕质问那些关注。他说了句“朋友”，往后退了半步。",
      hidden:
        "那半步不是心虚。是我忽然明白，怎么解释都没用了。她眼睛里已经有了答案。我这个人，输给了一列名单。",
      who: "sean",
    },
    {
      bg: "/images/scenes/dorm-room-night.png",
      surface: "送你回去的路上，他隔着半步。到你楼下，他只说了句“到了”。",
      hidden:
        "回去我没睡。行李收到一半的屋子里，我把那些关注一个个想了一遍，想我到底哪里让她这么不安。想到最后只剩一个问题：她为什么不能好好问我，我又为什么，不能好好说。",
      who: "sean",
    },
  ],
  reachback: {
    prompt: "你缺的从来不是证据。是一句敢问出口的话。",
    choice:
      "如果能回到那晚，这次你不翻。你把手机递还给他：“刚才弹出来一条消息，我心里发慌。你陪我说说话。”",
    response: [
      "你回不去那一晚了。",
      "但你记住了：不安可以直接说，不用先找罪证。",
      "问，是把心递给他；查，是把判决书递给他。",
    ],
  },
  outro: [
    "他不是无辜的。回复慢、社交含糊、从不主动安抚。",
    "你也不是坏人。你只是怕，怕到不敢直接问。",
    "那晚没有赢家，只有两个受了伤还装没事的人。",
    "冷处理不是和解。你们都知道，只是都没力气了。",
  ],
};

/* ─────────── 回看 · 发烧夜（看 Sean 那一侧） ───────────
 * 那句"你来好不好"他真的发出去了。她盯着五个字，没能答。
 */
export const FEVER_LOOKBACK: Lookback = {
  id: "cold_fever",
  title: "回看 · 外卖粥",
  hidePortraits: true,
  intro: [
    "那晚你守住了柜台，守住了“负责”。",
    "有一句话，你一直没敢答。",
    "再看一遍。这次，看他。",
  ],
  moments: [
    {
      bg: "/images/scenes/fever-night.png",
      surface:
        "凌晨两点，他发来“发烧了，三十八度八”，紧接着补了一条：“没事，你忙。”",
      hidden:
        "“没事”是假的。我盯着对话框打了又删，删了又打。那句真话，我攒到凌晨四点，才敢发出去。",
      who: "sean",
    },
    {
      bg: "/images/scenes/fever-night.png",
      surface: "他发来一个红包，一百五十块。备注：\"我想买你一个晚上。\"你盯着屏幕，不知道该收还是退。",
      hidden:
        "我不是真想用钱买她的时间。我只是想不出别的办法了。我知道她缺钱，知道她为了多赚五十块排夜班。可我打出这句的时候，就知道它一定会伤人。我还是发了。我想让她知道，我是认真的。",
      who: "sean",
    },
    {
      bg: "/images/scenes/fever-night.png",
      surface: "凌晨四点半，他发来那句：“以后结婚了，工作也比家庭重要吗？”",
      hidden:
        "发完我就后悔了。我不是要审判她。我是烧得只剩一个念头：连生病都等不来她，那些说好的以后算什么。这句话一出口就变了形，成了刀。",
      who: "sean",
    },
  ],
  reachback: {
    prompt: "那晚没有对错。只有一句终于发出来的“你来好不好”，和一个走不开的你。",
    choice:
      "如果能回到那晚，打一个电话过去：“我六点下班，下了班就坐车去看你。你先睡，我说到做到。”",
    response: [
      "你回不去那一晚了。",
      "但你记住了：责任和身边，中间有一条路。一个电话，一句准话，一个说到做到的时间。",
      "从来都不是二选一。",
    ],
  },
  outro: [
    "他要的不是你扔下柜台。是知道自己排在哪。",
    "你守的不是那个柜台。是一个不敢欠人情、不敢开口求人换班的自己。",
    "谁都有道理。道理最多的那晚，人最冷。",
    "那晚之后，有句话在你心里住下了。你拖了很久才说。",
  ],
};

/* ─────────── 回看 · 分手夜（看他） ───────────
 * 想挽留又不敢，两边都是。回看统一只看他那一侧。
 */
export const BREAKUP_LOOKBACK: Lookback = {
  id: "end_breakup",
  title: "回看 · 好天气",
  seanPortrait: "sean-grieving-sunny",
  intro: [
    "那晚你们把话说明白了，好好放了手。",
    "可还有几句，留在了各自心里。",
    "再看一遍。这次，看他。",
  ],
  moments: [
    {
      bg: "/images/scenes/sunny-dorm.png",
      surface: "他把卷好的充电线递给你，用你教他的绕法。",
      hidden:
        "那个绕法是她教我的。卷的时候我在想，往后我大概一辈子都会这么卷线。她带来的东西收得走，她教会我的，收不走。",
      who: "sean",
    },
    {
      bg: "/images/scenes/sunny-dorm.png",
      surface: "他说“要不，我们再试试”。你说：可我们在一起，还是会吵个不停。",
      hidden:
        "她说得对，我没反驳。可那句“再试试”不是随口说的。我是真想赌一把。只是她清醒，我就不能拖着她陪我赌。",
      who: "sean",
    },
    {
      bg: "/images/scenes/door-doorway-sunny.png",
      surface: "夕阳把影子拉得很长。你转身走出楼门口，没有回头。",
      hidden:
        "她走得很稳，一次都没回头。我在门口站到她拐过路口，差一点就喊出来了。可我知道，喊住她，我们还是会走回这个门口。",
      who: "sean",
    },
  ],
  reachback: {
    prompt: "分开也许还是会分开。可有一句话，值得当面说完。",
    choice:
      "如果能回到那个门口，这次你说：“我们没有输。谢谢你，真的爱过我。”",
    response: [
      "你回不去那个门口了。",
      "但你记住了：好好告别，也是接住。接住这段感情本身。",
      "爱过的部分不作废。它跟着你们，各自去往后的日子。",
    ],
  },
  outro: [
    "那晚他把有你的朋友圈都藏了起来。一条也没删。",
    "藏，是不敢看。不删，是舍不得。半年后再点开的时候，痛才真正找到他。",
    "你走得慢，疼得早，好得也早一些。",
    "哭着把话说明白，然后好好放手。你们做到了。这不是失败。",
  ],
};

export const LOOKBACKS: Record<string, Lookback> = {
  warm_hackathon: HACKATHON_LOOKBACK,
  warm_shopping: SHOPPING_LOOKBACK,
  warm_nvc: NVC_LOOKBACK,
  burst_phone: PHONE_LOOKBACK,
  cold_fever: FEVER_LOOKBACK,
  end_breakup: BREAKUP_LOOKBACK,
};

/** 回看的顺序：按记忆的时间顺序，一段看完接下一段 */
export const LOOKBACK_SEQUENCE: string[] = [
  "warm_hackathon",
  "warm_shopping",
  "warm_nvc",
  "burst_phone",
  "cold_fever",
  "end_breakup",
];

export function getLookback(id: string): Lookback | undefined {
  return LOOKBACKS[id];
}

/** 当前回看之后的下一段记忆；最后一段返回 undefined（回看全部完成） */
export function getNextLookbackId(id: string): string | undefined {
  const i = LOOKBACK_SEQUENCE.indexOf(id);
  if (i === -1 || i >= LOOKBACK_SEQUENCE.length - 1) return undefined;
  return LOOKBACK_SEQUENCE[i + 1];
}
