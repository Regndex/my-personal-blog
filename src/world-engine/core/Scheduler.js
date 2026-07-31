/**
 * Runs registered systems in a fixed phase order every tick, and supports
 * scheduling one-off callbacks for later simulated time — the same
 * primitive serves staggered per-creature "thinking" ticks now and
 * procedural world events later (both are just "call this in N seconds"),
 * so that future milestone doesn't need its own new timing mechanism.
 *
 * Phase order is fixed and meaningful: needs -> perception -> decision ->
 * steering -> physics -> social -> lifecycle -> renderSync. A new system
 * (weather affecting needs, a predator-alert perception filter, ...)
 * registers into whichever phase it logically belongs to; it never has to
 * reorder or touch existing systems.
 */
const PHASES = [
  'needs',
  'perception',
  'decision',
  'steering',
  'physics',
  'social',
  'lifecycle',
  'renderSync',
]

export class Scheduler {
  constructor() {
    this._systems = new Map(PHASES.map((phase) => [phase, []]))
    this._delayed = []
    this._elapsed = 0
  }

  static get phases() {
    return PHASES
  }

  register(phase, system) {
    if (!this._systems.has(phase)) {
      throw new Error(`Unknown scheduler phase "${phase}". Valid phases: ${PHASES.join(', ')}`)
    }
    this._systems.get(phase).push(system)
  }

  /** Runs `callback` once, no sooner than `delaySeconds` of simulated time
   *  from now — used for staggering per-entity AI ticks and (later) for
   *  procedural events ("something rare happens in ~60s"). */
  scheduleAfter(delaySeconds, callback) {
    this._delayed.push({ dueAt: this._elapsed + delaySeconds, callback })
  }

  tick(world, dt) {
    this._elapsed += dt

    for (const phase of PHASES) {
      for (const system of this._systems.get(phase)) {
        system(world, dt)
      }
    }

    if (this._delayed.length === 0) return
    const due = []
    const remaining = []
    for (const entry of this._delayed) {
      ;(entry.dueAt <= this._elapsed ? due : remaining).push(entry)
    }
    this._delayed = remaining
    due.forEach((entry) => entry.callback())
  }

  get elapsed() {
    return this._elapsed
  }
}
