export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.35 4.35a7.5 7.5 0 0012.3 12.3z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="ابحث في العنوان أو النص..."
        className="w-full rounded-full border border-stone-200 bg-white py-3 ps-11 pe-4 text-ink placeholder:text-stone-400 transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600 dark:bg-surface"
      />
    </div>
  )
}
