import DOMPurify from 'dompurify'
import { renderPostContent as renderMarkdown } from './markdown'

const SANITIZE_CONFIG = {
  ADD_TAGS: ['figure', 'figcaption', 'iframe'],
  ADD_ATTR: [
    'data-align',
    'data-figure-image',
    'data-video-embed',
    'data-video-id',
    'allow',
    'allowfullscreen',
    'frameborder',
    'src',
    'title',
  ],
}

/**
 * Adds sequential ids to h1-h3 elements found in already-built HTML (the
 * rich editor's output) and returns the table-of-contents entries to match
 * — the HTML-content equivalent of what markdown.js does while parsing
 * Markdown source for legacy posts. Also fills in the actual <iframe> for
 * video-embed placeholders: the editor's NodeView renders the iframe live
 * while editing, but editor.getHTML() only ever saves the wrapping
 * <div data-video-id="...">, so it has to be added back in at render time.
 */
function extractHeadingsFromHtml(html) {
  const container = document.createElement('div')
  container.innerHTML = html

  const headings = []
  container.querySelectorAll('h1, h2, h3').forEach((el, index) => {
    const id = `heading-${index}`
    el.id = id
    headings.push({ id, text: el.textContent, level: Number(el.tagName[1]) })
  })

  container.querySelectorAll('[data-video-embed]').forEach((el) => {
    const videoId = el.getAttribute('data-video-id')
    if (!videoId || el.querySelector('iframe')) return
    el.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" title="مشغل الفيديو" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
  })

  return { html: container.innerHTML, headings }
}

/**
 * Renders a post's content for display, no matter which editor wrote it.
 * `content_format` on the post row decides the pipeline:
 * - 'html' -> content is already structured HTML from the rich editor;
 *   just add heading ids for the TOC and sanitize.
 * - anything else (including missing, for posts predating this column)
 *   -> the original Markdown pipeline, unchanged.
 */
export function renderContent(post) {
  if (!post) return { html: '', headings: [] }

  if (post.content_format === 'html') {
    const { html, headings } = extractHeadingsFromHtml(post.content || '')
    return { html: DOMPurify.sanitize(html, SANITIZE_CONFIG), headings }
  }

  return renderMarkdown(post.content)
}
