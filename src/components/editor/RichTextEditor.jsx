import { useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import { supabase, BLOG_IMAGES_BUCKET } from '../../lib/supabaseClient'
import { compressImage } from '../../utils/imageCompression'
import { FigureImage, VideoEmbed } from './extensions'
import EditorToolbar from './EditorToolbar'
import ImagePicker from '../ImagePicker'

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

/**
 * Toolbar-driven rich text editor — replaces typing Markdown by hand.
 * Images are inserted as their own block with alignment (right/left/
 * center, i.e. "float text around it" or "stand alone above/below the
 * line it's inserted at") and an optional caption underneath, all via
 * buttons rather than syntax. Content is stored as sanitized HTML
 * (content_format: 'html'), read back out with editor.getHTML().
 */
export default function RichTextEditor({ content, onChange }) {
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TextStyle,
      FontSize,
      Placeholder.configure({ placeholder: 'اكتب محتوى مقالك هنا...' }),
      FigureImage,
      VideoEmbed,
    ],
    content: content || '',
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'post-content prose-editor min-h-[280px] px-4 py-3 focus:outline-none font-serif text-[17px] leading-8',
      },
    },
  })

  function insertImageUrl(url) {
    editor
      ?.chain()
      .focus()
      .insertContent({ type: 'figureImage', attrs: { src: url, align: 'center', caption: '' } })
      .run()
    setShowImageMenu(false)
    setShowImagePicker(false)
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    setShowImageMenu(false)
    setUploading(true)

    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 })
      const fileExt = compressed.name.split('.').pop()
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(BLOG_IMAGES_BUCKET)
        .upload(filePath, compressed, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(filePath)
      insertImageUrl(data.publicUrl)
    } catch (err) {
      window.alert('تعذر رفع الصورة: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleInsertVideo() {
    const url = window.prompt('الصق رابط فيديو يوتيوب:')
    if (!url) return
    const videoId = extractYouTubeId(url.trim())
    if (!videoId) {
      window.alert('تعذر التعرف على رابط يوتيوب صالح في هذا النص')
      return
    }
    editor?.chain().focus().insertContent({ type: 'videoEmbed', attrs: { videoId } }).run()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-600">
      <EditorToolbar
        editor={editor}
        onInsertImage={() => setShowImageMenu((prev) => !prev)}
        onInsertVideo={handleInsertVideo}
      />

      {showImageMenu && (
        <div className="flex gap-2 border-b border-stone-200 bg-stone-50 p-2 dark:border-stone-600 dark:bg-white/5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-sm disabled:opacity-50 dark:bg-surface"
          >
            {uploading ? 'جارٍ الرفع...' : 'رفع صورة جديدة'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowImagePicker(true)
              setShowImageMenu(false)
            }}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-sm dark:bg-surface"
          >
            من المكتبة
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      <EditorContent editor={editor} />

      {showImagePicker && (
        <ImagePicker onSelect={insertImageUrl} onClose={() => setShowImagePicker(false)} />
      )}
    </div>
  )
}
