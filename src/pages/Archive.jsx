import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import LoadingSpinner from '../components/LoadingSpinner'

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

export default function Archive() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadPosts() {
      const { data } = await supabase
        .from('posts')
        .select('id, title, published_at')
        .order('published_at', { ascending: false })

      if (isMounted) {
        setPosts(data || [])
        setLoading(false)
      }
    }

    loadPosts()
    return () => {
      isMounted = false
    }
  }, [])

  const groups = useMemo(() => {
    const map = new Map()
    posts.forEach((post) => {
      const date = new Date(post.published_at)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      if (!map.has(key)) {
        map.set(key, { year: date.getFullYear(), month: date.getMonth(), posts: [] })
      }
      map.get(key).posts.push(post)
    })
    return Array.from(map.values())
  }, [posts])

  if (loading) {
    return <LoadingSpinner label="جارٍ تحميل الأرشيف..." />
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <h1 className="font-display mb-8 text-3xl font-medium text-ink">الأرشيف</h1>

      {groups.length === 0 && <p className="text-stone-400">لا توجد مقالات بعد.</p>}

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={`${group.year}-${group.month}`}>
            <h2 className="mb-3 text-sm font-bold text-gold-600">
              {MONTH_NAMES[group.month]} {group.year}
              <span className="ms-2 font-normal text-stone-400">
                ({group.posts.length} {group.posts.length === 1 ? 'مقال' : 'مقالات'})
              </span>
            </h2>
            <ul className="space-y-2">
              {group.posts.map((post) => (
                <li key={post.id}>
                  <Link
                    to={`/post/${post.id}`}
                    className="text-ink transition-colors hover:text-pine-600"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
