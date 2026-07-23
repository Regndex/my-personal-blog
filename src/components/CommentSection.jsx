import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../utils/formatDate'

function CommentForm({ onSubmit, submitting, error, placeholder = 'اكتب تعليقك...', autoFocus }) {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  // Honeypot: a field real visitors never see or fill. Bots that blindly
  // fill every input tend to fill it, which flags the submission as spam.
  const [website, setWebsite] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim() || !content.trim()) return
    onSubmit({ name: name.trim(), content: content.trim(), honeypot: website }, () => {
      setName('')
      setContent('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="اسمك"
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-stone-200 bg-transparent px-4 py-2.5 text-sm text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
      />
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-y rounded-xl border border-stone-200 bg-transparent px-4 py-2.5 text-sm text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
      />
      {/* Honeypot field: visually hidden (not display:none, which some bots
          detect and skip) and never reachable by tab, so real people never
          interact with it. */}
      <input
        type="text"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-px w-px overflow-hidden opacity-0"
        style={{ clip: 'rect(0,0,0,0)' }}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-pine-500 px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-pine-600 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {submitting ? 'جارٍ الإرسال...' : 'إرسال التعليق'}
      </button>
    </form>
  )
}

function CommentItem({ comment, replies, replyingTo, setReplyingTo, submitReply, replySubmitting }) {
  return (
    <div>
      <div className="rounded-2xl border border-stone-200/70 bg-white p-4 dark:border-stone-700 dark:bg-surface">
        <div className="mb-1.5 flex items-baseline gap-2">
          <span className="text-sm font-bold text-ink">{comment.author_name}</span>
          <span className="text-xs text-stone-400">{formatDate(comment.created_at)}</span>
        </div>
        {/* Comment text is rendered as plain text on purpose — unlike post
            content, this is untrusted visitor input, never Markdown/HTML. */}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          {comment.content}
        </p>
        <button
          type="button"
          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
          className="mt-2 text-xs font-medium text-pine-600 hover:underline"
        >
          {replyingTo === comment.id ? 'إلغاء' : 'رد'}
        </button>
      </div>

      {replyingTo === comment.id && (
        <div className="ms-6 mt-3 rounded-2xl border border-stone-200/70 bg-white p-4 dark:border-stone-700 dark:bg-surface">
          <CommentForm
            onSubmit={(data, reset) => submitReply(comment.id, data, reset)}
            submitting={replySubmitting}
            placeholder="اكتب ردك..."
            autoFocus
          />
        </div>
      )}

      {replies.length > 0 && (
        <div className="ms-6 mt-3 space-y-3">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="rounded-2xl border border-stone-200/70 bg-white p-4 dark:border-stone-700 dark:bg-surface"
            >
              <div className="mb-1.5 flex items-baseline gap-2">
                <span className="text-sm font-bold text-ink">{reply.author_name}</span>
                <span className="text-xs text-stone-400">{formatDate(reply.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                {reply.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentSection({ postId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const mountedAt = useRef(Date.now())

  useEffect(() => {
    let isMounted = true

    async function loadComments() {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (isMounted) {
        setComments(data || [])
        setLoading(false)
      }
    }

    loadComments()
    return () => {
      isMounted = false
    }
  }, [postId])

  const { topLevel, repliesByParent } = useMemo(() => {
    const top = []
    const byParent = new Map()
    comments.forEach((comment) => {
      if (comment.parent_comment_id) {
        if (!byParent.has(comment.parent_comment_id)) byParent.set(comment.parent_comment_id, [])
        byParent.get(comment.parent_comment_id).push(comment)
      } else {
        top.push(comment)
      }
    })
    return { topLevel: top, repliesByParent: byParent }
  }, [comments])

  async function insertComment({ name, content, honeypot }, parentId, reset) {
    setError(null)

    // Silently drop obvious bot submissions instead of erroring — showing
    // an error would just teach a bot to leave the honeypot field alone.
    const secondsSinceLoad = (Date.now() - mountedAt.current) / 1000
    if (honeypot || secondsSinceLoad < 2) {
      reset?.()
      setJustSubmitted(true)
      return
    }

    setSubmitting(true)
    try {
      const { error: insertError } = await supabase.from('comments').insert({
        post_id: postId,
        author_name: name,
        content,
        is_approved: false,
        parent_comment_id: parentId || null,
      })
      if (insertError) throw insertError

      reset?.()
      setJustSubmitted(true)
      setReplyingTo(null)
    } catch (err) {
      setError('تعذر إرسال التعليق: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-14 border-t border-stone-200 pt-10 dark:border-stone-700">
      <h2 className="font-display mb-6 text-xl font-medium text-ink">
        التعليقات{!loading && topLevel.length > 0 ? ` (${comments.length})` : ''}
      </h2>

      {!loading && topLevel.length === 0 && (
        <p className="mb-8 text-sm text-stone-400">لا توجد تعليقات بعد — كن أول من يعلّق.</p>
      )}

      {topLevel.length > 0 && (
        <div className="mb-10 space-y-4">
          {topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={repliesByParent.get(comment.id) || []}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              submitReply={(parentId, data, reset) => insertComment(data, parentId, reset)}
              replySubmitting={submitting}
            />
          ))}
        </div>
      )}

      {justSubmitted ? (
        <div className="rounded-xl border border-pine-100 bg-pine-50 px-4 py-3 text-sm text-pine-700 dark:border-pine-500/20 dark:bg-pine-500/10 dark:text-pine-400">
          شكراً لك! تعليقك بانتظار المراجعة وسيظهر بعد الموافقة عليه.
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-700 dark:bg-surface">
          <h3 className="mb-3 text-sm font-bold text-ink">أضف تعليقاً</h3>
          <CommentForm
            onSubmit={(data, reset) => insertComment(data, null, reset)}
            submitting={submitting}
            error={error}
          />
        </div>
      )}
    </section>
  )
}
