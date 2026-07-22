/**
 * Renders a row of tag pills. Pass `onSelect` to make them clickable filters
 * (used on the Home page); omit it for plain read-only display (post cards,
 * the article header) — clicking the active tag again clears the filter.
 */
export default function TagPills({ tags, activeTag, onSelect, size = 'sm' }) {
  if (!tags || tags.length === 0) return null

  const clickable = typeof onSelect === 'function'
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const isActive = activeTag === tag
        const className = `rounded-full font-medium transition-colors ${sizeClasses} ${
          isActive
            ? 'bg-pine-500 text-paper'
            : `bg-gold-50 text-gold-600 ${clickable ? 'hover:bg-gold-100' : ''}`
        }`

        if (!clickable) {
          return (
            <span key={tag} className={className}>
              {tag}
            </span>
          )
        }

        return (
          <button
            key={tag}
            type="button"
            onClick={() => onSelect(isActive ? null : tag)}
            className={className}
          >
            {tag}
          </button>
        )
      })}
    </div>
  )
}
