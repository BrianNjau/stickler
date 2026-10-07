// Pure text helpers for goals (unit-testable under plain Node).

// A six-word cut shouldn't end on a joining word ("Launch a weekend cake business and").
const DANGLING = new Set(['and', 'or', 'but', 'to', 'by', 'for', 'with', 'the', 'a', 'an', 'my', 'of', 'in', 'on', 'at', 'so']);

/** "  pass my cpa by june, i get maybe an hour after work " → "Pass my cpa by june" (≤ 6 words). */
export function titleFrom(raw: string): string {
  const firstClause = raw.trim().split(/[.!?\n]/)[0] ?? raw;
  const words = firstClause.replace(/[,;:]+$/, '').split(/\s+/).filter(Boolean).slice(0, 6);
  while (words.length > 2 && DANGLING.has((words[words.length - 1] ?? '').toLowerCase().replace(/[,;:]$/, ''))) words.pop();
  const t = words.join(' ').replace(/[,;:]+$/, '');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'My goal';
}
