/**
 * Produces a short plain-text excerpt from a post's full content, used on
 * the home page cards. Collapses line breaks/extra whitespace and truncates
 * to `maxLength` characters on a word boundary where possible.
 */
export function getExcerpt(content, maxLength = 140) {
  if (!content) return ''

  const clean = content.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean

  const truncated = clean.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  const safe = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated

  return safe.trim() + '…'
}
