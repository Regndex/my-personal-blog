import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, BLOG_IMAGES_BUCKET } from '../../lib/supabaseClient'
import { formatDate } from '../../utils/formatDate'
import LoadingSpinner from '../../components/LoadingSpinner'

function getStatus(publishedAt) {
  if (!publishedAt) return { label: 'مسودة', className: 'bg-stone-100 text-stone-500 dark:bg-white/10 dark:text-stone-400' }
  if (new Date(publishedAt) > new Date()) {
    return { label: 'مجدول', className: 'bg-gold-50 text-gold-600 dark:bg-gold-50/10' }
  }
  return { label: 'منشور', className: 'bg-pine-50 text-pine-700 dark:bg-pine-500/15 dark:text-pine-400' }
}

export default function ManagePosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulkTag, setBulkTag] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)

  async function loadPosts() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else setPosts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadPosts()
  }, [])

  async function deletePostRow(post) {
    if (post.image_url) {
      const path = post.image_url.split(`${BLOG_IMAGES_BUCKET}/`).pop()
      if (path) {
        await supabase.storage.from(BLOG_IMAGES_BUCKET).remove([path]).catch(() => {})
      }
    }
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id)
    if (deleteError) throw deleteError
  }

  async function handleDelete(post) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف "${post.title}"؟ لا يمكن التراجع عن هذا الإجراء.`
    )
    if (!confirmed) return

    setBusyId(post.id)
    try {
      await deletePostRow(post)
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    } catch (err) {
      window.alert('تعذر حذف المقال: ' + err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleTogglePin(post) {
    setBusyId(post.id)
    const { error: updateError } = await supabase
      .from('posts')
      .update({ is_pinned: !post.is_pinned })
      .eq('id', post.id)

    if (!updateError) {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p))
      )
    }
    setBusyId(null)
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === posts.length ? new Set() : new Set(posts.map((p) => p.id))))
  }

  async function handleBulkDelete() {
    const confirmed = window.confirm(`حذف ${selected.size} مقال نهائياً؟ لا يمكن التراجع عن هذا.`)
    if (!confirmed) return

    setBulkBusy(true)
    const targets = posts.filter((p) => selected.has(p.id))
    for (const post of targets) {
      try {
        await deletePostRow(post)
      } catch {
        /* keep going even if one fails, report at the end */
      }
    }
    setPosts((prev) => prev.filter((p) => !selected.has(p.id)))
    setSelected(new Set())
    setBulkBusy(false)
  }

  async function handleBulkAddTag() {
    const tag = bulkTag.trim()
    if (!tag) return

    setBulkBusy(true)
    const targets = posts.filter((p) => selected.has(p.id))
    for (const post of targets) {
      const nextTags = post.tags?.includes(tag) ? post.tags : [...(post.tags || []), tag]
      await supabase.from('posts').update({ tags: nextTags }).eq('id', post.id)
    }
    await loadPosts()
    setSelected(new Set())
    setBulkTag('')
    setBulkBusy(false)
  }

  if (loading) {
    return <LoadingSpinner label="جارٍ تحميل المقالات..." />
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">إدارة المقالات</h1>
        {posts.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            <input
              type="checkbox"
              checked={selected.size === posts.length}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-stone-300 text-pine-600 focus:ring-pine-500"
            />
            تحديد الكل
          </label>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!error && posts.length === 0 && (
        <p className="text-stone-400">لا توجد مقالات بعد.</p>
      )}

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-pine-100 bg-pine-50 px-4 py-3 dark:border-pine-500/20 dark:bg-pine-500/10">
          <span className="text-sm font-medium text-pine-700 dark:text-pine-400">
            {selected.size} محدّد
          </span>
          <input
            type="text"
            value={bulkTag}
            onChange={(event) => setBulkTag(event.target.value)}
            placeholder="إضافة وسم للمحدد..."
            className="min-w-0 flex-1 rounded-full border border-pine-200 bg-white px-3 py-1.5 text-sm dark:border-pine-500/30 dark:bg-surface"
          />
          <button
            type="button"
            onClick={handleBulkAddTag}
            disabled={bulkBusy || !bulkTag.trim()}
            className="shrink-0 rounded-full bg-pine-500 px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
          >
            إضافة
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={bulkBusy}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
          >
            حذف المحدد
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {posts.map((post) => {
          const status = getStatus(post.published_at)
          return (
            <li
              key={post.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-surface"
            >
              <input
                type="checkbox"
                checked={selected.has(post.id)}
                onChange={() => toggleSelected(post.id)}
                className="h-4 w-4 shrink-0 rounded border-stone-300 text-pine-600 focus:ring-pine-500"
              />

              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
                {post.image_url && (
                  <img src={post.image_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                  {post.is_pinned && (
                    <span className="rounded-full bg-gold-50 px-2.5 py-0.5 text-xs font-medium text-gold-600 dark:bg-gold-50/10">
                      مثبّت
                    </span>
                  )}
                </div>
                <p className="truncate font-bold text-ink">{post.title}</p>
                <p className="text-xs text-stone-400">
                  {formatDate(post.published_at || post.created_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleTogglePin(post)}
                disabled={busyId === post.id}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-gold-600 transition-colors hover:bg-gold-50 disabled:opacity-50 dark:hover:bg-gold-50/10"
              >
                {post.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
              </button>
              <Link
                to={`/admin/posts/${post.id}/edit`}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-pine-600 transition-colors hover:bg-pine-50 dark:hover:bg-pine-500/10"
              >
                تعديل
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(post)}
                disabled={busyId === post.id}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
              >
                {busyId === post.id ? 'جارٍ...' : 'حذف'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
