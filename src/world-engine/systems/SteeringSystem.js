const MAX_SPEED = {
  rest: 0,
  wander: 35,
  approach: 55,
  flee: 95,
  investigate: 50,
  hide: 70,
}

const SEPARATION_RADIUS = 40

/**
 * Classic Reynolds-style steering (wander/seek/flee + separation) rather
 * than hand-authored animation paths — this is what the brief means by
 * "emerge from systems, not hardcoded sequences": nobody scripted any
 * specific path, it falls out of a few general-purpose rules composed
 * together, which is also why adding a new action later (e.g. "forage")
 * only needs one more branch here, not a new animation to hand-draw.
 */
export function SteeringSystem(world, dt) {
  for (const id of world.query(['Position', 'Velocity', 'AIState', 'Perception'])) {
    const pos = world.getComponent(id, 'Position')
    const vel = world.getComponent(id, 'Velocity')
    const ai = world.getComponent(id, 'AIState')
    const perception = world.getComponent(id, 'Perception')
    const pointer = world.getResource('pointer')

    const maxSpeed = MAX_SPEED[ai.action] ?? 35
    let desired = { x: 0, y: 0 }

    if (ai.action === 'wander') {
      ai.wanderAngle += (Math.random() - 0.5) * 0.6
      desired = { x: Math.cos(ai.wanderAngle) * maxSpeed, y: Math.sin(ai.wanderAngle) * maxSpeed }
    } else if (ai.action === 'approach' && ai.targetEntityId != null && world.isAlive(ai.targetEntityId)) {
      const targetPos = world.getComponent(ai.targetEntityId, 'Position')
      if (targetPos) desired = seek(pos, targetPos, maxSpeed)
    } else if ((ai.action === 'investigate' || ai.action === 'hide') && ai.targetPoint) {
      desired = seek(pos, ai.targetPoint, maxSpeed)
    } else if (ai.action === 'flee' && pointer?.active) {
      desired = flee(pos, pointer, maxSpeed)
    }
    // 'rest' leaves desired at {0,0} — the creature settles.

    const separation = separationForce(pos, perception, world)
    desired.x += separation.x
    desired.y += separation.y

    // Frame-rate-independent easing toward the desired velocity, so
    // direction changes feel like acceleration, not teleporting.
    const ease = 1 - Math.pow(0.0008, dt)
    vel.x += (desired.x - vel.x) * ease
    vel.y += (desired.y - vel.y) * ease
  }
}

export function seek(from, to, maxSpeed) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  return { x: (dx / distance) * maxSpeed, y: (dy / distance) * maxSpeed }
}

export function flee(from, threat, maxSpeed) {
  const v = seek(from, threat, maxSpeed)
  return { x: -v.x, y: -v.y }
}

function separationForce(pos, perception, world) {
  let x = 0
  let y = 0
  for (const otherId of perception.nearbyEntityIds) {
    const otherPos = world.getComponent(otherId, 'Position')
    if (!otherPos) continue
    const dx = pos.x - otherPos.x
    const dy = pos.y - otherPos.y
    const distance = Math.hypot(dx, dy)
    if (distance > 0 && distance < SEPARATION_RADIUS) {
      const push = (SEPARATION_RADIUS - distance) / SEPARATION_RADIUS
      x += (dx / distance) * push * 30
      y += (dy / distance) * push * 30
    }
  }
  return { x, y }
}
