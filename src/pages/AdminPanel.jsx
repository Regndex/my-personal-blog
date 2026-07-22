import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, BLOG_IMAGES_BUCKET } from '../lib/supabaseClient'
import { compressImage } from '../utils/imageCompression'
import { useAuth } from '../lib/AuthContext'
import Login from '../components/Login'
import LoadingSpinner from '../components/LoadingSpinner'

const initialForm = { title: '', content: '', videoUrl: '' }

export default function AdminPanel() {
  const navigate = useNavigate()
  const { user, loading: authLoading, signOut } = useAuth()

  const [form, setForm] = useState(initialForm)
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [imageInfo, setImageInfo] = useState(null)

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

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    if (!form.title.trim() || !form.content.trim()) {
      setError('العنوان ونص المقال حقلان مطلوبان')
      return
    }

    setSubmitting(true)

    try {
      let imageUrl = null

      // 1) Upload the (already-compressed) cover image to Storage, if provided
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

      // 2) Insert the post row
      const { error: insertError } = await supabase.from('posts').insert({
        title: form.title.trim(),
        content: form.content.trim(),
        image_url: imageUrl,
        video_url: form.videoUrl.trim() || null,
      })

      if (insertError) throw insertError

      setSuccess(true)
      setForm(initialForm)
      setImageFile(null)
      setPreviewUrl(null)
      setImageInfo(null)

      setTimeout(() => navigate('/'), 1200)
    } catch (err) {
      setError('حدث خطأ أثناء نشر المقال: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return <LoadingSpinner label="جارٍ التحقق من الجلسة..." />
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display mb-2 text-2xl font-medium text-ink sm:text-3xl">
            إضافة مقال جديد
          </h1>
          <p className="text-stone-500">شارك أفكارك مع القراء بخطوات بسيطة</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-red-600"
        >
          تسجيل الخروج
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8"
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
            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
          />
        </div>

        <div>
          <label htmlFor="content" className="mb-2 block text-sm font-medium text-ink">
            نص المقال
          </label>
          <textarea
            id="content"
            value={form.content}
            onChange={(event) => updateField('content', event.target.value)}
            placeholder="اكتب محتوى مقالك هنا..."
            rows={10}
            className="w-full resize-y rounded-xl border border-stone-200 px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
          />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-ink">صورة الغلاف</span>
          <div className="flex items-center gap-4">
            <label className="flex-1 cursor-pointer rounded-xl border-2 border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500 transition hover:border-pine-400 hover:text-pine-600">
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
                className="h-20 w-20 shrink-0 rounded-xl border border-stone-200 object-cover"
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
            رابط فيديو (اختياري)
          </label>
          <input
            id="videoUrl"
            type="url"
            value={form.videoUrl}
            onChange={(event) => updateField('videoUrl', event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-pine-100 bg-pine-50 px-4 py-3 text-sm text-pine-700">
            تم نشر المقال بنجاح! جارٍ التوجيه إلى الصفحة الرئيسية...
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || compressing}
          className="w-full rounded-xl bg-pine-500 px-6 py-3.5 font-medium text-paper transition-colors hover:bg-pine-600 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {submitting ? 'جارٍ النشر...' : 'نشر المقال'}
        </button>
      </form>
    </div>
  )
}
