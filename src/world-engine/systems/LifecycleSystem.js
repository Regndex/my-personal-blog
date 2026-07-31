/**
 * v1 has a fixed cast that never spawns or dies, so there is genuinely
 * nothing to do yet — but the phase exists and is wired into the
 * scheduler now specifically so a future spawn/aging/death system is a
 * pure addition (register into the 'lifecycle' phase) rather than a
 * change to Scheduler/Engine. `maxPopulation` is read from config
 * already, ready for that system to enforce it once it exists.
 */
export function LifecycleSystem(world) {
  const config = world.getResource('config')
  if (!config) return
  // Intentionally a no-op beyond the population check below until a real
  // spawn/despawn system is designed — see world-engine/README (config.js
  // docblock) for the intended extension.
  void config.maxPopulation
}
