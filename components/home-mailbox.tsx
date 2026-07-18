"use client";

import { useEffect, useState } from "react";
import type { ArchivedLetter } from "@/lib/letter-archive";

function formatLetterDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "没有写下日期";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function HomeMailbox({
  letters,
  onClose,
  onDelete,
}: {
  letters: ArchivedLetter[];
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(letters[0]?.id ?? "");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const selected =
    letters.find((letter) => letter.id === selectedId) ?? letters[0];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (pendingDeleteId) setPendingDeleteId("");
      else onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pendingDeleteId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#100c0e]/80 px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mailbox-title"
      onClick={onClose}
    >
      <section
        className="relative grid max-h-[86vh] w-full max-w-4xl overflow-hidden border border-[#c4a882]/35 bg-[#1b1718]/95 shadow-[0_28px_90px_rgba(0,0,0,.55)] sm:grid-cols-[240px_minmax(0,1fr)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-[#c4a882]/20 px-6 py-5 sm:col-span-2 sm:flex sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] tracking-[0.38em] text-[#c4a882]/55">
              LETTERS KEPT HERE
            </p>
            <h2
              id="mailbox-title"
              className="mt-2 font-serif text-2xl tracking-[0.28em] text-[#f0e5d8]"
            >
              玫瑰信箱
            </h2>
          </div>
          <p className="mt-2 text-[10px] tracking-[0.14em] text-white/35 sm:mt-0">
            {letters.length > 0 ? `留下了 ${letters.length} 封` : "还没有来信"}
          </p>
        </header>

        {letters.length === 0 ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center px-8 text-center sm:col-span-2">
            <svg
              aria-hidden="true"
              viewBox="0 0 48 48"
              fill="none"
              className="h-12 w-12 text-[#c4a882]/45"
            >
              <path d="M8 18h32v22H8z" stroke="currentColor" />
              <path d="m9 20 13 11a3 3 0 0 0 4 0l13-11" stroke="currentColor" />
              <path d="M15 13h18" stroke="currentColor" strokeLinecap="round" />
            </svg>
            <p className="mt-6 font-serif text-base tracking-[0.15em] text-white/65">
              第一封信还在路上
            </p>
            <p className="mt-3 text-[10px] leading-5 tracking-[0.08em] text-white/30">
              从首页打开玫瑰信笺，写下自己的故事。
              <br />
              收到的回信会留在这里。
            </p>
          </div>
        ) : (
          <>
            <nav
              aria-label="信件列表"
              className="max-h-44 overflow-y-auto border-b border-[#c4a882]/20 p-3 sm:max-h-[62vh] sm:border-b-0 sm:border-r"
            >
              {letters.map((letter, index) => (
                <button
                  key={letter.id}
                  type="button"
                  aria-pressed={selected?.id === letter.id}
                  onClick={() => {
                    setSelectedId(letter.id);
                    setPendingDeleteId("");
                  }}
                  className={`mb-2 block w-full border px-4 py-3 text-left transition-colors last:mb-0 ${
                    selected?.id === letter.id
                      ? "border-[#c4a882]/55 bg-[#c4a882]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-[#c4a882]/30"
                  }`}
                >
                  <span className="block text-[9px] tracking-[0.18em] text-[#c4a882]/65">
                    信 {String(letters.length - index).padStart(2, "0")} · {letter.recipient === "her" ? "写给她" : letter.recipient === "him" ? "写给他" : "旧信"} · {letter.mode === "reply" ? "回信" : "复盘"}
                  </span>
                  <span className="mt-2 block truncate font-serif text-xs text-white/70">
                    {letter.message}
                  </span>
                  <span className="mt-2 block text-[8px] tracking-[0.08em] text-white/25">
                    {formatLetterDate(letter.createdAt)}
                  </span>
                </button>
              ))}
            </nav>

            <article className="min-h-0 overflow-y-auto bg-[#e9ddc9] px-6 py-7 text-[#493d3e] sm:max-h-[62vh] sm:px-10 sm:py-9">
              {selected && (
                <>
                  <p className="text-center text-[9px] tracking-[0.3em] text-[#8b6f62]">
                    {selected.mode === "reply" ? "给 那 时 的 你" : "一 次 关 系 回 望"}
                  </p>
                  <blockquote className="mx-auto mt-5 max-w-xl border-l border-[#9d8580]/35 pl-4 text-xs leading-6 text-[#756566]">
                    {selected.message}
                  </blockquote>
                  <div className="mt-7 whitespace-pre-line font-serif text-sm leading-8 sm:text-base">
                    {selected.text}
                  </div>
                  <div className="mt-8 border-t border-[#9d8580]/25 pt-5 text-center">
                    <p className="text-[8px] tracking-[0.2em] text-[#8b6f62]/65">
                      {formatLetterDate(selected.createdAt)} · 玫瑰无限
                    </p>
                    {pendingDeleteId === selected.id ? (
                      <div className="mt-5 flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId("")}
                          className="border border-[#9d8580]/35 px-4 py-2 text-[9px] tracking-[0.14em] text-[#756566] transition-colors hover:border-[#756566]"
                        >
                          取 消
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingDeleteId("");
                            onDelete(selected.id);
                          }}
                          className="border border-[#9b5559]/55 bg-[#9b5559]/10 px-4 py-2 text-[9px] tracking-[0.14em] text-[#8d4248] transition-colors hover:bg-[#9b5559] hover:text-[#fff8ed]"
                        >
                          确 认 删 除
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(selected.id)}
                        className="mt-5 text-[9px] tracking-[0.14em] text-[#8b6f62]/55 underline decoration-[#8b6f62]/25 underline-offset-4 transition-colors hover:text-[#8d4248]"
                      >
                        删除这封信
                      </button>
                    )}
                  </div>
                </>
              )}
            </article>
          </>
        )}

        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-[10px] tracking-[0.2em] text-white/40 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#c4a882]"
        >
          关 闭 ×
        </button>
      </section>
    </div>
  );
}
