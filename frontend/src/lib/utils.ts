export function sortQueue<T extends { pain_level?: number }>(data: T[]): T[] {
  return data.sort((a: T, b: T) =>
    ((b.pain_level ?? 0) >= 8 ? 1 : 0) - ((a.pain_level ?? 0) >= 8 ? 1 : 0)
  );
}
