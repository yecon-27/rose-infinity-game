"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSoundscape } from "@/components/soundscape-provider";
import { AUDIO } from "@/lib/audio";
import { readChoiceLog, type ChoiceLogEntry } from "@/lib/choice-log";
import type { LetterMode } from "@/lib/letter";

interface LetterResponse {
  ok: boolean;
  text?: string;
  source?: "generated" | "fallback";
  choiceCount?: number;
  error?: string;
}

const LETTER_SOUND = { bgm: AUDIO.bgm.bloom, bgmVolume: 0.13 };

function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("信纸背景加载失败"));
    image.src = src;
  });
}

function wrapLetterText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r/g, "").split("\n");

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (!paragraph.trim()) {
      if (lines[lines.length - 1] !== "") lines.push("");
      return;
    }

    let line = "";
    for (const character of Array.from(paragraph.trim())) {
      const candidate = line + character;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    if (paragraphIndex < paragraphs.length - 1) lines.push("");
  });

  while (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

async function downloadLetterPng(text: string, mode: LetterMode) {
  const width = 1055;
  const baseHeight = 1491;
  const textWidth = 735;
  const fontSize = 30;
  const lineHeight = 52;
  const paragraphGap = 26;
  const fontFamily = '"Songti SC", "Noto Serif CJK SC", serif';
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = baseHeight;

  let context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法生成图片");
  await document.fonts.ready;
  context.font = `400 ${fontSize}px ${fontFamily}`;
  const lines = wrapLetterText(context, text, textWidth);
  const bodyHeight = lines.reduce(
    (height, line) => height + (line ? lineHeight : paragraphGap),
    0
  );
  canvas.height = Math.max(baseHeight, 350 + bodyHeight + 220);

  context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法生成图片");
  const background = await loadCanvasImage("/images/motifs/letter.png");
  context.drawImage(background, 0, 0, width, canvas.height);

  context.textAlign = "center";
  context.fillStyle = "#8b6f62";
  context.font = `500 18px ${fontFamily}`;
  context.fillText(
    mode === "reply" ? "给 那 年 的 你" : "这 一 局 的 回 声",
    width / 2,
    155
  );

  context.fillStyle = "#49373b";
  context.font = `600 48px ${fontFamily}`;
  context.fillText("玫瑰信笺", width / 2, 225);

  context.strokeStyle = "rgba(118, 87, 93, 0.32)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(175, 270);
  context.lineTo(width - 175, 270);
  context.stroke();

  context.textAlign = "left";
  context.fillStyle = "#4c3e40";
  context.font = `400 ${fontSize}px ${fontFamily}`;
  let y = 345;
  for (const line of lines) {
    if (line) {
      context.fillText(line, 160, y);
      y += lineHeight;
    } else {
      y += paragraphGap;
    }
  }

  context.textAlign = "center";
  context.fillStyle = "rgba(111, 96, 96, 0.68)";
  context.font = `500 16px ${fontFamily}`;
  context.fillText(
    "ROSE INFINITY  ·  玫 瑰 无 限",
    width / 2,
    canvas.height - 90
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("PNG 生成失败"));
    }, "image/png");
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rose-infinity-letter-${new Date()
    .toISOString()
    .slice(0, 10)}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function LetterPage() {
  const router = useRouter();
  const { playSfx, unlock } = useSoundscape(LETTER_SOUND);
  const [choices, setChoices] = useState<ChoiceLogEntry[]>([]);
  const [mode, setMode] = useState<LetterMode>("reply");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<LetterResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setChoices(readChoiceLog());
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    unlock();
    playSfx(AUDIO.sfx.softTap, 0.18);
    setLoading(true);
    setError("");
    setResult(null);
    setCopied(false);
    setSaveError("");

    try {
      const response = await fetch("/api/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: trimmed, choices }),
      });
      const data = (await response.json()) as LetterResponse;
      if (!response.ok || !data.ok || !data.text) {
        throw new Error(data.error || "信笺暂时没有写成，请稍后再试。");
      }
      setResult(data);
      playSfx(AUDIO.sfx.roseReveal, 0.32);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "信笺暂时没有写成，请稍后再试。"
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyLetter() {
    if (!result?.text || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      try {
        await navigator.clipboard.writeText(result.text);
      } catch {
        // 图片仍可生成；部分移动浏览器不开放剪贴板权限。
      }
      await downloadLetterPng(result.text, mode);
      setCopied(true);
      playSfx(AUDIO.sfx.softTap, 0.18);
    } catch (saveLetterError) {
      setCopied(false);
      setSaveError(
        saveLetterError instanceof Error
          ? saveLetterError.message
          : "信笺图片生成失败，请稍后再试。"
      );
    } finally {
      setSaving(false);
    }
  }

  function startAgain() {
    setResult(null);
    setError("");
    setCopied(false);
    setSaveError("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#382e31] px-5 py-10 text-[#f3ece4] sm:px-8">
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/motifs/rose-bloom.webp"
          alt=""
          fill
          priority
          className="object-cover scale-110"
          style={{ filter: "blur(30px) saturate(0.72)", opacity: 0.62 }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(96,68,68,0.24),rgba(24,21,23,0.78)_78%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#221b1e]/40 via-transparent to-[#1f2925]/55" />
      </div>

      <button
        type="button"
        onClick={() => router.back()}
        className="fixed left-5 top-5 z-30 px-3 py-2 text-[10px] tracking-[0.28em] text-white/45 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-white/70"
      >
        ← 返回
      </button>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full min-w-0 max-w-2xl items-center justify-center">
        <section className="relative w-full min-w-0 overflow-hidden border border-[#dfc7a1]/35 bg-[#efe2cc] px-6 py-9 text-[#43373a] shadow-[0_24px_80px_rgba(12,8,10,0.38)] sm:px-12 sm:py-12">
          <Image
            src="/images/motifs/letter.png"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 672px, calc(100vw - 40px)"
            className="z-0 object-cover"
          />
          <div className="absolute inset-0 z-[1] bg-[#fffaf2]/10" />

          <div className="relative z-10">
            <header className="mb-9 text-center">
            <p className="mb-3 text-[10px] tracking-[0.42em] text-[#8b6f62]">
              玫 瑰 彩 蛋
            </p>
            <h1 className="font-serif text-3xl tracking-[0.28em] text-[#49373b] sm:text-4xl">
              玫瑰信笺
            </h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#6f6060]">
              写下一句当年想说、却没能说完的话。信笺会沿着你这一局留下的选择，给你一封克制的回声。
            </p>
            </header>

            {!result ? (
            <form
              onSubmit={submit}
              aria-busy={loading}
              className="min-w-0 space-y-7"
            >
              <fieldset className="min-w-0">
                <legend className="mb-3 text-xs tracking-[0.2em] text-[#796568]">
                  想收到什么
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    aria-pressed={mode === "reply"}
                    onClick={() => setMode("reply")}
                    className={`border px-3 py-3 text-sm tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#76575d] ${
                      mode === "reply"
                        ? "border-[#76575d] bg-[#76575d] text-[#f5ecdf]"
                        : "border-[#9d8580]/45 text-[#725f61] hover:border-[#76575d]"
                    }`}
                  >
                    一封回信
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === "reflection"}
                    onClick={() => setMode("reflection")}
                    className={`border px-3 py-3 text-sm tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#76575d] ${
                      mode === "reflection"
                        ? "border-[#76575d] bg-[#76575d] text-[#f5ecdf]"
                        : "border-[#9d8580]/45 text-[#725f61] hover:border-[#76575d]"
                    }`}
                  >
                    关系复盘
                  </button>
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor="unsent-message"
                  className="mb-3 block text-xs tracking-[0.2em] text-[#796568]"
                >
                  那年没说出口的
                </label>
                <textarea
                  id="unsent-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={280}
                  rows={6}
                  autoFocus
                  placeholder="比如：其实那天我不是不想去，我只是也在等你先理解我。"
                  className="w-full min-w-0 resize-none border border-[#9d8580]/45 bg-[#fffaf2]/55 px-4 py-4 text-base leading-7 text-[#43373a] outline-none placeholder:text-[#8c7b78]/55 focus:border-[#76575d]"
                />
                <div className="mt-2 flex items-center justify-between gap-4 text-[10px] leading-5 text-[#887777]">
                  <span>
                    {choices.length > 0
                      ? `会参考你这一局的 ${choices.length} 次选择`
                      : "还没走完一局也可以写，只回应这句话"}
                  </span>
                  <span aria-label={`已输入 ${message.length} 个字`}>
                    {message.length} / 280
                  </span>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm leading-6 text-[#8f4148]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || message.trim().length === 0}
                className="w-full border border-[#76575d] bg-[#76575d] px-6 py-4 text-sm tracking-[0.35em] text-[#fff8ed] transition-colors hover:bg-[#60454b] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-[#76575d]"
              >
                {loading ? "信笺正在显影……" : "写 下 这 封 信"}
              </button>

              <p className="text-center text-[10px] leading-5 text-[#8a7877]">
                这是由游戏经历写成的虚构回声，不代表现实中的任何人。
              </p>
            </form>
            ) : (
            <article className="fade-in" aria-live="polite">
              <p className="mb-6 text-center text-[10px] tracking-[0.32em] text-[#8b6f62]">
                {mode === "reply" ? "给 那 年 的 你" : "这 一 局 的 回 声"}
              </p>
              <div className="whitespace-pre-line font-serif text-base leading-8 text-[#4c3e40] sm:text-lg sm:leading-9">
                {result.text}
              </div>
              {result.source === "fallback" && (
                <p className="mt-6 text-[10px] leading-5 text-[#907d79]">
                  这一次没连上远处的回声，先替你留下一封本地信笺。
                </p>
              )}
              {saveError && (
                <p role="alert" className="mt-6 text-sm leading-6 text-[#8f4148]">
                  {saveError}
                </p>
              )}
              <div className="mt-9 grid grid-cols-2 gap-3 border-t border-[#9d8580]/25 pt-7">
                <button
                  type="button"
                  onClick={startAgain}
                  className="border border-[#9d8580]/45 px-3 py-3 text-xs tracking-[0.16em] text-[#725f61] transition-colors hover:border-[#76575d] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#76575d]"
                >
                  再写一句
                </button>
                <button
                  type="button"
                  onClick={copyLetter}
                  disabled={saving}
                  className="border border-[#76575d] bg-[#76575d] px-3 py-3 text-xs tracking-[0.16em] text-[#fff8ed] transition-colors hover:bg-[#60454b] disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#76575d]"
                >
                  {saving
                    ? "正在装裱……"
                    : copied
                    ? "已保存为 PNG"
                    : "抄下这封信"}
                </button>
              </div>
            </article>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
