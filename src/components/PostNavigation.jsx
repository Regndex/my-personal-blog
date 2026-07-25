import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function PostNavigation({ currentPost }) {
  const [prevPost, setPrevPost] = useState(null)
  const [nextPost, setNextPost] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadNeighbors() {
      const [olderResult, newerResult] = await Promise.all([
        supabase
          .from('posts')
          .select('id, title, slug')
          .lt('published_at', currentPost.published_at)
          .order('published_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('posts')
          .select('id, title, slug')
          .gt('published_at', currentPost.published_at)
          .order('published_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ])

      if (!isMounted) return
      setPrevPost(olderResult.data)
      setNextPost(newerResult.data)
    }

    if (currentPost.published_at) loadNeighbors()
    return () => {
      isMounted = false
    }
  }, [currentPost.id, currentPost.published_at])

  if (!prevPost && !nextPost) return null

  return (
    <nav className="mt-10 grid grid-cols-1 gap-3 border-t border-stone-200 pt-8 sm:grid-cols-2 dark:border-stone-700">
      {nextPost ? (
        <Link
          to={`/post/${nextPost.slug || nextPost.id}`}
          className="group rounded-2xl border border-stone-200/80 bg-white p-4 transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-surface"
        >
          <span className="mb-1 block text-xs text-stone-400">التالي</span>
          <span className="font-bold text-ink group-hover:text-pine-600">{nextPost.title}</span>
        </Link>
      ) : (
        <div />
      )}

      {prevPost && (
        <Link
          to={`/post/${prevPost.slug || prevPost.id}`}
          className="group rounded-2xl border border-stone-200/80 bg-white p-4 transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-surface"
        >
          <span className="mb-1 block text-xs text-stone-400">السابق</span>
          <span className="font-bold text-ink group-hover:text-pine-600">{prevPost.title}</span>
        </Link>
      )}
    </nav>
  )
}
