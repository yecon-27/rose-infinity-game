export interface ChoiceLogEntry {
  sceneId: string;
  momentIdx: number;
  text: string;
  reach: boolean;
}

export const CHOICE_LOG_KEY = "rose:choices";

function isChoiceLogEntry(value: unknown): value is ChoiceLogEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<ChoiceLogEntry>;
  return (
    typeof entry.sceneId === "string" &&
    typeof entry.momentIdx === "number" &&
    Number.isFinite(entry.momentIdx) &&
    typeof entry.text === "string" &&
    typeof entry.reach === "boolean"
  );
}

export function readChoiceLog(): ChoiceLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(CHOICE_LOG_KEY) ?? "[]"
    );
    return Array.isArray(value) ? value.filter(isChoiceLogEntry).slice(-48) : [];
  } catch {
    return [];
  }
}

export function appendChoiceLog(entry: ChoiceLogEntry): void {
  if (typeof window === "undefined") return;
  try {
    const next = [...readChoiceLog(), entry].slice(-48);
    window.localStorage.setItem(CHOICE_LOG_KEY, JSON.stringify(next));
  } catch {
    // 隐私模式或存储空间不足时，剧情本身仍可继续。
  }
}

export function clearChoiceLog(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CHOICE_LOG_KEY);
  } catch {
    // 不让本地存储失败打断开场。
  }
}
