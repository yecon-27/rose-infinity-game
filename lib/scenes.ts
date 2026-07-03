/**
 * 场景数据 · 时刻流(Moment Script)
 *
 * 每幕是一条"时刻"序列,活动驱动而非阅读驱动:
 *   line     底部对话框里的一句台词/旁白(传统 VN 气泡)
 *   explore  场景检视(光点 + 阿沉走近物件)
 *   activity 手上的事(分关东煮/刷酱/控伞/按住不放)——玩法即叙事
 *   talk     开口节拍(情绪天平决定话被怎样失真)
 *
 * 情绪弧线:微冷(AA,演成喜剧) → 暖(便利店) → 热闹(烧烤) → 最暖(共伞) → 轻(先这样) → 暖(尾声)
 * 旁白原则:只描述画面,不解释人心——深意全靠留白。
 */

/** 场景中可检视的物件 */
export interface Hotspot {
  id: string;
  name: string;
  /** 相对背景图的百分比坐标 */
  x: number;
  y: number;
  /** 检视时阿沉的内心观察 */
  observation: string;
  /** 检视后为下一个开口节拍解锁的更真的话(标 ◆) */
  unlocksImpulse?: string;
}

/** 开口节拍 */
export interface TalkSpec {
  /** 输入引导语 */
  prompt: string;
  situation: string;
  amoDirection: string;
  /** 预设念头(2-3 条,含幽默/日常向) */
  impulses: string[];
  /** 终幕最后一次开口,裂纹足够时穿透 */
  pierceable?: boolean;
  /** 本次开口的倒计时秒数(默认 20;终幕压缩到 12/8,戏在逼近) */
  timerSeconds?: number;
}

/** 活动结果的一侧(好/坏) */
export interface ActivityOutcome {
  /** 结果台词(依次在对话框播放) */
  lines: Array<{ speaker: "amo" | "chen" | "narr"; text: string }>;
  /** 天平向心力:正=拉回安稳,负=推离安稳 */
  centering: number;
}

export type ActivitySpec =
  | {
      type: "hold";
      title: string;
      /** 操作说明,如"按住空格 = 把手机推过去" */
      instruction: string;
      seconds: number;
      good: ActivityOutcome; // 坚持到底
      bad: ActivityOutcome; // 提前松手/没按
    }
  | {
      type: "pick";
      title: string;
      instruction: string;
      picks: number;
      items: Array<{
        name: string;
        /** 她的心头好 */
        hers?: boolean;
        /** 雷(她不吃) */
        avoid?: boolean;
      }>;
      good: ActivityOutcome; // 命中喜好且没踩雷
      bad: ActivityOutcome; // 踩雷或全没记住
    }
  | {
      type: "brush";
      title: string;
      instruction: string;
      /** 理想刷酱次数,超过太多=糊 */
      target: number;
      good: ActivityOutcome;
      bad: ActivityOutcome; // 刷过头烤糊了
    }
  | {
      type: "balance";
      title: string;
      instruction: string;
      seconds: number;
      /** 过程中浮现的台词,at 为进度百分比 */
      during?: Array<{ at: number; speaker: "amo" | "narr"; text: string }>;
      good: ActivityOutcome; // 大部分时间伞偏向她
      bad: ActivityOutcome;
    };

export type Moment =
  | { kind: "narr"; text: string }
  | { kind: "line"; speaker: "amo" | "chen"; text: string }
  | { kind: "hint"; text: string }
  | { kind: "explore"; hotspots: Hotspot[]; hint?: string }
  | { kind: "activity"; activity: ActivitySpec }
  | { kind: "talk"; talk: TalkSpec }
  /** 剧情冲击:静默地推动天平(负=向焦虑,正=向回避)。心被砸了一下,玩家在天平上看得见 */
  | { kind: "shift"; delta: number };

export interface Scene {
  id: string;
  name: string;
  brief: string;
  script: Moment[];
  /** 穿透结局专用的替换收尾(仅终幕,替换 script 末尾的连续 narr) */
  piercedClosing?: string[];
  goldenQuote: string;
  background: string;
  amoPortrait?: string;
  /** 尾声(无开口节拍,不存档) */
  isEpilogue?: boolean;
  /**
   * 她那边 · 幕间碎片(暗线):本幕结束后的黑场插页,1-2 句,只描述动作不解释。
   * 只给谜面不给谜底——结局的对称揭示是最后一块拼图,不是第一次亮相。
   */
  herSide?: string[];
  aiGeneratedRef: string;
}

export const SCENES: Record<string, Scene> = {
  /* ─────────────── 幕一 · 第七次约会(教学,微冷但演成喜剧) ─────────────── */
  act1_aa: {
    id: "act1_aa",
    name: "幕一 · 第七次约会",
    brief: "两人第七次约会,吃完饭,账单放在桌上,阿默提议 AA。",
    script: [
      {
        kind: "narr",
        text: "第七次约会。这家店的灯光很暖,暖到连账单看起来都没那么锋利。",
      },
      {
        kind: "narr",
        text: "服务员把账单放在桌上,站在一旁,姿势礼貌,但没走。",
      },
      { kind: "line", speaker: "amo", text: "扫这个吧,我们 AA。" },
      {
        kind: "hint",
        text: "【玩法】场景里亮着光点:点击(或 ←→ 选 + E)检视,有些细节会让你找到更真的话(◆)。顶部的天平是你此刻的心:在安稳区,话会原样说出;偏到回避或焦虑,话会被拧成别的样子——那是你拦不住的。",
      },
      {
        kind: "explore",
        hint: "服务员还没走。先看看这一桌。",
        hotspots: [
          {
            id: "bill",
            name: "账单",
            x: 42,
            y: 66,
            observation:
              "白纸黑字,小数点后两位都分得清。你们连误差都不肯欠对方。",
            unlocksImpulse:
              "这顿我请,下次你请。这样我们就一直有下次。",
          },
          {
            id: "qrcode",
            name: "她举着的付款码",
            x: 68,
            y: 48,
            observation:
              "付款码已经亮了。她总是比你快一步——快得像在抢答。",
          },
          {
            id: "window",
            name: "窗外",
            x: 18,
            y: 28,
            observation:
              "路口有一对情侣在分一杯奶茶,一人一口。你想不起来你们上次共用一样东西是什么时候。",
          },
          {
            id: "phone-down",
            name: "扣在桌上的手机",
            x: 58,
            y: 72,
            observation:
              "刚才有条通知在她锁屏上亮了一下。她翻过手机扣在桌上——这个动作,比她掏付款码还快。",
          },
        ],
      },
      {
        kind: "talk",
        talk: {
          prompt: "服务员还站在旁边。你心里想说——",
          situation:
            "账单在桌上,服务员在等,阿默举着付款码等阿沉扫,态度自然得像天经地义。",
          amoDirection:
            "她在等他扫码。他照做,她松口气顺势聊轻松的;他说想请客或别的,她愣一下,然后用玩笑把分量卸掉——但不会不高兴,她其实吃这套。",
          impulses: [
            "这顿我想请你。就这一次,别跟我算。",
            "行,AA 挺好的,清楚。",
          ],
        },
      },
      {
        kind: "activity",
        activity: {
          type: "hold",
          title: "结账",
          instruction:
            "按住空格(或长按按钮)= 把自己的手机推过去,这顿我来 · 提前松手 = 扫她的码",
          seconds: 3,
          good: {
            lines: [
              {
                speaker: "narr",
                text: "你把手机推了过去。她的付款码举在半空。",
              },
              { speaker: "amo", text: "……干嘛啊。" },
              {
                speaker: "narr",
                text: "过了几秒,她把手机收了回去,没再坚持。",
              },
              { speaker: "amo", text: "下次我请。" },
            ],
            centering: 14,
          },
          bad: {
            lines: [
              { speaker: "narr", text: "你扫了码。金额一人一半,分毫不差。" },
              { speaker: "amo", text: "嗯。" },
              {
                speaker: "narr",
                text: "她把小票折成一个小方块,收进包里。她的包里,有很多这样的方块。",
              },
            ],
            centering: -6,
          },
        },
      },
      {
        kind: "line",
        speaker: "amo",
        text: "这家还行吧?下次可以试试他们家新出的火锅。",
      },
      {
        kind: "talk",
        talk: {
          prompt: "'下次'这个词在你耳朵里停了一下。你心里想说——",
          situation:
            "账结完了,两人还坐在桌边。阿默在聊'下次吃什么'——聊的是餐厅,不是你们。",
          amoDirection:
            "她用'下次'维持轻松。他接得轻松,她就眉飞色舞地聊火锅蘸料;他把话题引向两个人,她接一半,拐回食物——但嘴角是翘的。",
          impulses: [
            "你说'下次'的时候,能不能看着我说。",
            "行啊,火锅可以,下次你定时间。",
          ],
        },
      },
      {
        kind: "narr",
        text: "走出餐厅,夜风把灯光吹得晃了晃。路口,她的地铁进站了。",
      },
      {
        kind: "narr",
        text: "你手里还捏着没递出去的那半句话。",
      },
    ],
    goldenQuote: "她的地铁进站了。你手里还捏着没递出去的半句话。",
    herSide: [
      "她到家了。今天的小票折成方块,放进一个铁盒。",
      "铁盒里已经很满了。她数过,但没跟任何人说过这个数字。",
    ],
    background: "/images/scenes/act1_restaurant.png",
    aiGeneratedRef: "#004 / #005 / #006",
  },

  /* ─────────────── 幕二 · 便利店夜宵(暖) ─────────────── */
  act2_konbini: {
    id: "act2_konbini",
    name: "幕二 · 便利店夜宵",
    brief:
      "十一点半,阿沉加班结束,阿默约在他家楼下的便利店吃关东煮。她的正常人模式。",
    script: [
      {
        kind: "narr",
        text: "十一点半,加班结束。手机震了一下,是她发来的定位:你家楼下的便利店。",
      },
      {
        kind: "line",
        speaker: "amo",
        text: "我在你楼下。你肯定又没吃饭。",
      },
      {
        kind: "narr",
        text: "她比你先到,手里已经拿好了两个纸杯,正扒着玻璃柜看汤锅冒热气。白炽灯下,她比在任何餐厅里都放松。",
      },
      {
        kind: "activity",
        activity: {
          type: "pick",
          title: "挑关东煮",
          instruction:
            "挑四样,你们俩分。记不记得她爱吃什么、不吃什么,就看这一杯了。",
          picks: 4,
          items: [
            { name: "白萝卜", hers: true },
            { name: "溏心蛋", hers: true },
            { name: "昆布结", hers: true },
            { name: "香菜牛肉丸", avoid: true },
            { name: "年糕" },
            { name: "鱼豆腐" },
          ],
          good: {
            lines: [
              { speaker: "amo", text: "……巧了。我正想拿这个。" },
              {
                speaker: "narr",
                text: "她的耳朵红了一点。可能是热气熏的。",
              },
            ],
            centering: 14,
          },
          bad: {
            lines: [
              { speaker: "amo", text: "我不吃香菜。" },
              {
                speaker: "narr",
                text: "她把那颗丸子夹进你的杯子,没有说第二句。这句话,七个月里她说过四次了。",
              },
            ],
            centering: -8,
          },
        },
      },
      {
        kind: "narr",
        text: "你们蹲在店门口的马路牙子上,一人一杯。热气糊在脸上。",
      },
      {
        kind: "explore",
        hint: "夜里的便利店门口,有很多小东西在发光。",
        hotspots: [
          {
            id: "lightbox",
            name: "灯箱",
            x: 20,
            y: 30,
            observation:
              "便利店的灯永远这么亮,亮得像不打烊的白天。她在这种光里说话,声音都比平时软。",
          },
          {
            id: "cat",
            name: "路过的橘猫",
            x: 75,
            y: 78,
            observation:
              "一只橘猫路过。她小声'咝咝'地唤它,唤了三次。你第一次听见她用这种声音说话。",
            unlocksImpulse: "你对猫说话的声音,没对我用过。",
          },
          {
            id: "reflection",
            name: "玻璃上的倒影",
            x: 50,
            y: 40,
            observation:
              "玻璃上映着你们俩,肩挨着肩。倒影里的距离,比真的近。",
          },
        ],
      },
      {
        kind: "talk",
        talk: {
          prompt: "萝卜还烫着。你心里想说——",
          situation:
            "深夜便利店门口,两人蹲着分食关东煮,气氛松弛。这是七个月来少有的、不需要表演的时刻。",
          amoDirection:
            "安稳时刻,她是正常人模式:会接梗、会主动讲白天的事。他说了真话她会意外然后笨拙地接住;他开玩笑她会回敬一个更狠的。她心里压着一件没说的事(外地的 offer,她还没决定),偶尔会走神半秒——这件事只允许出现在她的 inner 里,嘴上绝不提。",
          impulses: [
            "现在这样,比哪一次约会都好。",
            "你怎么每次都知道我没吃饭。",
            "萝卜不错,入味。",
          ],
        },
      },
      {
        kind: "line",
        speaker: "amo",
        text: "最后一个给你。我饱了。",
      },
      {
        kind: "line",
        speaker: "amo",
        text: "这家店挺好的。……没什么。",
      },
      {
        kind: "narr",
        text: "她话说了半截,自己咽了回去。你没有追问——你们从不追问。",
      },
      {
        kind: "narr",
        text: "她把竹签插回空杯,插得整整齐齐。那晚的风,是热汤味的。",
      },
    ],
    goldenQuote: "最后一个丸子,她推给你。用的还是'推'。",
    herSide: [
      "她到家后,把两根竹签从外套口袋里拿出来。",
      "抽屉里有一枚旧的电影票根。竹签放在了它旁边。",
    ],
    background: "/images/scenes/act2_konbini.png",
    aiGeneratedRef: "#014(待生成:深夜便利店门口,水彩)",
  },

  /* ─────────────── 幕三 · 烧烤局(热闹) ─────────────── */
  act3_bbq: {
    id: "act3_bbq",
    name: "幕三 · 烧烤局",
    brief:
      "阿默的朋友攒的烧烤局,阿沉第一次以对象身份出席。人前热闹,散场后安静。",
    script: [
      {
        kind: "narr",
        text: "阿默的朋友攒了个烧烤局。她把你介绍给所有人,笑容恰到好处,像排练过。",
      },
      {
        kind: "narr",
        text: "炭火噼啪响。有人起哄:'讲讲呗,你俩怎么在一起的?'全桌的眼睛都亮了。",
      },
      { kind: "line", speaker: "amo", text: "问他,他记性比我好。" },
      {
        kind: "talk",
        talk: {
          prompt: "所有人都在等你开口。你心里想说——",
          situation:
            "烧烤局上朋友起哄问两人怎么在一起的,全桌人都在看,阿默笑着把问题踢给了阿沉。",
          amoDirection:
            "人前模式:得体、会接梗。他讲得动情她用玩笑接住,讲得敷衍她帮着补两句,讲得好笑她笑得最大声——总之不让任何真东西在饭桌上落地,但气氛是暖的。",
          impulses: [
            "她加我好友之后三天没说话,第四天发来一句:'在吗,陪我骂甲方。'",
            "就……朋友介绍,挺自然的,没什么好讲的。",
          ],
        },
      },
      {
        kind: "narr",
        text: "不管你说了什么,桌上都笑成一团。有人举杯喊'长长久久',一圈人跟着起哄。",
      },
      {
        kind: "activity",
        activity: {
          type: "brush",
          title: "给她烤一串",
          instruction:
            "她不吃辣。连点(或连按空格)给这串刷蒜蓉酱——刷够了就收手,贪多会糊。",
          target: 8,
          good: {
            lines: [
              {
                speaker: "narr",
                text: "她接过去,咬了一口,没有评价。",
              },
              {
                speaker: "narr",
                text: "但那串吃完了。签子和别的分开放。",
              },
            ],
            centering: 12,
          },
          bad: {
            lines: [
              { speaker: "narr", text: "那串肉在你手里冒起了不该有的烟。" },
              { speaker: "amo", text: "糊了。" },
              {
                speaker: "narr",
                text: "她把那串抽走,咬了一口糊的,把新的签子递到你手里。",
              },
            ],
            centering: 6,
          },
        },
      },
      {
        kind: "narr",
        text: "散场前,她的朋友把她拉到一边,低声说了句什么。你只听见半句——'……那边到底定了没?'",
      },
      {
        kind: "narr",
        text: "她摇了摇头,朝你这边看了一眼。看见你在看,她笑了一下,把杯里的酒喝完了。",
      },
      {
        kind: "narr",
        text: "散场了。朋友们各自打车走,笑声还挂在巷子口。只剩你们俩,并排走夜路。",
      },
      {
        kind: "explore",
        hint: "夜路很长。她忽然安静下来。",
        hotspots: [
          {
            id: "streetlamp",
            name: "路灯下的影子",
            x: 40,
            y: 70,
            observation:
              "影子被路灯拉长,又在下一盏灯前缩短。像你们:一靠近,就急着退回去。",
            unlocksImpulse: "刚才桌上那个你,和现在的你,哪个是真的?",
          },
          {
            id: "alley",
            name: "巷子口",
            x: 15,
            y: 40,
            observation: "笑声还留在巷子口。热闹是租来的,到点就得还。",
          },
          {
            id: "her-steps",
            name: "她的脚步",
            x: 68,
            y: 62,
            observation:
              "她走得不快不慢,和你隔着半步。七个月了,这半步,谁也没有跨过去。",
          },
        ],
      },
      { kind: "line", speaker: "amo", text: "今天……还挺累的哈。" },
      { kind: "shift", delta: -12 },
      {
        kind: "talk",
        talk: {
          prompt: "路灯把两个影子拉得很长。你心里想说——",
          situation:
            "散场后两人独处走夜路,刚才的热闹反衬出安静。她用一句'累'给沉默找了个台阶。",
          amoDirection:
            "观众走了,她收起表演,退回安全距离。'累'是台阶也是试探:他顺着说是,今晚就这样了;他说了真话,她会慌半拍,脚步慢下来。",
          impulses: [
            "你给我刷酱的时候,我差点当真了。",
            "是有点晚了。明天你还上班吧?",
          ],
        },
      },
      {
        kind: "narr",
        text: "到楼下了。门禁'滴'的一声。巷子里,烧烤味淡下去,只剩夜的味道。",
      },
    ],
    goldenQuote: "人前那么近,人后这半步,谁也没有跨过去。",
    herSide: [
      "夜里,她在朋友群里打了一行字:'别乱说话。'",
      "发出去之前,她删了,改成一个笑脸。",
    ],
    background: "/images/scenes/act2_bbq.png",
    amoPortrait: "/images/characters/amo-distant.png",
    aiGeneratedRef: "#008 / #009 / #010",
  },

  /* ─────────────── 幕四 · 一把伞(最暖,近乎无对话) ─────────────── */
  act4_umbrella: {
    id: "act4_umbrella",
    name: "幕四 · 一把伞",
    brief:
      "说好只是顺路送她。雨下起来,伞只有一把,在阿沉手里。距离第一次交到玩家手上。",
    script: [
      {
        kind: "narr",
        text: "说好只是顺路。雨下起来的时候,你们离地铁站还有六百米。",
      },
      { kind: "narr", text: "伞只有一把。在你手里。" },
      {
        kind: "activity",
        activity: {
          type: "balance",
          title: "撑伞",
          instruction:
            "按住 ← → 控制伞的倾向。往她那边偏,你的肩膀会淋湿——你自己决定。",
          seconds: 18,
          during: [
            { at: 30, speaker: "amo", text: "伞歪了。" },
            { at: 60, speaker: "amo", text: "……你肩膀湿了。" },
            { at: 85, speaker: "narr", text: "她往你这边靠了半步。就半步。" },
          ],
          good: {
            lines: [
              { speaker: "amo", text: "下次记得自己带伞。" },
              {
                speaker: "narr",
                text: "她说这话的时候没有看你。但她的手在你湿掉的袖子上,停了一下。",
              },
            ],
            centering: 16,
          },
          bad: {
            lines: [
              {
                speaker: "narr",
                text: "伞一路端得很正,谁也没多淋一滴。像 AA 制的雨。",
              },
              { speaker: "amo", text: "快到了。前面就是。" },
            ],
            centering: -6,
          },
        },
      },
      {
        kind: "explore",
        hint: "雨声把整条街的声音都盖掉了。伞下很安静。",
        hotspots: [
          {
            id: "drops",
            name: "伞骨上的水珠",
            x: 50,
            y: 20,
            observation:
              "水珠顺着伞骨滚下来,在你们中间连成一道透明的帘子。",
          },
          {
            id: "her-shoulder",
            name: "她的左肩",
            x: 68,
            y: 45,
            observation: "她的左肩也湿了。原来她也一直,往你这边偏。",
            unlocksImpulse: "雨可以再下久一点。",
          },
          {
            id: "puddle",
            name: "水洼",
            x: 30,
            y: 80,
            observation:
              "水洼里映着一把伞和四只脚。从这个角度看,你们像一个整体。",
          },
          {
            id: "billboard",
            name: "站口的灯箱",
            x: 84,
            y: 30,
            observation:
              "灯箱上是城际列车的广告:'一小时,到另一种生活。'她看了很久。你以为她在躲雨。",
          },
        ],
      },
      {
        kind: "talk",
        talk: {
          prompt: "地铁站的灯就在前面了。你心里想说——",
          situation:
            "雨中共伞,快到地铁站。伞下的十几分钟,是七个月里两人离得最近的一次。",
          amoDirection:
            "伞下的安静让她卸了一半防。他说真话,她会沉默两秒,然后说一句接近真心的话再找补;他客套,她就顺势道别——但走之前会回头看一眼伞。她刚在灯箱前想起那个没答复的 offer(只出现在 inner,嘴上不提):如果走,这把伞怎么办。",
          impulses: [
            "其实这条路不顺。我家在反方向,第一次送你就是。",
            "到了。……那,路上小心?",
          ],
        },
      },
      { kind: "narr", text: "雨停在她进站的前一分钟。谁都没说可惜。" },
    ],
    goldenQuote: "她的左肩也湿了。原来她也一直往你这边偏。",
    herSide: [
      "进站以后,她没有坐下。湿的左肩贴着车门。",
      "手机里,那封没回复的邮件她又读了一遍。标题里有'入职时间'四个字。",
    ],
    background: "/images/scenes/act4_umbrella.png",
    aiGeneratedRef: "#015(待生成:雨夜街道一把伞,水彩)",
  },

  /* ─────────────── 幕五 · 先这样(轻,不哭喊) ─────────────── */
  act5_end: {
    id: "act5_end",
    name: "幕五 · 先这样",
    brief:
      "普通的一天,没有导火索。一句'最近好像都挺忙的',关系走到了门口。",
    script: [
      {
        kind: "narr",
        text: "一个普通的周末。天气很好——连一个下雨的借口都不给你。",
      },
      {
        kind: "narr",
        text: "阿默在收拾东西。留在你这里的几件衣服、一支牙刷、一本你送的书,叠好,放进一个袋子。七个月,只有一个袋子这么轻。",
      },
      {
        kind: "line",
        speaker: "amo",
        text: "最近好像都挺忙的……要不,先这样?",
      },
      { kind: "shift", delta: -55 },
      {
        kind: "talk",
        talk: {
          prompt: "她把袋子的提手攥在手里,指节有点白。你心里想说——",
          situation:
            "阿默收拾好了东西,说出了那句轻得像怕砸坏什么的话。'先这样'三个字里没有'分手',但两个人都听懂了。",
          amoDirection:
            "她在等他挽留,同时已经预习好了他不挽留。他客套,她点头;他挽留,她说'别这样,挺好的',但手会停;他带刺,她会疼一下然后更平静。她不会先崩溃。",
          impulses: [
            "'先这样'是什么意思?你能不能把一句话说完整一次?",
            "……也行。最近确实都挺忙的。",
          ],
          timerSeconds: 12,
        },
      },
      {
        kind: "narr",
        text: "她点了点头。然后,像是终于下了什么决心,她开口了。",
      },
      {
        kind: "line",
        speaker: "amo",
        text: "有件事。下个月,我去深圳。",
      },
      {
        kind: "narr",
        text: "她说得很平,像在念别人的行程。餐厅里扣下的手机、便利店说了半截的话、她朋友那半句'那边定了没'、灯箱前那两分钟——都在这一刻对上了。",
      },
      {
        kind: "line",
        speaker: "amo",
        text: "本来想早点说的。可是让你等我,或者让你跟我走——我凭什么呢。",
      },
      {
        kind: "narr",
        text: "她提起袋子。拉开门,走廊的声控灯亮了。",
      },
      {
        kind: "activity",
        activity: {
          type: "hold",
          title: "门口",
          instruction: "按住空格,不要松手。",
          seconds: 5,
          good: {
            lines: [
              {
                speaker: "narr",
                text: "你伸手,攥住了她的袖子。她停下来。声控灯把两个影子钉在地上。",
              },
            ],
            centering: 20,
          },
          bad: {
            lines: [
              {
                speaker: "narr",
                text: "你的手抬了一半,又放下去了。她在门口站着,背对着你,停了一秒。",
              },
            ],
            centering: -10,
          },
        },
      },
      {
        kind: "talk",
        talk: {
          prompt: "声控灯快灭了。你心里想说——",
          situation:
            "阿默站在敞开的门口,这是最后几秒钟。灯是声控的——只要有人说话,它就不会灭。",
          amoDirection:
            "最后的窗口。秘密已经摊开了:她要去深圳,她不确定自己有什么资格要求他。听到的还是客套,她说'那我走啦',然后走;听到一句没有防御的真话(留下/跟她走/别先这样),她会僵在原地,很久,连体面都忘了捡。",
          impulses: [
            "别走。或者,带我走。哪个都行,别'先这样'。",
            "你不是在告诉我,你是在问我。对吧?",
            "……深圳挺好的。到了发个消息。",
          ],
          pierceable: true,
          timerSeconds: 8,
        },
      },
      { kind: "narr", text: "你说完了。她等了一秒,也许两秒。" },
      {
        kind: "narr",
        text: "然后她说'那我走啦',声音很稳。门关上的时候很轻,轻到不像一次结束。",
      },
    ],
    piercedClosing: [
      "你说完的时候,声控灯正好灭了。黑暗里,你听见她没有动。",
      "灯再亮起来,她转过身,看着你。很久。",
      "这一次,门没有关上。",
    ],
    goldenQuote: "灯是声控的。只要有人说话,它就不会灭。",
    background: "/images/scenes/act5_room.png",
    amoPortrait: "/images/characters/amo-resigned.png",
    aiGeneratedRef: "#011 / #012 / #013",
  },

  /* ─────────────── 尾声(半年后,Florence 式成长收尾) ─────────────── */
  epilogue_open: {
    id: "epilogue_open",
    name: "尾声 · 半年后",
    brief: "门没有关上的那条线。还是那家便利店。",
    isEpilogue: true,
    script: [
      { kind: "narr", text: "半年后。还是那家便利店,还是十一点半。" },
      { kind: "line", speaker: "amo", text: "溏心蛋,要两个吗?" },
      { kind: "narr", text: "她把丸子递给你——手,递到你手里。" },
      { kind: "narr", text: "不是推。" },
    ],
    goldenQuote: "不是推。",
    background: "/images/scenes/act2_konbini.png",
    aiGeneratedRef: "#016",
  },

  epilogue_weathered: {
    id: "epilogue_weathered",
    name: "尾声 · 半年后",
    brief: "风化的那条线。还是那家便利店,一个人。",
    isEpilogue: true,
    script: [
      {
        kind: "narr",
        text: "半年后。还是那家便利店,还是十一点半。你一个人。",
      },
      { kind: "narr", text: "店员问:'要加热吗?'" },
      { kind: "line", speaker: "chen", text: "要,谢谢。今天有点冷。" },
      {
        kind: "narr",
        text: "一句没有经过任何过滤的话。你说得很慢,但说完整了。",
      },
    ],
    goldenQuote: "你说得很慢,但说完整了。",
    background: "/images/scenes/act2_konbini.png",
    aiGeneratedRef: "#016",
  },
};

/** 主线流程(尾声由终幕结果动态选择,不在序列里) */
export const ACT_SEQUENCE: Scene[] = [
  SCENES.act1_aa,
  SCENES.act2_konbini,
  SCENES.act3_bbq,
  SCENES.act4_umbrella,
  SCENES.act5_end,
];

export function getScene(id: string): Scene | undefined {
  return SCENES[id];
}

export function nextScene(currentId: string): Scene | undefined {
  const idx = ACT_SEQUENCE.findIndex((s) => s.id === currentId);
  if (idx === -1 || idx >= ACT_SEQUENCE.length - 1) return undefined;
  return ACT_SEQUENCE[idx + 1];
}
