import { supabase } from '../lib/supabaseClient'

/**
 * Turns a title into a URL-friendly slug. Arabic (and any other script)
 * letters are kept as-is rather than transliterated — Arabic readers get
 * an Arabic URL, which is both more natural and avoids lossy romanization.
 * Punctuation is stripped, whitespace collapses to single hyphens.
 */
export function slugify(title) {
  return (title || '')
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Generates a slug from `title` and makes sure it's unique among posts,
 * appending -2, -3, ... as needed. Pass `excludePostId` when editing an
 * existing post so it doesn't collide with its own current slug.
 */
export async function generateUniqueSlug(title, excludePostId) {
  const base = slugify(title) || 'مقال'
  let candidate = base
  let attempt = 2

  while (true) {
    let query = supabase.from('posts').select('id').eq('slug', candidate)
    if (excludePostId) query = query.neq('id', excludePostId)

    const { data } = await query.maybeSingle()
    if (!data) return candidate

    candidate = `${base}-${attempt}`
    attempt += 1
  }
}
