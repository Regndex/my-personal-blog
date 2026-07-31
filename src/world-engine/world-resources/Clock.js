/**
 * World resource (singleton, not per-entity) tracking simulated time.
 * Deliberately separate from Scheduler's internal `_elapsed` — this is
 * *world* time other systems/resources read (e.g. a future day-night
 * cycle or Weather system deciding "it's dusk, get sleepier"), whereas
 * Scheduler's clock is purely an implementation detail of its own delayed
 * callbacks. Also tracks real-world absolute time so a returning visitor's
 * away-duration can be computed (see Engine.js's catch-up on load).
 */
export function createClock() {
  return {
    simulatedSeconds: 0,
    lastRealTimestamp: Date.now(),
  }
}

export function advanceClock(clock, dt) {
  clock.simulatedSeconds += dt
  clock.lastRealTimestamp = Date.now()
}
