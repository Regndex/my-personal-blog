/**
 * Rough reading-time estimate. Arabic word-splitting on whitespace works
 * fine for this purpose even though the script has no capital letters —
 * we're just counting space-separated tokens, not parsing grammar.
 */
const WORDS_PER_MINUTE = 180

export function estimateReadingTime(content) {
  if (!content) return 1

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE)

  return Math.max(1, minutes)
}
