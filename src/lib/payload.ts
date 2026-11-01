export function nullIfEmpty(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function cleanPayload<T extends Record<string, unknown>>(payload: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) {
      result[key] = null;
    } else if (typeof value === 'string' && value.trim() === '') {
      result[key] = null;
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
