"use client";

/**
 * 配音 · 客户端播放 hook
 * 按 (说话人, 台词) 查 public/audio/manifest.json，命中则播放对应 mp3。
 * - 新句自动停掉上一句；支持传数组按顺序连播（回看的多行 response）。
 * - 静音开关持久化在 localStorage；没生成音频时整体静默降级，不报错。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceSpeaker, voiceHash } from "./voice-core";

let manifestPromise: Promise<Record<string, 1>> | null = null;
function loadManifest(): Promise<Record<string, 1>> {
  if (!manifestPromise) {
    manifestPromise = fetch("/audio/manifest.json")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return manifestPromise;
}

const MUTE_KEY = "rose:voice-muted";

export function useVoice() {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const m = localStorage.getItem(MUTE_KEY) === "1";
    setMuted(m);
    mutedRef.current = m;
  }, []);

  const stop = useCallback(() => {
    seqRef.current++;
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  const play = useCallback(
    async (who: VoiceSpeaker, texts: string | string[]) => {
      stop();
      if (mutedRef.current) return;
      const mySeq = seqRef.current;
      const manifest = await loadManifest();
      const srcs = (Array.isArray(texts) ? texts : [texts])
        .map((t) => voiceHash(who, t))
        .filter((h) => manifest[h])
        .map((h) => `/audio/${h}.mp3`);
      if (!srcs.length || seqRef.current !== mySeq) return;

      let i = 0;
      const next = () => {
        if (seqRef.current !== mySeq || i >= srcs.length) return;
        const audio = new Audio(srcs[i++]);
        audioRef.current = audio;
        audio.onended = next;
        // 浏览器自动播放策略可能在首次交互前拒绝，静默忽略
        audio.play().catch(() => {});
      };
      next();
    },
    [stop]
  );

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const v = !m;
      mutedRef.current = v;
      localStorage.setItem(MUTE_KEY, v ? "1" : "0");
      if (v) stop();
      return v;
    });
  }, [stop]);

  /* 卸载时停声 */
  useEffect(() => stop, [stop]);

  return { muted, toggleMuted, play, stop };
}
