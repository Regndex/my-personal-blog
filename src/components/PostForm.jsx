import { useEffect, useRef, useState } from 'react'
import { supabase, BLOG_IMAGES_BUCKET } from '../lib/supabaseClient'
import { compressImage } from '../utils/imageCompression'
import { encryptContent } from '../utils/postLock'
import PostPreview from './PostPreview'
import ImagePicker from './ImagePicker'
import RichTextEditor from './editor/RichTextEditor'

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

function autosaveKey(postId) {
  return `blog-draft-autosave-${postId || 'new'}`
}

/**
 * Shared create/edit form.
 * - Pass `initialData` (an existing post row) to pre-fill for editing.
 * - `onSubmit(data)` receives the finished post payload and must perform
 *   the actual insert/update; throw to surface an error, resolve to signal
 *   success (the parent page decides what happens next, e.g. navigating).
 */
export default function PostForm({ initialData, onSubmit, submitLabel = 'حفظ' }) {
  const storageKey = autosaveKey(initialData?.id)
  // Existing posts saved before the toolbar editor keep opening in the
  // familiar Markdown textarea — converting their saved text into the new
  // editor's HTML risks silently mangling formatting or dropping images
  // that don't match the new figure structure, so it isn't attempted.
  // Every new post, and any post already saved in 'html' format, gets the
  // new editor.
  const isLegacyMarkdown = Boolean(initialData) && initialData.content_format !== 'html'

  const [form, setForm] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    videoUrl: initialData?.video_url || '',
    tags: initialData?.tags?.join('، ') || '',
    seriesName: initialData?.series_name || '',
    seriesOrder: initialData?.series_order ? String(initialData.series_order) : '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(initialData?.image_url || null)
  const [imageInfo, setImageInfo] = useState(null)
  const [isPinned, setIsPinned] = useState(initialData?.is_pinned || false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [passwordProtected, setPasswordProtected] = useState(initialData?.password_protected || false)
  const [lockPassword, setLockPassword] = useState('')

  const [publishMode, setPublishMode] = useState(() => initialPublishMode(initialData?.published_at))
  const [scheduledAt, setScheduledAt] = useState(() =>
    initialData?.published_at ? toDatetimeLocalValue(initialData.published_at) : ''
  )
  const [showPreview, setShowPreview] = useState(false)

  const [compressing, setCompressing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [restoreBanner, setRestoreBanner] = useState(null)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const skipNextAutosave = useRef(true)

  // On mount, check for a newer autosaved draft than what we're starting
  // with, and offer to restore it instead of silently overwriting it.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const saved = JSON.parse(raw)
      const isDifferent =
        saved.title !== (initialData?.title || '') || saved.content !== (initialData?.content || '')
      if (isDifferent) setRestoreBanner(saved)
    } catch {
      /* ignore malformed autosave data */
    }
  }, [storageKey, initialData])

  // Debounced autosave to localStorage — not the database, so an abandoned
  // draft never creates a phantom row. Restored on next visit to this form.
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false
      return
    }
    const timeout = setTimeout(() => {
      if (!form.title.trim() && !form.content.trim()) return
      const snapshot = { ...form, savedAt: new Date().toISOString() }
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot))
      setLastSavedAt(snapshot.savedAt)
    }, 2000)
    return () => clearTimeout(timeout)
  }, [form, storageKey])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function restoreAutosave() {
    if (!restoreBanner) return
    setForm({
      title: restoreBanner.title || '',
      content: restoreBanner.content || '',
      videoUrl: restoreBanner.videoUrl || '',
      tags: restoreBanner.tags || '',
      seriesName: restoreBanner.seriesName || '',
      seriesOrder: restoreBanner.seriesOrder || '',
    })
    setRestoreBanner(null)
  }

  function discardAutosave() {
    window.localStorage.removeItem(storageKey)
    setRestoreBanner(null)
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

  function handleLibrarySelect(url) {
    setImageFile(null)
    setPreviewUrl(url)
    setImageInfo(null)
    setShowImagePicker(false)
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

    if (passwordProtected && !lockPassword.trim()) {
      setError('أدخل كلمة مرور لحماية المقال، أو ألغِ خيار الحماية')
      return
    }

    setSubmitting(true)

    try {
      let imageUrl = previewUrl

      // previewUrl might be: unchanged existing image_url, a library pick
      // (already a real URL, no upload needed), or a local blob: preview
      // from a freshly compressed file (imageFile set) that still needs
      // uploading.
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

      // Password protection: the plaintext never reaches `content` at all
      // in this case — only the encrypted payload is stored. See
      // src/utils/postLock.js for why this is a real (not decorative) gate.
      const contentPayload = passwordProtected
        ? { content: null, encrypted_payload: await encryptContent(form.content.trim(), lockPassword) }
        : { content: form.content.trim(), encrypted_payload: null }

      await onSubmit({
        title: form.title.trim(),
        ...contentPayload,
        content_format: isLegacyMarkdown ? 'markdown' : 'html',
        image_url: imageUrl || null,
        video_url: form.videoUrl.trim() || null,
        tags: parseTags(form.tags),
        published_at: resolvePublishedAt(),
        is_pinned: isPinned,
        series_name: form.seriesName.trim() || null,
        series_order: form.seriesOrder ? parseInt(form.seriesOrder, 10) : null,
        password_protected: passwordProtected,
      })

      window.localStorage.removeItem(storageKey)
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
          contentFormat={isLegacyMarkdown ? 'markdown' : 'html'}
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
      {restoreBanner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-400/40 bg-gold-50 px-4 py-3 text-sm dark:bg-gold-50/10">
          <span className="text-gold-600">
            وجدنا نسخة محفوظة تلقائياً لم تُحفظ في المقال بعد. استعادتها؟
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={restoreAutosave}
              className="rounded-full bg-gold-500 px-3 py-1 text-xs font-medium text-white"
            >
              استعادة
            </button>
            <button
              type="button"
              onClick={discardAutosave}
              className="rounded-full px-3 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 dark:hover:bg-white/10"
            >
              تجاهل
            </button>
          </span>
        </div>
      )}

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
          <span className="flex items-center gap-3">
            {lastSavedAt && (
              <span className="text-xs text-stone-400">حُفظ تلقائياً</span>
            )}
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="text-sm font-medium text-pine-600 hover:underline"
            >
              معاينة
            </button>
          </span>
        </div>
        {isLegacyMarkdown ? (
          <>
            <textarea
              id="content"
              value={form.content}
              onChange={(event) => updateField('content', event.target.value)}
              placeholder="اكتب محتوى مقالك هنا..."
              rows={12}
              className="w-full resize-y rounded-xl border border-stone-200 bg-transparent px-4 py-3 font-mono text-sm text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
            />
            <p className="mt-2 text-xs leading-relaxed text-stone-400">
              مقال قديم بصيغة Markdown: **عريض**، *مائل*، عنوان بـ{' '}
              <span dir="ltr">## نص</span>، صورة بـ <span dir="ltr">![وصف](رابط)</span>. المقالات
              الجديدة تستخدم محرراً بأدوات جاهزة بدل هذه الاختصارات.
            </p>
          </>
        ) : (
          <RichTextEditor
            content={form.content}
            onChange={(html) => updateField('content', html)}
          />
        )}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="seriesName" className="mb-2 block text-sm font-medium text-ink">
            اسم السلسلة (اختياري)
          </label>
          <input
            id="seriesName"
            type="text"
            value={form.seriesName}
            onChange={(event) => updateField('seriesName', event.target.value)}
            placeholder="رحلتي إلى اليابان"
            className="w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
          />
        </div>
        <div>
          <label htmlFor="seriesOrder" className="mb-2 block text-sm font-medium text-ink">
            ترتيبه في السلسلة
          </label>
          <input
            id="seriesOrder"
            type="number"
            min="1"
            value={form.seriesOrder}
            onChange={(event) => updateField('seriesOrder', event.target.value)}
            placeholder="1"
            className="w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
          />
        </div>
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
            {compressing ? 'جارٍ ضغط الصورة...' : 'اضغط لرفع صورة جديدة'}
          </label>
          <button
            type="button"
            onClick={() => setShowImagePicker(true)}
            className="h-full shrink-0 rounded-xl border border-stone-200 px-4 py-6 text-sm text-stone-500 transition hover:border-pine-400 hover:text-pine-600 dark:border-stone-600"
          >
            من المكتبة
          </button>
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

      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(event) => setIsPinned(event.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-pine-600 focus:ring-pine-500"
        />
        <span className="text-sm font-medium text-ink">تثبيت المقال أعلى الصفحة الرئيسية</span>
      </label>

      <div>
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={passwordProtected}
            onChange={(event) => setPasswordProtected(event.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-pine-600 focus:ring-pine-500"
          />
          <span className="text-sm font-medium text-ink">حماية المقال بكلمة مرور</span>
        </label>

        {passwordProtected && (
          <>
            <input
              type="password"
              value={lockPassword}
              onChange={(event) => setLockPassword(event.target.value)}
              placeholder={
                initialData?.password_protected
                  ? 'أعد إدخال كلمة المرور لحفظها (لتغييرها اكتب كلمة جديدة)'
                  : 'كلمة المرور'
              }
              className="mt-3 w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
            />
            <p className="mt-2 text-xs text-stone-400">
              يُشفَّر نص المقال فعلياً بهذه الكلمة — لا نحتفظ بها، فلا يمكن استرجاعها إن نسيتها.
              العنوان والصورة يبقيان ظاهرين في القائمة، والنص فقط محمي.
            </p>
          </>
        )}
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

      {showImagePicker && (
        <ImagePicker onSelect={handleLibrarySelect} onClose={() => setShowImagePicker(false)} />
      )}
    </form>
  )
}
