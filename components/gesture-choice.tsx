"use client";

import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type Gesture = "hold" | "swipe" | "longpress";

const HOLD_MS: Record<Exclude<Gesture, "swipe">, number> = {
  hold: 720,
  longpress: 1100,
};

const GESTURE_COPY: Record<Gesture, string> = {
  hold: "按住不放 · 让犹豫停一会儿",
  swipe: "向右滑动 · 把手伸过去",
  longpress: "长按 · 这次真的说出口",
};

export function GestureChoice({
  gesture,
  onCommit,
  disabled = false,
  selected = false,
  className = "",
  children,
}: {
  gesture?: Gesture;
  onCommit: () => void;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState("");
  const descriptionId = useId();
  const startX = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committed = useRef(false);

  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  useEffect(() => clearTimer, []);

  function commit() {
    if (committed.current || disabled) return;
    committed.current = true;
    clearTimer();
    setProgress(1);
    onCommit();
  }

  function begin(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!gesture || disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    committed.current = false;
    startX.current = event.clientX;
    setFeedback("");
    setProgress(0);
    setActive(true);

    if (gesture !== "swipe") {
      timer.current = setTimeout(commit, HOLD_MS[gesture]);
    }
  }

  function move(event: ReactPointerEvent<HTMLButtonElement>) {
    if (gesture !== "swipe" || !active || disabled) return;
    event.preventDefault();
    const distance = Math.max(0, event.clientX - startX.current);
    const next = Math.min(1, distance / 96);
    setProgress(next);
    if (next >= 1) commit();
  }

  function end(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!gesture) return;
    event.preventDefault();
    event.stopPropagation();
    clearTimer();
    if (!committed.current) {
      setFeedback(
        gesture === "swipe" ? "再往前一点。" : "再停一会儿。"
      );
      setProgress(0);
    }
    setActive(false);
  }

  const style = {
    "--gesture-progress": progress,
    "--gesture-duration":
      gesture === "swipe"
        ? "80ms"
        : `${gesture ? HOLD_MS[gesture] : 0}ms`,
    touchAction: gesture === "swipe" ? "none" : "manipulation",
  } as CSSProperties;

  if (!gesture) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onCommit();
        }}
        className={className}
      >
        {children}
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={disabled}
        aria-describedby={descriptionId}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            commit();
          }
        }}
        className={`gesture-choice gesture-${gesture} relative overflow-hidden ${
          active ? "is-active" : ""
        } ${selected ? "is-selected" : ""} ${className}`}
        style={style}
      >
        <span className="gesture-choice__wash" aria-hidden="true" />
        <span
          className="gesture-choice__content relative z-10 block"
          style={{ transform: `translateX(${progress * 10}px)` }}
        >
          {children}
        </span>
      </button>
      <p
        id={descriptionId}
        className="px-1 text-[9px] tracking-[0.18em] text-white/40"
      >
        {feedback || GESTURE_COPY[gesture]}
      </p>
    </div>
  );
}
