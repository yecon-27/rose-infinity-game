#!/usr/bin/env node
/**
 * Rose Infinity procedural soundtrack generator.
 *
 * Generates original, sample-free music and sound effects as PCM WAV, then
 * converts them to Ogg/Opus with ffmpeg. No third-party audio assets
 * are used. Re-running with the same seed produces the same files.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "audio");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "rose-audio-"));
// Opus uses 48 kHz internally, so generate at its native rate.
const SR = 48_000;
const TAU = Math.PI * 2;

let seed = 0x524f5345;
function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0x1_0000_0000;
}

function midi(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function makeBuffer(seconds) {
  const n = Math.round(seconds * SR);
  return { left: new Float32Array(n), right: new Float32Array(n), seconds };
}

function panGains(pan = 0) {
  const angle = ((pan + 1) * Math.PI) / 4;
  return [Math.cos(angle), Math.sin(angle)];
}

function addWrapped(buffer, start, duration, fn, pan = 0, gain = 1) {
  const { left, right } = buffer;
  const n = left.length;
  const count = Math.max(1, Math.round(duration * SR));
  const startSample = Math.round(start * SR);
  const [gl, gr] = panGains(pan);
  for (let j = 0; j < count; j++) {
    const age = j / SR;
    const value = fn(age, duration) * gain;
    const i = (startSample + j) % n;
    left[i] += value * gl;
    right[i] += value * gr;
  }
}

function addPiano(buffer, note, start, gain = 0.1, pan = 0, duration = 2.5) {
  const f = midi(note);
  const phase = random() * TAU;
  addWrapped(
    buffer,
    start,
    duration,
    (t, d) => {
      const attack = Math.min(1, t / 0.008);
      const release = Math.max(0, 1 - t / d) ** 1.4;
      const body = Math.exp(-2.25 * t) * release * attack;
      return body * (
        Math.sin(TAU * f * t + phase) +
        0.36 * Math.exp(-1.2 * t) * Math.sin(TAU * f * 2.002 * t + 0.3) +
        0.12 * Math.exp(-2.1 * t) * Math.sin(TAU * f * 3.01 * t + 1.1)
      );
    },
    pan,
    gain,
  );
}

function addPluck(buffer, note, start, gain = 0.06, pan = 0, duration = 0.9) {
  const f = midi(note);
  addWrapped(
    buffer,
    start,
    duration,
    (t) => {
      const env = Math.min(1, t / 0.004) * Math.exp(-7.5 * t);
      return env * (
        Math.sin(TAU * f * t) +
        0.35 * Math.sin(TAU * f * 2.01 * t + 0.2) +
        0.1 * Math.sin(TAU * f * 4.03 * t)
      );
    },
    pan,
    gain,
  );
}

function addPad(buffer, notes, start, duration, gain = 0.04) {
  notes.forEach((note, idx) => {
    const f = midi(note);
    const detune = 1 + (idx - (notes.length - 1) / 2) * 0.0009;
    const pan = notes.length === 1 ? 0 : -0.58 + (idx / (notes.length - 1)) * 1.16;
    const phase = random() * TAU;
    addWrapped(
      buffer,
      start,
      duration,
      (t, d) => {
        const attack = Math.min(1, t / 0.9);
        const release = Math.min(1, Math.max(0, d - t) / 1.05);
        const breathe = 0.9 + 0.1 * Math.sin(TAU * 0.083 * t + phase);
        return attack * release * breathe * (
          Math.sin(TAU * f * detune * t + phase) +
          0.19 * Math.sin(TAU * f * 2 * detune * t + phase * 0.4)
        );
      },
      pan,
      gain,
    );
  });
}

function addPulse(buffer, note, start, gain = 0.04, duration = 0.42, pan = 0) {
  const f = midi(note);
  addWrapped(
    buffer,
    start,
    duration,
    (t) => {
      const env = Math.min(1, t / 0.025) * Math.exp(-8 * t);
      return env * (Math.sin(TAU * f * t) + 0.16 * Math.sin(TAU * f * 2 * t));
    },
    pan,
    gain,
  );
}

function addSoftTick(buffer, start, gain = 0.018, pan = 0) {
  let lp = 0;
  addWrapped(
    buffer,
    start,
    0.095,
    (t) => {
      lp += ((random() * 2 - 1) - lp) * 0.18;
      return lp * Math.exp(-42 * t);
    },
    pan,
    gain,
  );
}

function addRoseMotif(buffer, start, beat, gain, resolved = false) {
  const notes = resolved ? [66, 69, 67, 64, 62] : [66, 69, 67, 64];
  notes.forEach((note, i) => {
    addPiano(buffer, note, start + i * beat * 0.72, gain, -0.25 + i * 0.15, 2.7);
  });
}

function gentleMaster(buffer, target = 0.86) {
  let peak = 0;
  for (let i = 0; i < buffer.left.length; i++) {
    buffer.left[i] = Math.tanh(buffer.left[i] * 1.08);
    buffer.right[i] = Math.tanh(buffer.right[i] * 1.08);
    peak = Math.max(peak, Math.abs(buffer.left[i]), Math.abs(buffer.right[i]));
  }
  const scale = peak > 0 ? target / peak : 1;
  for (let i = 0; i < buffer.left.length; i++) {
    buffer.left[i] *= scale;
    buffer.right[i] *= scale;
  }
}

function buildMusic({ bpm, bars, chords, mode }) {
  const beat = 60 / bpm;
  const bar = beat * 4;
  const buffer = makeBuffer(bar * bars);

  for (let b = 0; b < bars; b += 2) {
    const chord = chords[(b / 2) % chords.length];
    const padGain = mode === "cold" ? 0.026 : mode === "sparse" ? 0.023 : 0.031;
    addPad(buffer, chord.pad, b * bar, bar * 2, padGain);
  }

  if (mode === "rosebud") {
    for (let b = 0; b < bars; b += 4) addRoseMotif(buffer, b * bar + beat * 0.45, beat, 0.085);
    for (let b = 2; b < bars; b += 4) {
      const chord = chords[(b / 2) % chords.length];
      addPiano(buffer, chord.piano[0], b * bar + beat * 0.5, 0.055, -0.35);
      addPiano(buffer, chord.piano[1], b * bar + beat * 2.2, 0.045, 0.3);
    }
  }

  if (mode === "warm") {
    for (let b = 0; b < bars; b++) {
      const chord = chords[Math.floor(b / 2) % chords.length];
      for (let e = 0; e < 8; e++) {
        const note = chord.pluck[e % chord.pluck.length] + (e === 7 ? 12 : 0);
        addPluck(buffer, note, b * bar + e * beat * 0.5, 0.037, e % 2 ? 0.35 : -0.35);
        if (e % 2 === 1) addSoftTick(buffer, b * bar + e * beat * 0.5, 0.011, e % 4 ? 0.25 : -0.25);
      }
    }
    for (let b = 0; b < bars; b += 4) addRoseMotif(buffer, b * bar + beat, beat, 0.061);
  }

  if (mode === "cold") {
    for (let b = 0; b < bars; b++) {
      const root = chords[Math.floor(b / 2) % chords.length].piano[0] - 12;
      addPulse(buffer, root, b * bar, 0.053, 0.62, -0.08);
      addPulse(buffer, root, b * bar + beat * 2.5, 0.027, 0.46, 0.08);
      if (b % 4 === 2) addPiano(buffer, root + 24, b * bar + beat * 1.25, 0.048, 0.25, 3.5);
    }
  }

  if (mode === "sparse") {
    const sparseNotes = [64, 67, 66, 62, 59, 62, 61, 57];
    sparseNotes.forEach((note, i) => {
      const b = i * 2;
      if (b < bars) addPiano(buffer, note, b * bar + beat * (i % 2 ? 2.15 : 0.7), 0.087, i % 2 ? 0.2 : -0.2, 4.4);
    });
  }

  if (mode === "bloom") {
    for (let b = 0; b < bars; b++) {
      const chord = chords[Math.floor(b / 2) % chords.length];
      [0, 2.5].forEach((offset, i) => {
        addPluck(buffer, chord.pluck[(b + i) % chord.pluck.length], b * bar + offset * beat, 0.027, i ? 0.32 : -0.32, 1.1);
      });
    }
    for (let b = 0; b < bars; b += 4) addRoseMotif(buffer, b * bar + beat * 0.4, beat, 0.079, b === bars - 4);
  }

  // Leave roughly 6 dB of headroom so the soundtrack sits under dialogue
  // without requiring every page to compensate for a hot master.
  gentleMaster(buffer, 0.41);
  return buffer;
}

function makePeriodicNoise(seconds, voices = 80) {
  const buffer = makeBuffer(seconds);
  for (let v = 0; v < voices; v++) {
    const cycles = 20 + Math.floor(random() * seconds * 220);
    const f = cycles / seconds;
    const phase = random() * TAU;
    const amp = 1 / Math.sqrt(Math.max(1, f));
    const pan = random() * 2 - 1;
    const [gl, gr] = panGains(pan);
    for (let i = 0; i < buffer.left.length; i++) {
      const s = Math.sin(TAU * f * (i / SR) + phase) * amp;
      buffer.left[i] += s * gl;
      buffer.right[i] += s * gr;
    }
  }
  return buffer;
}

function buildAmbience(kind, seconds = 24) {
  const buffer = makePeriodicNoise(seconds, kind === "rain" ? 150 : 70);
  const n = buffer.left.length;
  let lpL = 0;
  let lpR = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const rawL = buffer.left[i];
    const rawR = buffer.right[i];
    const amount = kind === "wind" ? 0.002 : kind === "store" ? 0.014 : 0.035;
    lpL += (rawL - lpL) * amount;
    lpR += (rawR - lpR) * amount;
    let l = kind === "rain" ? rawL * 0.027 + lpL * 0.025 : lpL * 0.06;
    let r = kind === "rain" ? rawR * 0.027 + lpR * 0.025 : lpR * 0.06;
    if (kind === "store") {
      const hum = Math.sin(TAU * 50 * t) * 0.012 + Math.sin(TAU * 100 * t) * 0.004;
      l += hum;
      r += hum * 0.92;
    }
    if (kind === "room") {
      const fan = Math.sin(TAU * 84 * t) * 0.005 + Math.sin(TAU * 168 * t) * 0.0015;
      l += fan;
      r += fan;
    }
    buffer.left[i] = l;
    buffer.right[i] = r;
  }
  gentleMaster(buffer, kind === "rain" ? 0.48 : 0.32);
  return buffer;
}

function buildSfx(kind) {
  const lengths = { rose: 1.45, vibrate: 0.58, lock: 0.32, door: 1.2, rustle: 0.9, tap: 0.18 };
  const buffer = makeBuffer(lengths[kind]);
  const { left, right } = buffer;

  if (kind === "rose") {
    [[74, 0], [78, 0.16], [81, 0.35]].forEach(([note, start], i) => {
      const f = midi(note);
      addWrapped(buffer, start, 1.05, (t) => Math.exp(-3.5 * t) * Math.sin(TAU * f * t), -0.35 + i * 0.35, 0.14);
    });
  } else if (kind === "vibrate") {
    for (let i = 0; i < left.length; i++) {
      const t = i / SR;
      const gate = (t < 0.2 || (t > 0.31 && t < 0.54)) ? Math.sin(Math.PI * ((t * 5) % 1)) ** 2 : 0;
      const s = gate * (Math.sin(TAU * 142 * t) + 0.3 * Math.sin(TAU * 284 * t)) * 0.16;
      left[i] = s * 0.95;
      right[i] = s;
    }
  } else if (kind === "lock" || kind === "tap") {
    const f = kind === "lock" ? 1_450 : 920;
    for (let i = 0; i < left.length; i++) {
      const t = i / SR;
      const s = Math.exp(-(kind === "lock" ? 28 : 48) * t) * (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 2.3 * t)) * 0.13;
      left[i] = s;
      right[i] = s * 0.94;
    }
  } else if (kind === "door") {
    [[76, 0], [71, 0.28]].forEach(([note, start], i) => {
      const f = midi(note);
      addWrapped(buffer, start, 0.9, (t) => Math.exp(-3.1 * t) * (Math.sin(TAU * f * t) + 0.2 * Math.sin(TAU * f * 2 * t)), i ? 0.2 : -0.2, 0.12);
    });
  } else if (kind === "rustle") {
    let lp = 0;
    for (let i = 0; i < left.length; i++) {
      const t = i / SR;
      lp += ((random() * 2 - 1) - lp) * 0.22;
      const movement = Math.sin(Math.PI * Math.min(1, t / buffer.seconds)) ** 2 * (0.45 + 0.55 * Math.sin(TAU * 5.3 * t) ** 2);
      left[i] = lp * movement * 0.13;
      right[i] = lp * movement * 0.11;
    }
  }

  gentleMaster(buffer, kind === "vibrate" ? 0.46 : 0.62);
  return buffer;
}

function writeWav(filename, buffer) {
  const n = buffer.left.length;
  const out = Buffer.allocUnsafe(44 + n * 4);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + n * 4, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 4, 28);
  out.writeUInt16LE(4, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, buffer.left[i]));
    const r = Math.max(-1, Math.min(1, buffer.right[i]));
    out.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    out.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
  }
  fs.writeFileSync(filename, out);
}

function encode(relativePath, buffer, bitrate = 96_000) {
  const target = path.join(OUT, relativePath);
  const wav = path.join(TMP, relativePath.replaceAll("/", "-").replace(/\.ogg$/, ".wav"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  writeWav(wav, buffer);
  execFileSync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-i", wav,
    "-c:a", "libopus",
    "-b:a", String(bitrate),
    "-vbr", "on",
    "-fflags", "+bitexact",
    "-flags:a", "+bitexact",
    "-map_metadata", "-1",
    "-serial_offset", "0",
    target,
  ]);
  console.log(`${relativePath}  ${(fs.statSync(target).size / 1024).toFixed(0)} KiB  ${buffer.seconds.toFixed(1)}s`);
}

const CHORDS_WARM = [
  { pad: [50, 57, 61, 64], piano: [50, 61], pluck: [62, 66, 69, 64] },
  { pad: [47, 54, 57, 62], piano: [47, 57], pluck: [59, 62, 66, 69] },
  { pad: [43, 50, 54, 57], piano: [43, 54], pluck: [55, 59, 62, 66] },
  { pad: [45, 52, 57, 62], piano: [45, 57], pluck: [57, 62, 64, 69] },
];

const CHORDS_COLD = [
  { pad: [47, 54, 59, 62], piano: [47, 59], pluck: [59, 62, 66] },
  { pad: [43, 50, 55, 59], piano: [43, 55], pluck: [55, 59, 62] },
  { pad: [45, 52, 57, 61], piano: [45, 57], pluck: [57, 61, 64] },
  { pad: [42, 49, 54, 57], piano: [42, 54], pluck: [54, 57, 61] },
];

const jobs = [
  ["bgm/m01-rosebud.ogg", () => buildMusic({ bpm: 68, bars: 16, chords: CHORDS_WARM, mode: "rosebud" }), 112_000],
  ["bgm/m02-side-by-side.ogg", () => buildMusic({ bpm: 76, bars: 16, chords: CHORDS_WARM, mode: "warm" }), 112_000],
  ["bgm/m03-blue-light.ogg", () => buildMusic({ bpm: 60, bars: 16, chords: CHORDS_COLD, mode: "cold" }), 104_000],
  ["bgm/m04-half-step.ogg", () => buildMusic({ bpm: 52, bars: 12, chords: CHORDS_COLD, mode: "sparse" }), 104_000],
  ["bgm/m05-bloom.ogg", () => buildMusic({ bpm: 72, bars: 16, chords: CHORDS_WARM, mode: "bloom" }), 112_000],
  ["ambience/hackathon-room.ogg", () => buildAmbience("room"), 72_000],
  ["ambience/campus-wind.ogg", () => buildAmbience("wind"), 72_000],
  ["ambience/dorm-rain.ogg", () => buildAmbience("rain"), 80_000],
  ["ambience/konbini-hum.ogg", () => buildAmbience("store"), 72_000],
  ["sfx/rose-reveal.ogg", () => buildSfx("rose"), 64_000],
  ["sfx/phone-vibrate-soft.ogg", () => buildSfx("vibrate"), 64_000],
  ["sfx/phone-lock.ogg", () => buildSfx("lock"), 64_000],
  ["sfx/konbini-door.ogg", () => buildSfx("door"), 64_000],
  ["sfx/bag-rustle.ogg", () => buildSfx("rustle"), 64_000],
  ["sfx/ui-soft-tap.ogg", () => buildSfx("tap"), 64_000],
];

try {
  console.log("Rose Infinity — generating original soundtrack\n");
  for (const [file, build, bitrate] of jobs) encode(file, build(), bitrate);
  const manifest = {
    generatedAt: new Date().toISOString(),
    generator: "scripts/gen-audio-assets.mjs",
    source: "Original procedural synthesis; no third-party samples",
    bgm: jobs.filter(([p]) => p.startsWith("bgm/")).map(([p]) => `/audio/${p}`),
    ambience: jobs.filter(([p]) => p.startsWith("ambience/")).map(([p]) => `/audio/${p}`),
    sfx: jobs.filter(([p]) => p.startsWith("sfx/")).map(([p]) => `/audio/${p}`),
  };
  fs.writeFileSync(path.join(OUT, "soundtrack.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("\nDone. Manifest: public/audio/soundtrack.json");
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
