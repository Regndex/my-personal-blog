import { useEffect, useRef, useState } from 'react'
import { Engine } from '../world-engine/Engine.js'

const DISABLED_STORAGE_KEY = 'living-world-disabled'

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Deliberately thin: creation, async init, ticker/pointer wiring and
 * teardown are all owned by Engine (see attachToPage/destroy there) so
 * this component only has to get React's mount/unmount lifecycle right,
 * not the engine's internals. Handles the async-resource-inside-an-effect
 * race explicitly: if this unmounts (including React StrictMode's
 * deliberate dev-mode mount->unmount->remount) before Engine.init()'s
 * promise resolves, destruction is deferred until it does, never fired
 * concurrently with initialization.
 */
export default function LivingWorld() {
  const containerRef = useRef(null)
  const [disabled, setDisabled] = useState(
    () => prefersReducedMotion() || window.localStorage.getItem(DISABLED_STORAGE_KEY) === 'true'
  )

  useEffect(() => {
    if (disabled || !containerRef.current) return undefined

    let cancelled = false
    const engine = new Engine()

    engine.init(containerRef.current).then(() => {
      if (cancelled) {
        engine.destroy()
        return
      }
      engine.attachToPage()
    })

    return () => {
      cancelled = true
      // If init() already resolved, this destroys immediately. If not,
      // the `.then()` above will see `cancelled` and destroy once it does
      // — destroy() is never called while init() is still in flight.
      if (engine.renderer.app) engine.destroy()
    }
  }, [disabled])

  function toggleDisabled() {
    setDisabled((prev) => {
      const next = !prev
      window.localStorage.setItem(DISABLED_STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <>
      <div
        ref={containerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      />
      <button
        type="button"
        onClick={toggleDisabled}
        className="fixed bottom-4 start-4 z-40 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-stone-500 shadow-sm backdrop-blur transition-colors hover:text-ink dark:bg-surface/80"
        title={disabled ? 'إظهار الكائنات الحية' : 'إخفاء الكائنات الحية'}
      >
        {disabled ? '🌱 إظهار العالم' : '🌱 إخفاء العالم'}
      </button>
    </>
  )
}
