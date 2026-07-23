import { useState } from 'react'

export default function ShareButtons({ title, url }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('انسخ الرابط:', url)
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-stone-500 dark:text-stone-400">شارك:</span>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="مشاركة عبر واتساب"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-pine-50 hover:text-pine-600 dark:bg-white/5 dark:hover:bg-pine-500/10"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-1.5-.7-2.4-1.3-3.4-2.9-.3-.4.3-.4.7-1.3.1-.2 0-.4 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.1-.3-.2-.5-.3z" />
          <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4C8.6 21.5 10.3 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 013.8 12c0-4.5 3.7-8.2 8.2-8.2s8.2 3.7 8.2 8.2-3.7 8.2-8.2 8.2z" />
        </svg>
      </a>

      <a
        href={xHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="مشاركة عبر X"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-pine-50 hover:text-pine-600 dark:bg-white/5 dark:hover:bg-pine-500/10"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.8L4.6 22H1.5l8.1-9.3L1 2h7l4.9 6.2L18.9 2zm-1.2 18h1.9L7 4h-2l12.7 16z" />
        </svg>
      </a>

      <button
        type="button"
        onClick={handleCopy}
        aria-label="نسخ الرابط"
        className="flex h-9 items-center gap-1.5 rounded-full bg-stone-100 px-3 text-sm text-stone-500 transition-colors hover:bg-pine-50 hover:text-pine-600 dark:bg-white/5 dark:hover:bg-pine-500/10"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="9" y="9" width="11" height="11" rx="2" strokeWidth="1.8" />
          <path d="M5 15V5a2 2 0 012-2h10" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {copied ? 'تم النسخ!' : 'نسخ الرابط'}
      </button>
    </div>
  )
}
