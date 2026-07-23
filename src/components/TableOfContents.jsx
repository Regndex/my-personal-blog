export default function TableOfContents({ headings }) {
  if (!headings || headings.length < 2) return null

  function handleClick(event, id) {
    event.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="mb-10 rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-700 dark:bg-surface">
      <p className="mb-3 text-sm font-bold text-ink">المحتويات</p>
      <ul className="space-y-2 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} style={{ paddingInlineStart: `${(heading.level - 2) * 1}rem` }}>
            <a
              href={`#${heading.id}`}
              onClick={(event) => handleClick(event, heading.id)}
              className="text-stone-500 transition-colors hover:text-pine-600 dark:text-stone-400 dark:hover:text-pine-400"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
