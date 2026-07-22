import { Link } from 'react-router-dom'
import { formatDate } from '../utils/formatDate'
import { getExcerpt } from '../utils/excerpt'

export default function PostCard({ post }) {
  return (
    <Link
      to={`/post/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg"
    >
      <div className="aspect-[16/10] overflow-hidden bg-stone-100">
        {post.image_url ? (
          <img
            src={post.image_url}
            alt={post.title}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-stone-300">
            بدون صورة
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <span className="mb-2 text-xs font-medium tracking-wide text-gold-600">
          {formatDate(post.created_at)}
        </span>
        <h2 className="mb-2 line-clamp-2 text-lg font-bold text-ink transition-colors group-hover:text-pine-600">
          {post.title}
        </h2>
        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-stone-500">
          {getExcerpt(post.content)}
        </p>
      </div>
    </Link>
  )
}
