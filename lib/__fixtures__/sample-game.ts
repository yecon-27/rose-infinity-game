/**
 * mock fixture · 一份最小可玩 GeneratedGame
 *
 * 让 Agent C(音画)、前端不等 Agent B 上线就能开工，也是 Agent B 的"输出长这样"参照。
 * 只含一幕 + 一段回看，字段全部对齐 story.ts 的 Scene / Lookback 接口。
 */

import type { Scene, Lookback } from "@/lib/story";
import type { GeneratedGame } from "@/lib/generated-story";

const FEVER_SCENE: Scene = {
  id: "gen-fever-night",
  title: "热粥",
  phase: "strained",
  bg: "/bg/konbini-night.webp",
  brief: "他异地发烧，她在便利店上夜班。她想照顾他，能做到的只有叫一份粥。",
  pov: "vera",
  onDone: "/look?id=gen-fever-night",
  script: [
    { kind: "narr", text: "凌晨一点，货架灯亮得发白。手机震了一下，是他。" },
    { kind: "line", who: "sean", text: "有点发烧，头晕。", face: "tired" },
    {
      kind: "beat",
      prompt: "你想说点什么。手边只有这家店。",
      situation: "她在上夜班，走不开；他一个人在异地宿舍。",
      choices: [
        {
          text: "给他叫一份热粥送过去",
          gesture: "hold",
          reach: true,
          say: "我给你叫了粥，记得趁热吃。",
          reply: [{ who: "sean", text: "嗯，谢谢。", face: "tired" }],
          after: [{ who: "narr", text: "她松了口气，觉得自己照顾到了。" }],
          direction: "他其实想她过来，只回了三个字。",
        },
        {
          text: "先问他要不要她过去",
          gesture: "swipe",
          reach: true,
          say: "要不我下了班过去看你？",
          reply: [{ who: "sean", text: "不用，你忙。", face: "tired" }],
          after: [{ who: "narr", text: "他嘴上说不用，心里数着她会不会真的来。" }],
          direction: "两个人都在等对方把话说满。",
        },
      ],
    },
  ],
};

const FEVER_LOOKBACK: Lookback = {
  id: "gen-fever-night",
  title: "热粥",
  intro: ["回到那一晚。", "这次不急着推进，找找当年没看见的地方。"],
  moments: [
    {
      bg: "/bg/konbini-night.webp",
      surface: "他收下粥，回了句嗯谢谢，就没再说话。",
      hidden: "其实我不想要粥。我想你来，哪怕站十分钟。",
      who: "sean",
    },
  ],
  reachback: {
    prompt: "如果能回到那一刻，你想补一句什么？",
    choice: "打个电话，告诉他下了班就过去，几点到",
    response: ["他愣了一下。", "好，我等你。"],
  },
  outro: ["有些照顾，得说出口才接得住。"],
};

export const SAMPLE_GAME: GeneratedGame = {
  scenes: [FEVER_SCENE],
  lookbacks: [FEVER_LOOKBACK],
  entrySceneId: "gen-fever-night",
};
