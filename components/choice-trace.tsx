"use client";

export function ChoiceTrace({
  count,
  reach,
  visible,
}: {
  count: number;
  reach: boolean;
  visible: boolean;
}) {
  const bend = ((count % 5) - 2) * 7;
  const petalCount = Math.min(7, Math.max(1, count));

  if (count === 0) return null;

  return (
    <div
      className={`choice-trace has-traces fixed right-4 top-14 z-[35] pointer-events-none sm:right-6 ${
        visible ? "is-visible" : ""
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="choice-trace__heading">
        <span>选择足迹</span>
        <strong>{String(count).padStart(2, "0")}</strong>
      </div>
      <svg width="164" height="42" viewBox="0 0 164 42" fill="none" aria-hidden="true">
        <circle cx="12" cy="21" r="2.5" fill="rgba(255,255,255,.7)" />
        <circle cx="152" cy="21" r="2.5" fill="rgba(255,255,255,.7)" />
        <path
          d={`M15 21 C 55 ${21 + bend}, 105 ${21 - bend}, 149 21`}
          stroke="rgba(233,191,178,.9)"
          strokeWidth="1.4"
          strokeLinecap="round"
          className="choice-trace__line"
        />
        {Array.from({ length: petalCount }).map((_, index) => {
          const x = 46 + index * 12;
          const y = 20 + ((count + index) % 3 - 1) * 3;
          return (
            <ellipse
              key={index}
              cx={x}
              cy={y}
              rx={reach && index === petalCount - 1 ? 3.6 : 2.3}
              ry={reach && index === petalCount - 1 ? 2.2 : 1.5}
              transform={`rotate(${index % 2 ? -24 : 24} ${x} ${y})`}
              fill={
                reach && index === petalCount - 1
                  ? "rgba(224,142,146,.84)"
                  : "rgba(255,255,255,.42)"
              }
            />
          );
        })}
      </svg>
      <p className="choice-trace__message">
        {visible
          ? reach
            ? "这次伸手，已经留下"
            : "这个选择，也已经留下"
          : "会在最后的信笺里重现"}
      </p>
    </div>
  );
}
