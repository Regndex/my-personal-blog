import Image from '@tiptap/extension-image'
import { Node, ReactNodeViewRenderer } from '@tiptap/react'
import FigureImageView from './FigureImageView'
import VideoEmbedView from './VideoEmbedView'

/**
 * An image block with an alignment (right/left/center) and an optional
 * caption — the "position it right/left/above/below the line, with text
 * under it" template the writer asked for. Verified round-trips correctly
 * (HTML -> saved -> re-opened in the editor keeps src/align/caption) since
 * ProseMirror needs an explicit parseHTML per attribute, not just on the
 * wrapping tag, or it silently drops them on reload.
 */
export const FigureImage = Image.extend({
  name: 'figureImage',
  group: 'block',
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.querySelector('img')?.getAttribute('src') || null,
      },
      alt: {
        default: '',
        parseHTML: (element) => element.querySelector('img')?.getAttribute('alt') || '',
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
      },
      caption: {
        default: '',
        parseHTML: (element) => element.querySelector('figcaption')?.textContent || '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-figure-image]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, align, caption } = HTMLAttributes
    return [
      'figure',
      { 'data-figure-image': '', 'data-align': align, class: `post-figure post-figure-${align}` },
      ['img', { src, alt: alt || '' }],
      ...(caption ? [['figcaption', {}, caption]] : []),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureImageView)
  },
})

/**
 * A YouTube embed as its own block node, insertable anywhere via the
 * toolbar — the WYSIWYG-editor equivalent of the "paste a bare link on
 * its own line" trick the old Markdown editor used.
 */
export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      videoId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-video-id'),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-video-embed]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        'data-video-embed': '',
        'data-video-id': HTMLAttributes.videoId,
        class: 'video-embed-wrapper',
      },
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedView)
  },
})
