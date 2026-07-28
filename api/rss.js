import { createClient } from '@supabase/supabase-js'

function escapeXml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Vercel serverless function — only runs when deployed to Vercel, NOT
 * during `npm run dev`. Reachable at /rss.xml once vercel.json's rewrite
 * for it is in place.
 */
export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: posts } = await supabase
      .from('posts')
      .select('id, slug, title, content, published_at')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .eq('password_protected', false)
      .order('published_at', { ascending: false })
      .limit(20)

    const siteUrl = `https://${req.headers.host}`

    const items = (posts || [])
      .map(
        (post) => `
  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${siteUrl}/post/${post.slug || post.id}</link>
    <guid isPermaLink="false">${post.id}</guid>
    <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
    <description>${escapeXml((post.content || '').slice(0, 300))}</description>
  </item>`
      )
      .join('')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>مدونتي</title>
  <link>${siteUrl}</link>
  <description>أفكار وتجارب وقصص</description>
  <language>ar</language>
  ${items}
</channel>
</rss>`

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
    res.status(200).send(xml)
  } catch (err) {
    res.status(500).send('<?xml version="1.0"?><error>' + err.message + '</error>')
  }
}
