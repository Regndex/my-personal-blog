import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function SeriesNav({ seriesName, currentPostId }) {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    let isMounted = true

    async function loadSeries() {
      const { data } = await supabase
        .from('posts')
        .select('id, title, slug, series_order')
        .eq('series_name', seriesName)
        .order('series_order', { ascending: true })

      if (isMounted) setPosts(data || [])
    }

    if (seriesName) loadSeries()
    return () => {
      isMounted = false
    }
  }, [seriesName])

  if (!seriesName || posts.length < 2) return null

  return (
    <nav className="mb-10 rounded-2xl border border-gold-400/30 bg-gold-50/50 p-5 dark:bg-gold-50/5">
      <p className="mb-3 text-sm font-bold text-gold-600">سلسلة: {seriesName}</p>
      <ol className="space-y-2 text-sm">
        {posts.map((post, index) => (
          <li key={post.id}>
            {post.id === currentPostId ? (
              <span className="font-bold text-ink">
                {index + 1}. {post.title} (المقال الحالي)
              </span>
            ) : (
              <Link
                to={`/post/${post.slug || post.id}`}
                className="text-stone-600 transition-colors hover:text-pine-600 dark:text-stone-300"
              >
                {index + 1}. {post.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
