const FONT_SIZES = [
  { label: 'عادي', value: null },
  { label: 'صغير', value: '14px' },
  { label: 'كبير', value: '22px' },
  { label: 'كبير جداً', value: '28px' },
]

function ToolbarButton({ active, onClick, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors disabled:opacity-40 ${
        active
          ? 'bg-pine-500 text-paper'
          : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

export default function EditorToolbar({ editor, onInsertImage, onInsertVideo }) {
  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 p-2 dark:border-stone-600">
      <ToolbarButton
        title="عريض"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        title="مائل"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-600" />

      <ToolbarButton
        title="عنوان رئيسي"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        title="عنوان فرعي"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>

      <select
        title="حجم الخط"
        onChange={(event) => {
          const value = event.target.value || null
          if (value) {
            editor.chain().focus().setMark('textStyle', { fontSize: value }).run()
          } else {
            editor.chain().focus().setMark('textStyle', { fontSize: null }).run()
          }
        }}
        className="h-8 rounded-lg border-0 bg-transparent px-1 text-sm text-stone-500 focus:outline-none focus:ring-1 focus:ring-pine-400"
        defaultValue=""
      >
        {FONT_SIZES.map((size) => (
          <option key={size.label} value={size.value || ''}>
            {size.label}
          </option>
        ))}
      </select>

      <span className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-600" />

      <ToolbarButton
        title="قائمة نقطية"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •—
      </ToolbarButton>
      <ToolbarButton
        title="قائمة مرقّمة"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        title="اقتباس"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </ToolbarButton>
      <ToolbarButton
        title="كود"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        {'</>'}
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-600" />

      <ToolbarButton title="إدراج صورة" onClick={onInsertImage}>
        🖼 صورة
      </ToolbarButton>
      <ToolbarButton title="إدراج فيديو يوتيوب" onClick={onInsertVideo}>
        ▶ فيديو
      </ToolbarButton>
    </div>
  )
}
