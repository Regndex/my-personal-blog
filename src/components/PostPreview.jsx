import { useMemo } from 'react'
import { renderPostContent } from '../utils/markdown'
import TagPills from './TagPills'
import VideoEmbed from './VideoEmbed'

/**
 * Renders form data exactly the way PostView will once saved — used by
 * PostForm's "معاينة" toggle, working from in-memory (unsaved) values.
 */
export default function PostPreview({ title, content, imageUrl, tags, videoUrl }) {
  const { html } = useMemo(() => renderPostContent(content), [content])

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-8 dark:border-stone-700 dark:bg-surface">
      <p className="mb-4 inline-block rounded-full bg-gold-50 px-3 py-1 text-xs font-medium text-gold-600 dark:bg-gold-50/10">
        معاينة — لم يُحفظ بعد
      </p>

      {imageUrl && (
        <div className="mb-6 overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-800">
          <img src={imageUrl} alt={title} className="max-h-[360px] w-full object-cover" />
        </div>
      )}

      <h1 className="mb-3 text-2xl font-bold text-ink sm:text-3xl">{title || 'بدون عنوان'}</h1>

      {tags?.length > 0 && (
        <div className="mb-5">
          <TagPills tags={tags} />
        </div>
      )}

      <div
        className="post-content font-serif text-[17px] leading-8 text-ink/90"
        dangerouslySetInnerHTML={{ __html: html || '<p class="text-stone-400">لا يوجد محتوى بعد</p>' }}
      />

      {videoUrl && (
        <div className="mt-8">
          <VideoEmbed url={videoUrl} />
        </div>
      )}
    </div>
  )
}
