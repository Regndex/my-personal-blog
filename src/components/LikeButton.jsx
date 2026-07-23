import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const STORAGE_KEY = 'liked-posts'

function getLikedPosts() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export default function LikeButton({ postId, initialCount }) {
  const [count, setCount] = useState(initialCount || 0)
  const [liked, setLiked] = useState(() => getLikedPosts().includes(postId))
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    if (liked || busy) return

    setBusy(true)
    setLiked(true)
    setCount((prev) => prev + 1)

    const { error } = await supabase.rpc('increment_post_likes', { post_id: postId })

    if (error) {
      // Roll back on failure — RLS/network issue, so don't remember it as liked.
      setLiked(false)
      setCount((prev) => prev - 1)
    } else {
      const liked_posts = getLikedPosts()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...liked_posts, postId]))
    }
    setBusy(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={liked || busy}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        liked
          ? 'bg-pine-50 text-pine-700 dark:bg-pine-500/15 dark:text-pine-400'
          : 'bg-stone-100 text-stone-500 hover:bg-pine-50 hover:text-pine-600 dark:bg-white/5 dark:hover:bg-pine-500/10'
      }`}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 21s-7.5-4.6-10-9.3C.5 8.4 2.4 5 6 5c2 0 3.5 1 6 3.3C14.5 6 16 5 18 5c3.6 0 5.5 3.4 4 6.7C19.5 16.4 12 21 12 21z" />
      </svg>
      {count > 0 ? count : ''} إعجاب
    </button>
  )
}
