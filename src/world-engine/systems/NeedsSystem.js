/**
 * Drains energy over time (faster for less playful/more highstrung
 * personalities) and builds boredom while active; resting reverses both.
 * The foundation other "needs" (hunger, warmth, ...) would extend the
 * same way rather than requiring a new phase.
 */
export function NeedsSystem(world, dt) {
  const entities = world.query(['Needs', 'AIState', 'Personality'])

  for (const id of entities) {
    const needs = world.getComponent(id, 'Needs')
    const ai = world.getComponent(id, 'AIState')
    const personality = world.getComponent(id, 'Personality')

    if (ai.action === 'rest') {
      needs.energy = Math.min(1, needs.energy + dt * 0.06)
      needs.boredom = Math.max(0, needs.boredom - dt * 0.03)
    } else {
      const metabolism = 0.003 + (1 - personality.playfulness) * 0.002
      needs.energy = Math.max(0, needs.energy - dt * metabolism)
      needs.boredom = Math.min(1, needs.boredom + dt * 0.008)
    }
  }
}
