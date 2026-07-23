import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import LoadingSpinner from '../../components/LoadingSpinner'

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-700 dark:bg-surface">
      <p className="mb-1 text-sm text-stone-500 dark:text-stone-400">{label}</p>
      <p className="font-display text-3xl text-ink">{value}</p>
    </div>
  )
}

export default function Stats() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [topPosts, setTopPosts] = useState([])

  useEffect(() => {
    let isMounted = true

    async function loadStats() {
      const [postsCountRes, publishedCountRes, commentsRes, topPostsRes] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .not('published_at', 'is', null)
          .lte('published_at', new Date().toISOString()),
        supabase.from('comments').select('is_approved'),
        supabase
          .from('posts')
          .select('id, title, views_count, likes_count')
          .order('views_count', { ascending: false })
          .limit(5),
      ])

      if (!isMounted) return

      const comments = commentsRes.data || []

      setStats({
        totalPosts: postsCountRes.count || 0,
        publishedPosts: publishedCountRes.count || 0,
        totalComments: comments.length,
        pendingComments: comments.filter((c) => !c.is_approved).length,
      })
      setTopPosts(topPostsRes.data || [])
      setLoading(false)
    }

    loadStats()
    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return <LoadingSpinner label="جارٍ حساب الإحصائيات..." />
  }

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-medium text-ink sm:text-3xl">الإحصائيات</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="إجمالي المقالات" value={stats.totalPosts} />
        <StatCard label="المقالات المنشورة" value={stats.publishedPosts} />
        <StatCard label="التعليقات" value={stats.totalComments} />
        <StatCard label="بانتظار الموافقة" value={stats.pendingComments} />
      </div>

      <h2 className="mb-3 text-sm font-bold text-ink">الأكثر مشاهدة</h2>
      {topPosts.length === 0 ? (
        <p className="text-sm text-stone-400">لا توجد بيانات كافية بعد.</p>
      ) : (
        <div className="space-y-2">
          {topPosts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between rounded-xl border border-stone-200/80 bg-white px-4 py-3 text-sm dark:border-stone-700 dark:bg-surface"
            >
              <span className="truncate font-medium text-ink">{post.title}</span>
              <span className="shrink-0 text-stone-400">
                {post.views_count || 0} مشاهدة · {post.likes_count || 0} إعجاب
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
