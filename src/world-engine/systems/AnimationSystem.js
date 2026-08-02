const MAX_REFERENCE_SPEED = 95
const SUDDEN_STOP_THRESHOLD = 35
const HIDE_TARGET = { alpha: 0.32, scale: 0.72 }
const VISIBLE_TARGET = { alpha: 1, scale: 1 }

/**
 * Applies a few of the classic 12 animation principles procedurally,
 * rather than hand-keyframing every creature/action combination:
 *
 * - Squash & stretch: elongates along the travel direction with speed,
 *   compresses across it, so movement reads as having weight/flexibility
 *   instead of a rigid shape sliding around.
 * - Anticipation: a brief opposite-direction squash pulse fires on a
 *   sudden deceleration (arriving, hitting a bound, changing action) —
 *   the "give" before a shape settles, decaying back out over ~0.5s.
 * - Slow in / slow out: SteeringSystem's arrive() already decelerates
 *   into targets; this system's exponential easing of displayAlpha/
 *   displayScale is the same principle applied to the hide/reveal
 *   transition specifically, so it fades rather than snaps.
 * - Idle secondary action: a slow breathing oscillation while resting,
 *   so a stationary creature never looks like a paused GIF.
 *
 * Expression is derived from *real* current AIState/Needs — genuinely
 * reflecting internal state, not a decorative loop unrelated to behavior.
 */
export function AnimationSystem(world, dt) {
  const time = world.getResource('time') ?? 0

  for (const id of world.query(['AnimationState', 'Velocity', 'AIState', 'Needs', 'Personality'])) {
    const anim = world.getComponent(id, 'AnimationState')
    const vel = world.getComponent(id, 'Velocity')
    const ai = world.getComponent(id, 'AIState')
    const needs = world.getComponent(id, 'Needs')

    const speed = Math.hypot(vel.x, vel.y)

    if (anim.prevSpeed - speed > SUDDEN_STOP_THRESHOLD) {
      anim.squashPulse = 1
    }
    anim.squashPulse *= Math.pow(0.02, dt)
    anim.prevSpeed = speed

    const speedT = Math.min(speed / MAX_REFERENCE_SPEED, 1)
    let stretch = 1 + speedT * 0.35
    // The anticipation/landing pulse briefly overshoots the OTHER way
    // (a quick squash) rather than adding to stretch — a stop should
    // read as "caught itself", not "kept stretching".
    stretch -= anim.squashPulse * 0.4
    stretch = Math.max(0.55, stretch)

    if (speed < 4 && ai.action === 'rest') {
      stretch += Math.sin(time * 2.2 + anim.breathingPhase) * 0.035
    }

    anim.stretchAlong = stretch
    anim.stretchAcross = 1 / Math.sqrt(stretch)

    anim.expression = pickExpression(ai.action, needs)

    const hiding = ai.action === 'hide'
    const target = hiding ? HIDE_TARGET : VISIBLE_TARGET
    const ease = 1 - Math.pow(0.01, dt)
    anim.displayAlpha += (target.alpha - anim.displayAlpha) * ease
    anim.displayScale += (target.scale - anim.displayScale) * ease
  }
}

function pickExpression(action, needs) {
  if (action === 'flee') return 'scared'
  if (action === 'rest') return needs.energy < 0.4 ? 'sleepy' : 'content'
  if (action === 'investigate') return 'curious'
  if (action === 'approach') return 'happy'
  if (action === 'hide') return 'shy'
  return 'neutral'
}
