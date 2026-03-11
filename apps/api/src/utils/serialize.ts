/**
 * Serializes Date fields to ISO strings for JSON responses.
 * Handles both Date objects and already-stringified dates defensively.
 */
export function serializeDates<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  const dateKeys = ["createdAt", "updatedAt", "timerStartedAt", "joinedAt"];
  for (const key of dateKeys) {
    if (key in result) {
      const value = (result as any)[key];
      (result as any)[key] = value?.toISOString?.() ?? value ?? null;
    }
  }
  return result;
}
