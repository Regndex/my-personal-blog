import { findNearestRegionOfType } from '../world-resources/Geography.js'

const PERCEPTION_RADIUS = 220

/**
 * Rebuilds the spatial grid from current positions, then fills in every
 * perceiving entity's Perception component. Every other system (Decision,
 * Social, ...) reads Perception rather than querying the grid or geography
 * directly — they don't need to know spatial partitioning exists at all.
 */
export function PerceptionSystem(world) {
  const grid = world.getResource('spatialGrid')
  const geography = world.getResource('geography')
  const pointer = world.getResource('pointer')

  grid.clear()
  for (const id of world.query(['Position'])) {
    const pos = world.getComponent(id, 'Position')
    grid.insert(id, pos.x, pos.y)
  }

  for (const id of world.query(['Position', 'Perception'])) {
    const pos = world.getComponent(id, 'Position')
    const perception = world.getComponent(id, 'Perception')

    perception.nearbyEntityIds = grid
      .queryRadius(pos.x, pos.y, PERCEPTION_RADIUS)
      .filter((otherId) => otherId !== id)

    const nearestHidingSpot = geography
      ? findNearestRegionOfType(geography.regions, 'hiding-spot', pos.x, pos.y)
      : null
    perception.nearestHidingSpotId = nearestHidingSpot?.id ?? null

    if (pointer?.active) {
      const distance = Math.hypot(pointer.x - pos.x, pointer.y - pos.y)
      perception.pointerDistance = distance
      perception.pointerVisible = distance < PERCEPTION_RADIUS
    } else {
      perception.pointerDistance = null
      perception.pointerVisible = false
    }
  }
}
