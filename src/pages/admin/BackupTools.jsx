import { useState } from 'react'
import JSZip from 'jszip'
import { supabase } from '../../lib/supabaseClient'
import { generateUniqueSlug } from '../../utils/slug'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function postFrontmatter(post) {
  const lines = [
    '---',
    `title: "${(post.title || '').replace(/"/g, '\\"')}"`,
    `date: ${post.published_at || post.created_at}`,
    `tags: [${(post.tags || []).map((t) => `"${t}"`).join(', ')}]`,
    post.image_url ? `image: ${post.image_url}` : null,
    '---',
    '',
  ].filter(Boolean)
  return lines.join('\n')
}

export default function BackupTools() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState(null)
  const [pendingImport, setPendingImport] = useState(null)
  const [message, setMessage] = useState(null)

  async function fetchAllPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  }

  async function handleExportJson() {
    setExporting(true)
    setMessage(null)
    try {
      const posts = await fetchAllPosts()
      const blob = new Blob([JSON.stringify(posts, null, 2)], { type: 'application/json' })
      downloadBlob(blob, `blog-backup-${new Date().toISOString().slice(0, 10)}.json`)
    } catch (err) {
      setMessage({ type: 'error', text: 'تعذر التصدير: ' + err.message })
    } finally {
      setExporting(false)
    }
  }

  async function handleExportMarkdown() {
    setExporting(true)
    setMessage(null)
    try {
      const posts = await fetchAllPosts()
      const zip = new JSZip()

      posts.forEach((post) => {
        const safeName = (post.slug || post.id).slice(0, 60)
        const body = post.password_protected
          ? '(محتوى محمي بكلمة مرور — غير مُصدَّر كنص واضح)'
          : post.content || ''
        zip.file(`${safeName}.md`, postFrontmatter(post) + body)
      })

      const blob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(blob, `blog-backup-markdown-${new Date().toISOString().slice(0, 10)}.zip`)
    } catch (err) {
      setMessage({ type: 'error', text: 'تعذر التصدير: ' + err.message })
    } finally {
      setExporting(false)
    }
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setMessage(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result)
        if (!Array.isArray(parsed)) throw new Error('الملف ليس بالتنسيق الصحيح (يجب أن يكون مصفوفة)')
        setPendingImport(parsed)
      } catch (err) {
        setMessage({ type: 'error', text: 'تعذرت قراءة الملف: ' + err.message })
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  async function confirmImport() {
    if (!pendingImport) return
    setImporting(true)
    setMessage(null)

    let success = 0
    let failed = 0

    for (const post of pendingImport) {
      try {
        const slug = post.slug || (await generateUniqueSlug(post.title || 'مقال'))
        // Preserves the original id when present (round-trip restore keeps
        // old links intact); upsert so re-importing the same backup twice
        // safely overwrites rather than erroring on a duplicate id.
        const { error } = await supabase.from('posts').upsert(
          {
            ...post,
            slug,
            likes_count: post.likes_count || 0,
            views_count: post.views_count || 0,
          },
          { onConflict: 'id' }
        )
        if (error) throw error
        success += 1
      } catch {
        failed += 1
      }
    }

    setImportSummary({ success, failed })
    setPendingImport(null)
    setImporting(false)
  }

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl font-medium text-ink sm:text-3xl">
        نسخ احتياطي
      </h1>
      <p className="mb-8 text-stone-500">صدّر مقالاتك كملف احتياطي، أو استوردها من نسخة سابقة</p>

      <div className="mb-6 rounded-2xl border border-stone-200/80 bg-white p-6 dark:border-stone-700 dark:bg-surface">
        <h2 className="mb-1 font-bold text-ink">تصدير</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          ملف JSON مناسب للنسخ الاحتياطي والاستيراد لاحقاً، أو ملفات Markdown منفصلة إن أردت
          نقل المحتوى لمنصة أخرى.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            disabled={exporting}
            className="rounded-full bg-pine-500 px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-pine-600 disabled:opacity-50"
          >
            {exporting ? 'جارٍ التصدير...' : 'تصدير JSON'}
          </button>
          <button
            type="button"
            onClick={handleExportMarkdown}
            disabled={exporting}
            className="rounded-full border border-stone-200 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:hover:bg-white/5"
          >
            {exporting ? 'جارٍ التصدير...' : 'تصدير Markdown (.zip)'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/80 bg-white p-6 dark:border-stone-700 dark:bg-surface">
        <h2 className="mb-1 font-bold text-ink">استيراد</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          يقبل فقط ملف JSON بنفس تنسيق التصدير أعلاه (استعادة نسخة احتياطية).
        </p>

        <label className="inline-block cursor-pointer rounded-full border border-stone-200 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-white/5">
          <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
          اختيار ملف JSON
        </label>

        {pendingImport && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold-400/40 bg-gold-50 px-4 py-3 text-sm dark:bg-gold-50/10">
            <span className="text-gold-600">
              تم العثور على {pendingImport.length} مقال. استيرادها الآن؟
            </span>
            <button
              type="button"
              onClick={confirmImport}
              disabled={importing}
              className="rounded-full bg-gold-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {importing ? 'جارٍ الاستيراد...' : 'تأكيد الاستيراد'}
            </button>
            <button
              type="button"
              onClick={() => setPendingImport(null)}
              className="rounded-full px-3 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 dark:hover:bg-white/10"
            >
              إلغاء
            </button>
          </div>
        )}

        {importSummary && (
          <p className="mt-4 text-sm text-pine-600">
            تم استيراد {importSummary.success} مقال بنجاح
            {importSummary.failed > 0 && `، وفشل ${importSummary.failed}`}.
          </p>
        )}
      </div>

      {message && (
        <p
          className={`mt-4 text-sm ${message.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-pine-600'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
