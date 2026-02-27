export function parseQuestionOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((opt): opt is string => typeof opt === "string")
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((opt): opt is string => typeof opt === "string")
      }
    } catch {
      return []
    }
  }

  return []
}
