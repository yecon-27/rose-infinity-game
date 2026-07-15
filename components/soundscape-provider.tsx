"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SoundscapeConfig } from "@/lib/audio";

interface SoundscapeControls {
  muted: boolean;
  toggleMuted: () => void;
  unlock: () => void;
  setSoundscape: (config: SoundscapeConfig) => void;
  playSfx: (src: string, volume?: number) => void;
}

interface TrackSlot {
  audio: HTMLAudioElement | null;
  src?: string;
  volume: number;
}

const SoundscapeContext = createContext<SoundscapeControls | null>(null);
const MUTE_KEY = "rose:sound-muted";

export function SoundscapeProvider({ children }: PropsWithChildren) {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const unlockedRef = useRef(false);
  const bgmRef = useRef<TrackSlot>({ audio: null, volume: 0.18 });
  const ambienceRef = useRef<TrackSlot>({ audio: null, volume: 0.065 });
  const fadesRef = useRef(new Map<HTMLAudioElement, number>());
  const sfxRef = useRef(new Set<HTMLAudioElement>());

  const fade = useCallback(
    (audio: HTMLAudioElement, target: number, duration = 850, done?: () => void) => {
      const previous = fadesRef.current.get(audio);
      if (previous) cancelAnimationFrame(previous);
      const from = audio.volume;
      const started = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        const eased = 1 - (1 - progress) ** 3;
        audio.volume = Math.max(0, Math.min(1, from + (target - from) * eased));
        if (progress < 1) {
          fadesRef.current.set(audio, requestAnimationFrame(step));
        } else {
          fadesRef.current.delete(audio);
          done?.();
        }
      };
      fadesRef.current.set(audio, requestAnimationFrame(step));
    },
    [],
  );

  const replaceTrack = useCallback(
    (slot: TrackSlot, src: string | undefined, volume: number) => {
      slot.volume = volume;
      if (slot.src === src) {
        if (slot.audio) fade(slot.audio, mutedRef.current ? 0 : volume, 450);
        return;
      }

      const previous = slot.audio;
      if (previous) {
        fade(previous, 0, 700, () => {
          previous.pause();
          previous.removeAttribute("src");
        });
      }

      slot.src = src;
      slot.audio = null;
      if (!src) return;

      const next = new Audio(src);
      next.loop = true;
      next.preload = "auto";
      next.volume = 0;
      slot.audio = next;
      if (unlockedRef.current && !mutedRef.current) {
        void next.play().then(() => fade(next, volume)).catch(() => {});
      }
    },
    [fade],
  );

  const setSoundscape = useCallback(
    (config: SoundscapeConfig) => {
      replaceTrack(bgmRef.current, config.bgm, config.bgmVolume ?? 0.18);
      replaceTrack(
        ambienceRef.current,
        config.ambience,
        config.ambienceVolume ?? 0.065,
      );
    },
    [replaceTrack],
  );

  const unlock = useCallback(() => {
    unlockedRef.current = true;
    if (mutedRef.current) return;
    for (const slot of [bgmRef.current, ambienceRef.current]) {
      if (!slot.audio) continue;
      void slot.audio.play().then(() => fade(slot.audio!, slot.volume)).catch(() => {});
    }
  }, [fade]);

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      mutedRef.current = next;
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      for (const slot of [bgmRef.current, ambienceRef.current]) {
        if (!slot.audio) continue;
        if (!next && unlockedRef.current) void slot.audio.play().catch(() => {});
        fade(slot.audio, next ? 0 : slot.volume, 420);
      }
      if (next) {
        for (const sound of sfxRef.current) sound.pause();
        sfxRef.current.clear();
      }
      return next;
    });
  }, [fade]);

  const playSfx = useCallback((src: string, volume = 0.3) => {
    if (mutedRef.current) return;
    unlockedRef.current = true;
    const sound = new Audio(src);
    sound.volume = Math.max(0, Math.min(1, volume));
    sfxRef.current.add(sound);
    const dispose = () => sfxRef.current.delete(sound);
    sound.addEventListener("ended", dispose, { once: true });
    sound.addEventListener("error", dispose, { once: true });
    void sound.play().catch(dispose);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(MUTE_KEY) === "1";
    mutedRef.current = stored;
    setMuted(stored);

    const onFirstGesture = () => unlock();
    window.addEventListener("pointerdown", onFirstGesture, { capture: true, once: true });
    window.addEventListener("keydown", onFirstGesture, { capture: true, once: true });

    const onVisibility = () => {
      for (const slot of [bgmRef.current, ambienceRef.current]) {
        if (!slot.audio) continue;
        if (document.hidden) slot.audio.pause();
        else if (unlockedRef.current && !mutedRef.current) void slot.audio.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture, true);
      window.removeEventListener("keydown", onFirstGesture, true);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const frame of fadesRef.current.values()) cancelAnimationFrame(frame);
      for (const slot of [bgmRef.current, ambienceRef.current]) slot.audio?.pause();
      for (const sound of sfxRef.current) sound.pause();
    };
  }, [unlock]);

  const controls = useMemo<SoundscapeControls>(
    () => ({ muted, toggleMuted, unlock, setSoundscape, playSfx }),
    [muted, playSfx, setSoundscape, toggleMuted, unlock],
  );

  return (
    <SoundscapeContext.Provider value={controls}>
      {children}
      <button
        type="button"
        onClick={toggleMuted}
        aria-label={muted ? "开启音乐和音效" : "关闭音乐和音效"}
        className="fixed left-5 top-5 z-[100] text-[10px] tracking-widest text-white/35 transition-colors hover:text-white/80 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-white/70"
      >
        {muted ? "音 · 关" : "音 · 开"}
      </button>
    </SoundscapeContext.Provider>
  );
}

export function useSoundscape(config?: SoundscapeConfig) {
  const controls = useContext(SoundscapeContext);
  if (!controls) throw new Error("useSoundscape must be used inside SoundscapeProvider");

  const { setSoundscape } = controls;
  const bgm = config?.bgm;
  const ambience = config?.ambience;
  const bgmVolume = config?.bgmVolume;
  const ambienceVolume = config?.ambienceVolume;
  const enabled = config !== undefined;

  useEffect(() => {
    if (!enabled) return;
    setSoundscape({ bgm, ambience, bgmVolume, ambienceVolume });
    return () => setSoundscape({});
  }, [ambience, ambienceVolume, bgm, bgmVolume, enabled, setSoundscape]);

  return controls;
}
