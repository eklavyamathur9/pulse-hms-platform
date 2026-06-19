export const sortQueue = (data: unknown): any[] =>
  (data as any[]).sort((a: any, b: any) =>
    (b.pain_level >= 8 ? 1 : 0) - (a.pain_level >= 8 ? 1 : 0)
  );
