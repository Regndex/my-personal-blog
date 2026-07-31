const BOUNDARY_MARGIN = 24

/**
 * Integrates Velocity into Position, and keeps creatures within the
 * scanned page bounds via a soft velocity-reversal at the edges rather
 * than clamping position outright — clamping reads as hitting an
 * invisible wall; reversing velocity reads as "decided to turn around".
 */
export function PhysicsSystem(world, dt) {
  const geography = world.getResource('geography')
  const field = geography?.regions.find((region) => region.type === 'field')

  for (const id of world.query(['Position', 'Velocity', 'Facing'])) {
    const pos = world.getComponent(id, 'Position')
    const vel = world.getComponent(id, 'Velocity')
    const facing = world.getComponent(id, 'Facing')

    pos.x += vel.x * dt
    pos.y += vel.y * dt

    if (field) {
      const minX = field.x + BOUNDARY_MARGIN
      const maxX = field.x + field.width - BOUNDARY_MARGIN
      const minY = field.y + BOUNDARY_MARGIN
      const maxY = field.y + field.height - BOUNDARY_MARGIN

      if (pos.x < minX) {
        pos.x = minX
        vel.x = Math.abs(vel.x)
      } else if (pos.x > maxX) {
        pos.x = maxX
        vel.x = -Math.abs(vel.x)
      }

      if (pos.y < minY) {
        pos.y = minY
        vel.y = Math.abs(vel.y)
      } else if (pos.y > maxY) {
        pos.y = maxY
        vel.y = -Math.abs(vel.y)
      }
    }

    if (Math.hypot(vel.x, vel.y) > 1) {
      facing.angle = Math.atan2(vel.y, vel.x)
    }
  }
}
