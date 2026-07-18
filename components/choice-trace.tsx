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
  const petalCount = Math.min(5, Math.max(1, Math.ceil(count / 3)));

  return (
    <div
      className={`choice-trace fixed left-1/2 top-14 z-[35] -translate-x-1/2 pointer-events-none ${
        visible ? "is-visible" : ""
      }`}
      aria-hidden="true"
    >
      <svg width="164" height="54" viewBox="0 0 164 54" fill="none">
        <circle cx="12" cy="27" r="2.5" fill="rgba(255,255,255,.55)" />
        <circle cx="152" cy="27" r="2.5" fill="rgba(255,255,255,.55)" />
        <path
          d={`M15 27 C 55 ${27 + bend}, 105 ${27 - bend}, 149 27`}
          stroke="rgba(233,191,178,.68)"
          strokeWidth="1.2"
          strokeLinecap="round"
          className="choice-trace__line"
        />
        {Array.from({ length: petalCount }).map((_, index) => {
          const x = 58 + index * 12;
          const y = 26 + ((count + index) % 3 - 1) * 3;
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
      <p className="-mt-1 text-center text-[8px] tracking-[0.28em] text-white/35">
        有些东西，正在留下来
      </p>
    </div>
  );
}

