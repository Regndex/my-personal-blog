import { useEffect, useState } from 'react'
import { supabase, BLOG_IMAGES_BUCKET } from '../lib/supabaseClient'

export default function ImagePicker({ onSelect, onClose }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadFiles() {
      const { data, error: listError } = await supabase.storage
        .from(BLOG_IMAGES_BUCKET)
        .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

      if (!isMounted) return

      if (listError) {
        setError(listError.message)
      } else {
        const images = (data || []).filter((file) => file.id) // skip folder placeholders
        setFiles(images)
      }
      setLoading(false)
    }

    loadFiles()
    return () => {
      isMounted = false
    }
  }, [])

  function publicUrlFor(fileName) {
    return supabase.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(fileName).data.publicUrl
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 dark:bg-surface">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">مكتبة الصور</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {loading && <p className="text-sm text-stone-400">جارٍ التحميل...</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!loading && !error && files.length === 0 && (
          <p className="text-sm text-stone-400">لا توجد صور مرفوعة سابقاً بعد.</p>
        )}

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {files.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => onSelect(publicUrlFor(file.name))}
              className="aspect-square overflow-hidden rounded-xl border border-stone-200 transition hover:ring-2 hover:ring-pine-500 dark:border-stone-600"
            >
              <img
                src={publicUrlFor(file.name)}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
