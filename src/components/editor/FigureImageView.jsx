import { NodeViewWrapper } from '@tiptap/react'

const ALIGN_OPTIONS = [
  { value: 'right', label: 'يمين', icon: '⇥' },
  { value: 'left', label: 'يسار', icon: '⇤' },
  { value: 'center', label: 'وسط', icon: '↕' },
]

export default function FigureImageView({ node, updateAttributes, selected, deleteNode }) {
  const { src, alt, align, caption } = node.attrs

  return (
    <NodeViewWrapper
      className={`post-figure post-figure-${align} not-prose relative my-4 ${
        selected ? 'outline outline-2 outline-pine-500 outline-offset-2' : ''
      }`}
      data-drag-handle
    >
      <div className="mb-1.5 flex items-center gap-1 rounded-lg bg-stone-100 p-1 text-xs dark:bg-white/10">
        <span className="px-1.5 text-stone-400">موضع الصورة:</span>
        {ALIGN_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => updateAttributes({ align: option.value })}
            className={`rounded px-2 py-1 font-medium transition-colors ${
              align === option.value
                ? 'bg-pine-500 text-paper'
                : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-white/10'
            }`}
          >
            {option.icon} {option.label}
          </button>
        ))}
        <button
          type="button"
          onClick={deleteNode}
          className="ms-auto rounded px-2 py-1 font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          حذف
        </button>
      </div>

      <img src={src} alt={alt || ''} className="w-full rounded-xl" contentEditable={false} />

      <input
        type="text"
        value={caption}
        onChange={(event) => updateAttributes({ caption: event.target.value })}
        placeholder="نص تحت الصورة (اختياري)..."
        className="mt-1.5 w-full rounded-lg border border-stone-200 bg-transparent px-2.5 py-1.5 text-center text-sm text-stone-500 focus:border-pine-400 focus:outline-none dark:border-stone-600"
      />
    </NodeViewWrapper>
  )
}
