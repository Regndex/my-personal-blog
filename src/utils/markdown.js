import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ breaks: true })

const YOUTUBE_LINE_PATTERN =
  /^(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)\S+)$/gm

const YOUTUBE_ID_PATTERNS = [
  /youtube\.com\/watch\?v=([^&\s]+)/,
  /youtu\.be\/([^?&\s]+)/,
  /youtube\.com\/embed\/([^?&\s]+)/,
  /youtube\.com\/shorts\/([^?&\s]+)/,
]

function extractYouTubeId(url) {
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

function youtubeEmbedHtml(videoId) {
  return (
    '<div class="video-embed-wrapper">' +
    `<iframe src="https://www.youtube.com/embed/${videoId}" title="مشغل الفيديو" ` +
    'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
    'allowfullscreen></iframe></div>'
  )
}

// Strips the most common inline Markdown markers, for clean table-of-contents
// labels (the rendered heading itself still gets full inline formatting).
function stripInlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
}

/**
 * Renders post content (Markdown) to sanitized HTML, ready for
 * dangerouslySetInnerHTML, and returns the headings found (for the
 * auto table of contents) with IDs matching the rendered <h1-3> tags.
 *
 * Beyond plain Markdown:
 * 1. A bare YouTube URL on its own line auto-embeds as a responsive
 *    player, wherever it appears — lets an author drop a video "anywhere
 *    in the article" instead of only at the end.
 * 2. Standard Markdown image syntax `![alt](url)` places an inline image
 *    at that exact point in the text.
 *
 * Only ever call this on content written by the authenticated post owner
 * (see AuthContext) — comments and any other visitor-submitted text must
 * always be rendered as plain text, never through this function.
 */
export function renderPostContent(content) {
  if (!content) return { html: '', headings: [] }

  const headings = []
  let headingIndex = 0

  const renderer = new marked.Renderer()
  renderer.heading = ({ text, depth }) => {
    const id = `heading-${headingIndex++}`
    if (depth <= 3) {
      headings.push({ id, text: stripInlineMarkdown(text), level: depth })
    }
    return `<h${depth} id="${id}">${marked.parseInline(text)}</h${depth}>\n`
  }

  const videoIds = []
  const withPlaceholders = content.replace(YOUTUBE_LINE_PATTERN, (match) => {
    const id = extractYouTubeId(match.trim())
    if (!id) return match
    const token = `@@YOUTUBE_EMBED_${videoIds.length}@@`
    videoIds.push(id)
    return token
  })

  let html = marked.parse(withPlaceholders, { renderer })

  videoIds.forEach((videoId, index) => {
    const token = `@@YOUTUBE_EMBED_${index}@@`
    const wrapped = new RegExp(`<p>\\s*${token}\\s*</p>`)
    html = html.includes(token)
      ? wrapped.test(html)
        ? html.replace(wrapped, youtubeEmbedHtml(videoId))
        : html.replace(token, youtubeEmbedHtml(videoId))
      : html
  })

  const sanitized = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'src', 'title'],
  })

  return { html: sanitized, headings }
}
