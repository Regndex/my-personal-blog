import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../utils/formatDate'
import { renderPostContent } from '../utils/markdown'
import { estimateReadingTime } from '../utils/readingTime'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { useStructuredData } from '../hooks/useStructuredData'
import { useSyntaxHighlight } from '../hooks/useSyntaxHighlight'
import VideoEmbed from '../components/VideoEmbed'
import LoadingSpinner from '../components/LoadingSpinner'
import TagPills from '../components/TagPills'
import CommentSection from '../components/CommentSection'
import TableOfContents from '../components/TableOfContents'
import ShareButtons from '../components/ShareButtons'
import LikeButton from '../components/LikeButton'
import RelatedPosts from '../components/RelatedPosts'
import PostNavigation from '../components/PostNavigation'
import SeriesNav from '../components/SeriesNav'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function PostView() {
  const { id: param } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const hasCountedView = useRef(false)
  const contentRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    async function fetchPost() {
      setLoading(true)
      setNotFound(false)

      // Supports both a UUID (old share links, before the slug feature
      // existed) and a readable slug (new links), so nothing already
      // shared ever breaks.
      const column = UUID_PATTERN.test(param) ? 'id' : 'slug'

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq(column, param)
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
  }, [param])

  // Count a view once per mount (not once per component instance re-render).
  useEffect(() => {
    if (post && !hasCountedView.current) {
      hasCountedView.current = true
      supabase.rpc('increment_post_views', { post_id: post.id })
    }
  }, [post])

  // Only ever run post *content* through the Markdown renderer — it's
  // written exclusively by the authenticated owner. Comments, by contrast,
  // are rendered as plain text elsewhere since they come from the public.
  const { html: contentHtml, headings } = useMemo(
    () => renderPostContent(post?.content),
    [post?.content]
  )
  const readingMinutes = useMemo(() => estimateReadingTime(post?.content), [post?.content])

  useDocumentMeta({
    title: post?.title,
    description: post?.content?.slice(0, 150),
    image: post?.image_url,
  })
  useStructuredData(post)
  useSyntaxHighlight(contentRef, contentHtml)

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
        <div className="mb-8 overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-800">
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
        <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium tracking-wide text-gold-600">
          <span>{formatDate(post.published_at || post.created_at)}</span>
          <span className="text-stone-300 dark:text-stone-600">·</span>
          <span>{readingMinutes} دقائق قراءة</span>
          {post.views_count > 0 && (
            <>
              <span className="text-stone-300 dark:text-stone-600">·</span>
              <span>{post.views_count} مشاهدة</span>
            </>
          )}
        </p>
        <h1 className="mb-4 text-2xl font-bold leading-snug text-ink sm:text-3xl lg:text-4xl">
          {post.title}
        </h1>
        <TagPills tags={post.tags} size="md" />
      </header>

      <SeriesNav seriesName={post.series_name} currentPostId={post.id} />
      <TableOfContents headings={headings} />

      <div
        ref={contentRef}
        className="post-content font-serif text-[17px] leading-8 text-ink/90"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {post.video_url && (
        <div className="mt-10">
          <VideoEmbed url={post.video_url} />
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-6 dark:border-stone-700">
        <LikeButton postId={post.id} initialCount={post.likes_count} />
        <ShareButtons title={post.title} url={window.location.href} />
      </div>

      <PostNavigation currentPost={post} />
      <RelatedPosts currentPost={post} />
      <CommentSection postId={post.id} />
    </article>
  )
}
