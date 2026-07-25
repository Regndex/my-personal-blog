import { createClient } from '@supabase/supabase-js'

/**
 * Vercel serverless function — only runs when deployed to Vercel, NOT
 * during `npm run dev` (Vite doesn't execute files under /api). Reachable
 * at /sitemap.xml once vercel.json's rewrite for it is in place.
 *
 * Reads the same public env vars already set for the Vite client build
 * (no new ones needed) — safe here since they're just the project URL and
 * the anon public key, same as what already ships in the browser bundle.
 */
export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: posts } = await supabase
      .from('posts')
      .select('id, slug, published_at')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())

    const siteUrl = `https://${req.headers.host}`

    const urlEntries = (posts || [])
      .map(
        (post) => `
  <url>
    <loc>${siteUrl}/post/${post.slug || post.id}</loc>
    <lastmod>${new Date(post.published_at).toISOString()}</lastmod>
  </url>`
      )
      .join('')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc></url>${urlEntries}
</urlset>`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.status(200).send(xml)
  } catch (err) {
    res.status(500).send('<?xml version="1.0"?><error>' + err.message + '</error>')
  }
}
