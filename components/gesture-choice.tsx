"use client";

import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  Ref,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type Gesture = "hold" | "swipe" | "longpress";

const HOLD_MS: Record<Exclude<Gesture, "swipe">, number> = {
  hold: 1200,
  longpress: 2400,
};

const KEYBOARD_HOLD_MS: Record<Gesture, number> = {
  hold: 1200,
  swipe: 1600,
  longpress: 2400,
};

const GESTURE_COPY: Record<Gesture, string> = {
  hold: "按住不放 · 让犹豫停一会儿",
  swipe: "向右滑动 · 把手伸过去",
  longpress: "长按 · 把话说完",
};

const BUBBLE_COPY: Record<Gesture, string> = {
  hold: "按住这里，等它慢慢走完",
  swipe: "按住向右滑动",
  longpress: "长按这里，把这句话说完",
};

export function GestureChoice({
  gesture,
  onCommit,
  disabled = false,
  locked = false,
  selected = false,
  keyboardPressed = false,
  showHint = true,
  hintVariant = "inline",
  buttonRef,
  ariaDescribedBy,
  className = "",
  children,
}: {
  gesture?: Gesture;
  onCommit: () => void;
  disabled?: boolean;
  /** 已提交后锁定：保持进度条满格、不再响应任何输入，用于完成后到下一句的过渡。 */
  locked?: boolean;
  selected?: boolean;
  /** 全局选项导航时，选中的按钮通过这个状态接收 Enter 的按住/松开。 */
  keyboardPressed?: boolean;
  /** 手机演出会把说明移到手机外的指向气泡。 */
  showHint?: boolean;
  hintVariant?: "inline" | "bubble";
  buttonRef?: Ref<HTMLButtonElement>;
  ariaDescribedBy?: string;
  className?: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [keyboardMode, setKeyboardMode] = useState(false);
  const descriptionId = useId();
  const startX = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committed = useRef(false);
  const keyboardStarted = useRef(false);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  useEffect(
    () => () => {
      clearTimer();
    },
    []
  );

  function commit() {
    if (committed.current || disabled) return;
    committed.current = true;
    clearTimer();
    setProgress(1);
    onCommit();
  }

  function beginKeyboard() {
    if (locked || !gesture || disabled || keyboardStarted.current) return;
    keyboardStarted.current = true;
    committed.current = false;
    setKeyboardMode(true);
    setFeedback("");
    // 从 0 开始，让进度条随 .is-active 的过渡匀速填满，而不是瞬间跳到满格。
    setProgress(0);
    setActive(true);
    timer.current = setTimeout(() => {
      if (committed.current) return;
      committed.current = true;
      clearTimer();
      onCommitRef.current();
    }, KEYBOARD_HOLD_MS[gesture]);
  }

  function endKeyboard() {
    if (locked || !keyboardStarted.current) return;
    keyboardStarted.current = false;
    clearTimer();
    if (!committed.current) {
      setFeedback(
        gesture === "swipe"
          ? "按住 →，等它慢慢走完。"
          : "按住 Enter 或空格，等它走完。"
      );
      setProgress(0);
    }
    setKeyboardMode(false);
    setActive(false);
  }

  useEffect(() => {
    if (!gesture || disabled || !selected) {
      endKeyboard();
      return;
    }
    if (keyboardPressed) beginKeyboard();
    else endKeyboard();
    // begin/end 只依赖此处列出的原始状态；提交回调通过 ref 读取最新值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, gesture, keyboardPressed, selected]);

  function begin(event: ReactPointerEvent<HTMLButtonElement>) {
    if (locked || !gesture || disabled) return;
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
    const next = Math.min(1, distance / 176);
    setProgress(next);
    if (next >= 1) commit();
  }

  function end(event: ReactPointerEvent<HTMLButtonElement>) {
    if (locked || !gesture) return;
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
    "--gesture-progress": locked ? 1 : progress,
    "--gesture-duration":
      keyboardMode && gesture
        ? `${KEYBOARD_HOLD_MS[gesture]}ms`
        : gesture === "swipe"
        ? "180ms"
        : `${gesture ? HOLD_MS[gesture] : 0}ms`,
    touchAction: gesture === "swipe" ? "none" : "manipulation",
  } as CSSProperties;

  if (!gesture) {
    return (
      <button
        ref={buttonRef}
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
    <div className="relative space-y-1.5">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || locked}
        aria-describedby={showHint ? descriptionId : ariaDescribedBy}
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
            event.stopPropagation();
            if (!event.repeat) beginKeyboard();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            endKeyboard();
          }
        }}
        className={`gesture-choice gesture-${gesture} relative overflow-hidden ${
          active && !locked ? "is-active" : ""
        } ${selected ? "is-selected" : ""} ${
          locked ? "is-committed" : ""
        } ${className}`}
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
      {showHint && hintVariant === "bubble" && (
        <div
          id={descriptionId}
          role="status"
          className="gesture-choice-callout"
        >
          <span>{feedback || BUBBLE_COPY[gesture]}</span>
          <small>
            {gesture === "swipe"
              ? "键盘 · 按住 →"
              : "键盘 · 按住 Enter 或空格"}
          </small>
        </div>
      )}
      {showHint && hintVariant === "inline" && (
        <p
          id={descriptionId}
          className="px-1 text-[9px] tracking-[0.18em] text-white/40"
        >
          <span className="block">{feedback || GESTURE_COPY[gesture]}</span>
          <span className="mt-1 block text-white/30">
            键盘 · 按住 Enter 或空格
          </span>
        </p>
      )}
    </div>
  );
}
