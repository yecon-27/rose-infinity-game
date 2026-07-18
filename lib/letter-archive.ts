import type { LetterMode, LetterRecipient } from "@/lib/letter";

export const LETTER_ARCHIVE_KEY = "rose:letter-archive";

export interface ArchivedLetter {
  id: string;
  mode: LetterMode;
  recipient?: LetterRecipient;
  message: string;
  text: string;
  createdAt: string;
  source?: "generated" | "fallback" | "grounded";
}

function isArchivedLetter(value: unknown): value is ArchivedLetter {
  if (!value || typeof value !== "object") return false;
  const letter = value as Partial<ArchivedLetter>;
  return (
    typeof letter.id === "string" &&
    (letter.mode === "reply" || letter.mode === "reflection") &&
    (letter.recipient === undefined ||
      letter.recipient === "him" ||
      letter.recipient === "her") &&
    typeof letter.message === "string" &&
    typeof letter.text === "string" &&
    typeof letter.createdAt === "string"
  );
}

export function readLetterArchive(): ArchivedLetter[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(LETTER_ARCHIVE_KEY) ?? "[]"
    );
    return Array.isArray(parsed) ? parsed.filter(isArchivedLetter) : [];
  } catch {
    return [];
  }
}

export function archiveLetter(
  letter: Omit<ArchivedLetter, "id" | "createdAt">
): ArchivedLetter | null {
  if (typeof window === "undefined") return null;
  const archived: ArchivedLetter = {
    ...letter,
    id:
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(
      LETTER_ARCHIVE_KEY,
      JSON.stringify([archived, ...readLetterArchive()])
    );
    return archived;
  } catch {
    // 信箱不可写时仍然让用户正常读完当次回信。
    return null;
  }
}

export function deleteArchivedLetter(id: string): ArchivedLetter[] {
  if (typeof window === "undefined") return [];
  const next = readLetterArchive().filter((letter) => letter.id !== id);
  try {
    window.localStorage.setItem(LETTER_ARCHIVE_KEY, JSON.stringify(next));
  } catch {
    return readLetterArchive();
  }
  return next;
}
