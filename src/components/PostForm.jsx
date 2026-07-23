import { useState } from 'react'
import { supabase, BLOG_IMAGES_BUCKET } from '../lib/supabaseClient'
import { compressImage } from '../utils/imageCompression'
import PostPreview from './PostPreview'

function parseTags(input) {
  return input
    .split(/[,،]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function toDatetimeLocalValue(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function initialPublishMode(publishedAt) {
  if (!publishedAt) return 'draft'
  return new Date(publishedAt) > new Date() ? 'scheduled' : 'now'
}

/**
 * Shared create/edit form.
 * - Pass `initialData` (an existing post row) to pre-fill for editing.
 * - `onSubmit(data)` receives the finished post payload and must perform
 *   the actual insert/update; throw to surface an error, resolve to signal
 *   success (the parent page decides what happens next, e.g. navigating).
 */
export default function PostForm({ initialData, onSubmit, submitLabel = 'حفظ' }) {
  const [form, setForm] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    videoUrl: initialData?.video_url || '',
    tags: initialData?.tags?.join('، ') || '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(initialData?.image_url || null)
  const [imageInfo, setImageInfo] = useState(null)

  const [publishMode, setPublishMode] = useState(() => initialPublishMode(initialData?.published_at))
  const [scheduledAt, setScheduledAt] = useState(() =>
    initialData?.published_at ? toDatetimeLocalValue(initialData.published_at) : ''
  )
  const [showPreview, setShowPreview] = useState(false)

  const [compressing, setCompressing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setCompressing(true)

    try {
      const originalKB = Math.round(file.size / 1024)
      const compressed = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
      })
      const compressedKB = Math.round(compressed.size / 1024)

      setImageFile(compressed)
      setPreviewUrl(URL.createObjectURL(compressed))
      setImageInfo({ originalKB, compressedKB })
    } catch (err) {
      setError('تعذرت معالجة الصورة: ' + err.message)
    } finally {
      setCompressing(false)
    }
  }

  function resolvePublishedAt() {
    if (publishMode === 'draft') return null
    if (publishMode === 'now') return new Date().toISOString()
    if (!scheduledAt) return null
    return new Date(scheduledAt).toISOString()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    if (!form.title.trim() || !form.content.trim()) {
      setError('العنوان ونص المقال حقلان مطلوبان')
      return
    }

    if (publishMode === 'scheduled' && !scheduledAt) {
      setError('اختر تاريخ ووقت الجدولة')
      return
    }

    setSubmitting(true)

    try {
      let imageUrl = initialData?.image_url || null

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from(BLOG_IMAGES_BUCKET)
          .upload(filePath, imageFile, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from(BLOG_IMAGES_BUCKET)
          .getPublicUrl(filePath)

        imageUrl = publicUrlData.publicUrl
      }

      await onSubmit({
        title: form.title.trim(),
        content: form.content.trim(),
        image_url: imageUrl,
        video_url: form.videoUrl.trim() || null,
        tags: parseTags(form.tags),
        published_at: resolvePublishedAt(),
      })

      setSuccess(true)
    } catch (err) {
      setError('حدث خطأ: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const publishOptions = [
    { value: 'draft', label: 'مسودة' },
    { value: 'now', label: 'نشر الآن' },
    { value: 'scheduled', label: 'جدولة' },
  ]

  if (showPreview) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setShowPreview(false)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-pine-600 hover:underline"
        >
          ← العودة للتحرير
        </button>
        <PostPreview
          title={form.title}
          content={form.content}
          imageUrl={previewUrl}
          tags={parseTags(form.tags)}
          videoUrl={form.videoUrl}
        />
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8 dark:border-stone-700 dark:bg-surface"
    >
      <div>
        <label htmlFor="title" className="mb-2 block text-sm font-medium text-ink">
          عنوان المقال
        </label>
        <input
          id="title"
          type="text"
          value={form.title}
          onChange={(event) => updateField('title', event.target.value)}
          placeholder="عنوان جذاب لمقالك..."
          className="w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="content" className="block text-sm font-medium text-ink">
            نص المقال
          </label>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="text-sm font-medium text-pine-600 hover:underline"
          >
            معاينة
          </button>
        </div>
        <textarea
          id="content"
          value={form.content}
          onChange={(event) => updateField('content', event.target.value)}
          placeholder="اكتب محتوى مقالك هنا..."
          rows={12}
          className="w-full resize-y rounded-xl border border-stone-200 bg-transparent px-4 py-3 font-mono text-sm text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
        />
        <p className="mt-2 text-xs leading-relaxed text-stone-400">
          يدعم Markdown: **عريض**، *مائل*، عنوان بـ <span dir="ltr">## نص</span>، صورة بـ{' '}
          <span dir="ltr">![وصف](رابط)</span>. الصق رابط يوتيوب في سطر منفرد لتضمينه كفيديو في
          مكانه بالضبط.
        </p>
      </div>

      <div>
        <label htmlFor="tags" className="mb-2 block text-sm font-medium text-ink">
          الوسوم / التصنيفات (اختياري)
        </label>
        <input
          id="tags"
          type="text"
          value={form.tags}
          onChange={(event) => updateField('tags', event.target.value)}
          placeholder="سفر، يوميات، تقنية"
          className="w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
        />
        <p className="mt-2 text-xs text-stone-400">افصل بين الوسوم بفاصلة</p>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-ink">صورة الغلاف</span>
        <div className="flex items-center gap-4">
          <label className="flex-1 cursor-pointer rounded-xl border-2 border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500 transition hover:border-pine-400 hover:text-pine-600 dark:border-stone-600">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            {compressing ? 'جارٍ ضغط الصورة...' : 'اضغط لاختيار صورة'}
          </label>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="معاينة صورة الغلاف"
              className="h-20 w-20 shrink-0 rounded-xl border border-stone-200 object-cover dark:border-stone-600"
            />
          )}
        </div>
        {imageInfo && (
          <p className="mt-2 text-xs text-stone-400">
            تم تقليل حجم الصورة من {imageInfo.originalKB} ك.ب إلى {imageInfo.compressedKB} ك.ب
          </p>
        )}
      </div>

      <div>
        <label htmlFor="videoUrl" className="mb-2 block text-sm font-medium text-ink">
          رابط فيديو رئيسي (اختياري، يظهر أسفل المقال)
        </label>
        <input
          id="videoUrl"
          type="url"
          value={form.videoUrl}
          onChange={(event) => updateField('videoUrl', event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
        />
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-ink">حالة النشر</span>
        <div className="flex flex-wrap gap-2">
          {publishOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPublishMode(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                publishMode === option.value
                  ? 'bg-pine-500 text-paper'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {publishMode === 'scheduled' && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="mt-3 w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
          />
        )}

        <p className="mt-2 text-xs text-stone-400">
          {publishMode === 'draft' && 'يُحفظ ولا يظهر للزوار حتى تنشره لاحقاً.'}
          {publishMode === 'now' && 'يظهر للزوار فور الحفظ.'}
          {publishMode === 'scheduled' && 'يظهر للزوار تلقائياً عند حلول الموعد المحدد.'}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-pine-100 bg-pine-50 px-4 py-3 text-sm text-pine-700 dark:border-pine-500/20 dark:bg-pine-500/10 dark:text-pine-400">
          تم الحفظ بنجاح!
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || compressing}
        className="w-full rounded-xl bg-pine-500 px-6 py-3.5 font-medium text-paper transition-colors hover:bg-pine-600 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {submitting ? 'جارٍ الحفظ...' : submitLabel}
      </button>
    </form>
  )
}
