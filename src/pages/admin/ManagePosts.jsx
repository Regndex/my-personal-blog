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
  const [deletingId, setDeletingId] = useState(null)

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

  async function handleDelete(post) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف "${post.title}"؟ لا يمكن التراجع عن هذا الإجراء.`
    )
    if (!confirmed) return

    setDeletingId(post.id)
    try {
      // Best-effort cleanup of the associated cover image — never blocks
      // the actual post deletion if it fails for any reason.
      if (post.image_url) {
        const path = post.image_url.split(`${BLOG_IMAGES_BUCKET}/`).pop()
        if (path) {
          await supabase.storage.from(BLOG_IMAGES_BUCKET).remove([path]).catch(() => {})
        }
      }

      const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id)
      if (deleteError) throw deleteError

      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    } catch (err) {
      window.alert('تعذر حذف المقال: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <LoadingSpinner label="جارٍ تحميل المقالات..." />
  }

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-medium text-ink sm:text-3xl">
        إدارة المقالات
      </h1>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!error && posts.length === 0 && (
        <p className="text-stone-400">لا توجد مقالات بعد.</p>
      )}

      <ul className="space-y-3">
        {posts.map((post) => {
          const status = getStatus(post.published_at)
          return (
            <li
              key={post.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-surface"
            >
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
                </div>
                <p className="truncate font-bold text-ink">{post.title}</p>
                <p className="text-xs text-stone-400">
                  {formatDate(post.published_at || post.created_at)}
                </p>
              </div>

              <Link
                to={`/admin/posts/${post.id}/edit`}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-pine-600 transition-colors hover:bg-pine-50 dark:hover:bg-pine-500/10"
              >
                تعديل
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(post)}
                disabled={deletingId === post.id}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
              >
                {deletingId === post.id ? 'جارٍ الحذف...' : 'حذف'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
