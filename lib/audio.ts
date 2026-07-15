export const AUDIO = {
  bgm: {
    rosebud: "/audio/bgm/m01-rosebud.ogg",
    together: "/audio/bgm/m02-side-by-side.ogg",
    blueLight: "/audio/bgm/m03-blue-light.ogg",
    halfStep: "/audio/bgm/m04-half-step.ogg",
    bloom: "/audio/bgm/m05-bloom.ogg",
  },
  ambience: {
    campus: "/audio/ambience/campus-wind.ogg",
    konbini: "/audio/ambience/konbini-hum.ogg",
  },
  sfx: {
    roseReveal: "/audio/sfx/rose-reveal.ogg",
    phoneVibrate: "/audio/sfx/phone-vibrate-soft.ogg",
    phoneLock: "/audio/sfx/phone-lock.ogg",
    konbiniDoor: "/audio/sfx/konbini-door.ogg",
    softTap: "/audio/sfx/ui-soft-tap.ogg",
  },
} as const;

export interface SoundscapeConfig {
  bgm?: string;
  ambience?: string;
  bgmVolume?: number;
  ambienceVolume?: number;
}

const SCENE_SOUNDS: Record<string, SoundscapeConfig> = {
  warm_hackathon: { bgm: AUDIO.bgm.together },
  warm_shopping: { bgm: AUDIO.bgm.together },
  warm_nvc: { bgm: AUDIO.bgm.rosebud, ambience: AUDIO.ambience.campus },
  burst_phone: { bgm: AUDIO.bgm.blueLight },
  cold_fever: { bgm: AUDIO.bgm.halfStep },
  end_breakup: { bgm: AUDIO.bgm.halfStep, ambience: AUDIO.ambience.campus },
  after_konbini: { bgm: AUDIO.bgm.bloom, ambience: AUDIO.ambience.konbini },
};

export function soundscapeForScene(
  sceneId: string,
  memory = false,
): SoundscapeConfig {
  const base = SCENE_SOUNDS[sceneId] ?? { bgm: AUDIO.bgm.rosebud };
  return {
    ...base,
    bgmVolume: memory ? 0.11 : 0.18,
    ambienceVolume: memory ? 0.035 : 0.065,
  };
}
