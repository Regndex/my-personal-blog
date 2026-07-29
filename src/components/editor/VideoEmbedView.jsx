import { NodeViewWrapper } from '@tiptap/react'

export default function VideoEmbedView({ node, selected, deleteNode }) {
  const { videoId } = node.attrs

  return (
    <NodeViewWrapper
      className={`not-prose relative my-4 ${
        selected ? 'outline outline-2 outline-pine-500 outline-offset-2' : ''
      }`}
      data-drag-handle
    >
      <button
        type="button"
        onClick={deleteNode}
        className="absolute end-2 top-2 z-10 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500/80"
      >
        حذف
      </button>
      <div className="video-embed-wrapper">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="مشغل الفيديو"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </NodeViewWrapper>
  )
}
