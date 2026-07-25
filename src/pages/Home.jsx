import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import PostCard from '../components/PostCard'
import SearchBar from '../components/SearchBar'
import TagPills from '../components/TagPills'
import Pagination from '../components/Pagination'
import LoadingSpinner from '../components/LoadingSpinner'

const POSTS_PER_PAGE = 9

export default function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let isMounted = true

    async function fetchPosts() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .order('published_at', { ascending: false })

      if (!isMounted) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setPosts(data || [])
      }
      setLoading(false)
    }

    fetchPosts()
    return () => {
      isMounted = false
    }
  }, [])

  const allTags = useMemo(() => {
    const set = new Set()
    posts.forEach((post) => post.tags?.forEach((tag) => set.add(tag)))
    return Array.from(set)
  }, [posts])

  const filteredPosts = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    const filtered = posts.filter((post) => {
      const matchesQuery =
        !trimmed ||
        post.title?.toLowerCase().includes(trimmed) ||
        post.content?.toLowerCase().includes(trimmed)
      const matchesTag = !activeTag || post.tags?.includes(activeTag)
      return matchesQuery && matchesTag
    })

    // Pinned posts always float to the top; within each group the existing
    // published_at-desc order (from the initial fetch) is preserved.
    return [...filtered].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
  }, [posts, query, activeTag])

  // Any change to the search/tag filter should snap back to page 1 —
  // otherwise you could land on an empty page 3 after narrowing results.
  useEffect(() => {
    setPage(1)
  }, [query, activeTag])

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE))
  const pagePosts = filteredPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-10 text-center">
        <h1 className="font-display mb-3 text-3xl font-medium text-ink sm:text-4xl">
          أحدث المقالات
        </h1>
        <p className="mx-auto max-w-xl text-stone-500">
          أفكار وتجارب وقصص أشاركها معكم بين الحين والآخر
        </p>
      </div>

      <div className="mx-auto mb-6 max-w-md">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {allTags.length > 0 && (
        <div className="mb-10 flex justify-center">
          <TagPills tags={allTags} activeTag={activeTag} onSelect={setActiveTag} size="md" />
        </div>
      )}

      {loading && <LoadingSpinner label="جارٍ تحميل المقالات..." />}

      {!loading && error && (
        <div className="mx-auto max-w-md rounded-xl border border-red-100 bg-red-50 p-4 text-center text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          تعذر تحميل المقالات: {error}
        </div>
      )}

      {!loading && !error && filteredPosts.length === 0 && (
        <div className="py-16 text-center text-stone-400">
          {query || activeTag
            ? 'لا توجد نتائج مطابقة'
            : 'لا توجد مقالات بعد — ابدأ بنشر أول مقال من لوحة التحكم'}
        </div>
      )}

      {!loading && !error && filteredPosts.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pagePosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
