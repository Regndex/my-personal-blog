export default function LoadingSpinner({ label = 'جارٍ التحميل...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-pine-100 border-t-pine-500" />
      <span className="text-sm text-stone-400">{label}</span>
    </div>
  )
}
