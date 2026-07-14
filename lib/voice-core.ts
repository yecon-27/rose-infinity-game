/**
 * 配音 · 共享核心（生成脚本与客户端共用，保持两边哈希一致）
 *
 * 台词文本 → 稳定哈希 → public/audio/<hash>.mp3
 * 离线批量生成见 scripts/gen-voice.mts（腾讯云 TTS）。
 */

export type VoiceSpeaker = "vera" | "sean" | "narr";

/**
 * 腾讯云 TTS 音色（想换音色改这里，然后重跑 pnpm gen:voice）
 *  - narr 101009 智芸 · 知性女声（旁白，静）
 *  - vera 101001 智瑜 · 情感女声
 *  - sean 101018 智靖 · 情感男声
 */
export const VOICE_TYPES: Record<VoiceSpeaker, number> = {
  narr: 101009,
  vera: 101001,
  sean: 101018,
};

/** 配音只读说出口的部分：去掉舞台指示（…）与引号 */
export function normalizeForVoice(text: string): string {
  return text
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[“”"「」]/g, "")
    .trim();
}

/** FNV-1a 32 位跑两遍（原文 + 反转文）拼 16 位十六进制，无依赖、node/浏览器同构 */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function voiceHash(who: VoiceSpeaker, text: string): string {
  const key = `${VOICE_TYPES[who]}|${normalizeForVoice(text)}`;
  const a = fnv1a(key).toString(16).padStart(8, "0");
  const b = fnv1a(key.split("").reverse().join(""))
    .toString(16)
    .padStart(8, "0");
  return a + b;
}
