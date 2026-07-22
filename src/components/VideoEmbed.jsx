/**
 * Pulls the 11-character YouTube video ID out of the common URL shapes:
 * watch?v=, youtu.be/, /embed/, and /shorts/.
 */
function extractYouTubeId(url) {
  if (!url) return null

  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /youtube\.com\/shorts\/([^?&\s]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

export default function VideoEmbed({ url }) {
  const videoId = extractYouTubeId(url)

  if (!videoId) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
        تعذر تضمين هذا الفيديو مباشرة —{' '}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-pine-600 hover:underline"
        >
          مشاهدته في نافذة أخرى
        </a>
      </div>
    )
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-md">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="مشغل الفيديو"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
