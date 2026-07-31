const FAMILIARITY_GAIN_RATE = 0.02
const FAMILIARITY_DECAY_RATE = 0.002
const ACQUAINTANCE_THRESHOLD = 0.3

/**
 * "Friendship" and "avoidance" are never scripted between specific
 * creatures — they emerge from a plain accumulator: familiarity rises
 * with time spent near someone (faster for the sociable), decays when
 * apart. DecisionSystem's `approach` option already favors whoever a
 * creature is most familiar with, so clustering/pairing falls out of
 * these two simple rules rather than being authored.
 */
export function SocialSystem(world, dt, eventBus) {
  for (const id of world.query(['SocialMemory', 'Perception', 'Personality'])) {
    const social = world.getComponent(id, 'SocialMemory')
    const perception = world.getComponent(id, 'Perception')
    const personality = world.getComponent(id, 'Personality')
    const nearbyIds = new Set(perception.nearbyEntityIds.map(String))

    for (const key of nearbyIds) {
      const current = social.familiarity[key] ?? 0
      const wasStranger = current < ACQUAINTANCE_THRESHOLD
      const next = Math.min(1, current + FAMILIARITY_GAIN_RATE * dt * (0.5 + personality.sociability))
      social.familiarity[key] = next

      if (wasStranger && next >= ACQUAINTANCE_THRESHOLD) {
        eventBus?.emit('creature:acquainted', { entityId: id, otherId: Number(key) })
      }
    }

    for (const key of Object.keys(social.familiarity)) {
      if (!nearbyIds.has(key)) {
        social.familiarity[key] = Math.max(0, social.familiarity[key] - FAMILIARITY_DECAY_RATE * dt)
      }
    }
  }
}
