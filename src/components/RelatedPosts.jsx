import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../utils/formatDate'

export default function RelatedPosts({ currentPost }) {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    let isMounted = true

    async function loadRelated() {
      let query = supabase
        .from('posts')
        .select('id, title, image_url, created_at, tags')
        .neq('id', currentPost.id)
        .limit(3)

      // Prefer posts sharing at least one tag; fall back to latest posts
      // otherwise, so this section always has something useful to show.
      query =
        currentPost.tags?.length > 0
          ? query.overlaps('tags', currentPost.tags)
          : query.order('created_at', { ascending: false })

      const { data } = await query
      let related = data || []

      if (related.length === 0 && currentPost.tags?.length > 0) {
        const fallback = await supabase
          .from('posts')
          .select('id, title, image_url, created_at, tags')
          .neq('id', currentPost.id)
          .order('created_at', { ascending: false })
          .limit(3)
        related = fallback.data || []
      }

      if (isMounted) setPosts(related)
    }

    loadRelated()
    return () => {
      isMounted = false
    }
  }, [currentPost.id, currentPost.tags])

  if (posts.length === 0) return null

  return (
    <section className="mt-14 border-t border-stone-200 pt-10 dark:border-stone-700">
      <h2 className="font-display mb-5 text-xl font-medium text-ink">مقالات ذات صلة</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/post/${post.id}`}
            className="group overflow-hidden rounded-2xl border border-stone-200/80 bg-white transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-surface"
          >
            <div className="aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800">
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt={post.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </div>
            <div className="p-3.5">
              <p className="mb-1 text-xs text-gold-600">{formatDate(post.created_at)}</p>
              <p className="line-clamp-2 text-sm font-bold text-ink group-hover:text-pine-600">
                {post.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
