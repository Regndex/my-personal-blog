/**
 * STUB — interface designed now, implementation postponed (per the
 * project brief: design later-milestone architecture now, build it when
 * its turn comes). This is what a future WeatherSystem would read from
 * and write to; every consuming system below already reads through this
 * resource rather than assuming clear skies, so turning on a real
 * WeatherSystem later is additive — no other system needs to change.
 *
 * Real implementation would likely: register a 'weather' phase-agnostic
 * system that mutates this resource on a timer/pattern, and have
 * SteeringSystem read `windVector` as an additional force, NeedsSystem
 * read `condition` to adjust energy decay (e.g. rain -> more shelter-
 * seeking), and RenderSyncSystem read it for ambient visual effects.
 */
export function createWeather() {
  return {
    /** 'clear' for now; future: 'clear' | 'rain' | 'wind' | 'fog' | ... */
    condition: 'clear',
    /** Additional steering force systems can add in; {0,0} = no-op today. */
    windVector: { x: 0, y: 0 },
    /** 0-1 multiplier future systems could apply to visibility/perception radius. */
    visibility: 1,
  }
}
