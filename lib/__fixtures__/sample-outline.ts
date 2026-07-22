/**
 * mock fixture · 一份典型 StoryOutline
 *
 * 让 Agent B(情节)、Agent D(咨询)、前端不等 Agent A 上线就能开工。
 * 取材自游戏里"异地发烧那晚"的原型，已典型化，只用作开发假数据。
 */

import type { StoryOutline } from "@/lib/generated-story";

export const SAMPLE_OUTLINE: StoryOutline = {
  people: [
    { role: "self", gender: "f" },
    { role: "other", gender: "m" },
  ],
  arc: [
    { phase: "warm", label: "刚在一起，什么都想分给对方" },
    { phase: "warm", label: "各自忙起来，靠消息维持" },
    { phase: "strained", label: "话越来越短，谁都不肯先服软" },
  ],
  conflicts: [
    {
      id: "fever-night",
      situation: "他异地发烧，她在便利店上夜班",
      selfMove: "给他叫了一份热粥送过去",
      otherMove: "收下了，只回了句嗯谢谢",
      missedReach: "他其实想她过来陪一下，没说；她以为叫了粥就是照顾到了",
      phase: "strained",
    },
    {
      id: "late-reply",
      situation: "他发消息问周末回不回，她在忙没顾上",
      selfMove: "过了一天才回，回得很短",
      otherMove: "没再追问，改口说随便",
      missedReach: "她那天很想回去，只是先把班顶完；他把那句随便当成了不在意",
      phase: "strained",
    },
  ],
  patterns: [
    "她习惯用做事代替说话，觉得做到了就是在意",
    "他习惯等对方先懂，不肯把想要的直接讲出来",
  ],
  breachType: "unspoken-care",
  keyLines: [
    "我给你叫了粥，记得趁热吃",
    "嗯，谢谢",
    "随便吧，你忙你的",
  ],
};
