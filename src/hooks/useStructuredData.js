import { useEffect } from 'react'

const SCRIPT_ID = 'post-structured-data'

/**
 * Injects Article JSON-LD for the current post — read by crawlers that DO
 * execute JavaScript (notably Google's), helping eligibility for rich
 * results in search. Complements sitemap.xml/rss.xml; shares the same
 * "doesn't reach non-JS crawlers" limitation as the Open Graph tags in
 * useDocumentMeta.js.
 */
export function useStructuredData(post) {
  useEffect(() => {
    if (!post) return

    const data = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      datePublished: post.published_at || post.created_at,
      dateModified: post.published_at || post.created_at,
      image: post.image_url ? [post.image_url] : undefined,
      description: post.content?.slice(0, 200),
      author: { '@type': 'Person', name: 'مدونتي' },
    }

    let script = document.getElementById(SCRIPT_ID)
    if (!script) {
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(data)

    return () => {
      script?.remove()
    }
  }, [post])
}
