// Pure helpers for storing a long string across several small slots. No React Native imports,
// so tests run under plain Node.

/** iOS Keychain items warn above 2048 bytes; stay well under it even for multi-byte text. */
export const CHUNK_SIZE = 1800;

export function splitIntoChunks(value: string, size: number = CHUNK_SIZE): string[] {
  if (size <= 0) throw new Error('chunk size must be positive');
  if (value.length === 0) return [''];
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) chunks.push(value.slice(i, i + size));
  return chunks;
}

/** Joins chunks back; returns null if any is missing, so a half-written value reads as "no session". */
export function joinChunks(chunks: readonly (string | null)[]): string | null {
  if (chunks.some((c) => c === null)) return null;
  return chunks.join('');
}

/** Slot names: `<key>.n` holds the count, `<key>.0 … <key>.n-1` hold the parts. */
export const countKey = (key: string) => `${key}.n`;
export const partKey = (key: string, i: number) => `${key}.${i}`;
