import { useEffect } from 'react'

const SITE_NAME = 'مدونتي'

function setMetaTag(attr, key, content) {
  let tag = document.querySelector(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/**
 * Updates the browser tab title and Open Graph / description meta tags
 * for the current page. This covers the tab title everywhere, and covers
 * link previews for crawlers that execute JavaScript.
 *
 * Limitation worth knowing: WhatsApp/Telegram/older link-preview bots do
 * NOT run JavaScript, so they will only ever see the static defaults
 * already in index.html, not the specific post's title/image set here.
 * A fully robust fix needs server-side rendering (or a small serverless
 * function that detects those bots specifically) — a bigger change than
 * this hook. Ask me if you'd like that built separately.
 */
export function useDocumentMeta({ title, description, image }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    document.title = fullTitle

    if (description) {
      setMetaTag('name', 'description', description)
      setMetaTag('property', 'og:description', description)
    }

    setMetaTag('property', 'og:title', fullTitle)
    setMetaTag('property', 'og:type', title ? 'article' : 'website')
    setMetaTag('property', 'og:url', window.location.href)

    if (image) {
      setMetaTag('property', 'og:image', image)
    }

    return () => {
      document.title = SITE_NAME
    }
  }, [title, description, image])
}
