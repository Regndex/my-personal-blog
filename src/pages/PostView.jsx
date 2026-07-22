import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../utils/formatDate'
import VideoEmbed from '../components/VideoEmbed'
import LoadingSpinner from '../components/LoadingSpinner'

export default function PostView() {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function fetchPost() {
      setLoading(true)
      setNotFound(false)

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!isMounted) return

      if (error || !data) {
        setNotFound(true)
      } else {
        setPost(data)
      }
      setLoading(false)
    }

    fetchPost()
    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return <LoadingSpinner label="جارٍ تحميل المقال..." />
  }

  if (notFound || !post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="mb-6 text-stone-500">تعذر العثور على هذا المقال.</p>
        <Link to="/" className="font-medium text-pine-600 hover:underline">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-pine-600"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
        العودة للمقالات
      </Link>

      {post.image_url && (
        <div className="mb-8 overflow-hidden rounded-2xl bg-stone-100">
          <img
            src={post.image_url}
            alt={post.title}
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
            className="max-h-[480px] w-full object-cover"
          />
        </div>
      )}

      <header className="mb-8">
        <p className="mb-3 text-sm font-medium tracking-wide text-gold-600">
          {formatDate(post.created_at)}
        </p>
        <h1 className="text-2xl font-bold leading-snug text-ink sm:text-3xl lg:text-4xl">
          {post.title}
        </h1>
      </header>

      <div className="font-serif whitespace-pre-wrap text-[17px] leading-8 text-ink/90">
        {post.content}
      </div>

      {post.video_url && (
        <div className="mt-10">
          <VideoEmbed url={post.video_url} />
        </div>
      )}
    </article>
  )
}
