/**
 * The bridge between simulation and rendering: reads Position/Facing/
 * Appearance (never writes them) and pushes them into whatever renderer
 * is registered as a resource. Simulation systems never import PixiRenderer
 * directly, so a second renderer (a debug overlay, a minimap) could
 * subscribe the same way without touching this file.
 */
export function RenderSyncSystem(world) {
  const renderer = world.getResource('renderer')
  if (!renderer) return

  const rendered = new Set()

  for (const id of world.query(['Position', 'Facing', 'Appearance'])) {
    const position = world.getComponent(id, 'Position')
    const facing = world.getComponent(id, 'Facing')
    const appearance = world.getComponent(id, 'Appearance')
    const anim = world.getComponent(id, 'AnimationState')
    renderer.syncEntity(id, appearance, position, facing, anim)
    rendered.add(id)
  }

  // Anything the renderer still has a sprite for but that no longer shows
  // up in the query above (destroyed entity) gets its sprite released.
  for (const entityId of renderer.activeEntityIds()) {
    if (!rendered.has(entityId)) renderer.removeEntity(entityId)
  }
}
