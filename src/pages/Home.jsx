import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import PostCard from '../components/PostCard'
import SearchBar from '../components/SearchBar'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let isMounted = true

    async function fetchPosts() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

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

  const filteredPosts = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return posts
    return posts.filter((post) => post.title?.toLowerCase().includes(trimmed))
  }, [posts, query])

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

      <div className="mx-auto mb-10 max-w-md">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {loading && <LoadingSpinner label="جارٍ تحميل المقالات..." />}

      {!loading && error && (
        <div className="mx-auto max-w-md rounded-xl border border-red-100 bg-red-50 p-4 text-center text-red-600">
          تعذر تحميل المقالات: {error}
        </div>
      )}

      {!loading && !error && filteredPosts.length === 0 && (
        <div className="py-16 text-center text-stone-400">
          {query
            ? 'لا توجد نتائج مطابقة لبحثك'
            : 'لا توجد مقالات بعد — ابدأ بنشر أول مقال من لوحة التحكم'}
        </div>
      )}

      {!loading && !error && filteredPosts.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
