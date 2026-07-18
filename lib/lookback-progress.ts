export const LOOKBACK_PROGRESS_KEY = "rose:lookbacks";

export function readLookbackProgress(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(LOOKBACK_PROGRESS_KEY) ?? "[]"
    );
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function completeLookback(id: string): string[] {
  if (typeof window === "undefined") return [];
  const next = Array.from(new Set([...readLookbackProgress(), id]));
  try {
    window.localStorage.setItem(LOOKBACK_PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // 本地存储不可用时，不阻断当次回看。
  }
  return next;
}

export function clearLookbackProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOOKBACK_PROGRESS_KEY);
  } catch {
    // 不让存储失败打断新一局。
  }
}
