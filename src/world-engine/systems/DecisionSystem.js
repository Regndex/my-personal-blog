import { regionCenter } from '../world-resources/Geography.js'

/**
 * The personality engine. Each creature periodically (staggered per-
 * individual, not synchronized) scores a handful of candidate actions
 * against its traits + current needs + what it perceives, then picks
 * *probabilistically* among them (weighted by score, not a strict
 * argmax) — this is what produces "feels alive, never quite repeats"
 * instead of either pure randomness or a deterministic script. This is a
 * simple utility-AI technique, not genuine cognition — described
 * accurately as such rather than oversold.
 */
export function DecisionSystem(world) {
  const time = world.getResource('time') ?? 0
  const geography = world.getResource('geography')

  for (const id of world.query(['AIState', 'Personality', 'Needs', 'Perception', 'SocialMemory'])) {
    const ai = world.getComponent(id, 'AIState')
    if (time < ai.nextDecisionAt) continue

    const personality = world.getComponent(id, 'Personality')
    const needs = world.getComponent(id, 'Needs')
    const perception = world.getComponent(id, 'Perception')
    const social = world.getComponent(id, 'SocialMemory')

    const options = buildOptions({ personality, needs, perception, social, geography })
    const chosen = weightedPick(options)

    ai.action = chosen.action
    ai.targetEntityId = chosen.targetEntityId ?? null
    ai.targetPoint = chosen.targetPoint ?? null
    // Staggered re-evaluation (2-5s) so a room of creatures never all
    // "think" on the same frame — part of what avoids visible pattern.
    ai.nextDecisionAt = time + 2 + Math.random() * 3
  }
}

export function buildOptions({ personality, needs, perception, social, geography }) {
  const options = [
    { action: 'wander', score: 0.25 + personality.playfulness * 0.35 },
    { action: 'rest', score: (1 - needs.energy) * 0.9 + needs.boredom * -0.2 },
  ]

  if (perception.pointerVisible) {
    options.push({ action: 'investigate', score: personality.curiosity * 0.85 })
    options.push({ action: 'flee', score: (1 - personality.courage) * 0.75 })
  }

  if (perception.nearbyEntityIds.length > 0) {
    let bestId = null
    let bestFamiliarity = -1
    for (const otherId of perception.nearbyEntityIds) {
      const familiarity = social.familiarity[String(otherId)] ?? 0
      if (familiarity > bestFamiliarity) {
        bestFamiliarity = familiarity
        bestId = otherId
      }
    }
    options.push({
      action: 'approach',
      targetEntityId: bestId,
      score: personality.sociability * 0.5 + bestFamiliarity * 0.5,
    })
  }

  if (perception.nearestHidingSpotId && geography) {
    const region = geography.regions.find((r) => r.id === perception.nearestHidingSpotId)
    if (region) {
      options.push({
        action: 'hide',
        targetPoint: regionCenter(region),
        score: (1 - personality.courage) * 0.35 + needs.boredom * 0.1,
      })
    }
  }

  return options
}

/** Proportional-to-score random choice, with a floor so a zero-scored
 *  option is never impossible — pure argmax would look robotic. */
export function weightedPick(options) {
  const floor = 0.01
  const total = options.reduce((sum, option) => sum + Math.max(floor, option.score), 0)
  let roll = Math.random() * total

  for (const option of options) {
    roll -= Math.max(floor, option.score)
    if (roll <= 0) return option
  }
  return options[options.length - 1]
}
