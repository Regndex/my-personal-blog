/**
 * Generic save/load for a World: iterates whatever component types you
 * tell it about rather than hardcoding "save creature.x, creature.y, ...".
 * New components added for future systems are persisted automatically —
 * callers just include the new type name in `componentTypes`.
 *
 * Entity ids are NOT guaranteed stable across a save/load cycle (a fresh
 * World allocates fresh ids), so this returns an old-id -> new-id map.
 * Components that reference other entities by id (e.g. SocialMemory's
 * familiarity map) must be remapped by the caller using it — see
 * world-engine/Engine.js for where that happens; kept out of this file
 * so Persistence itself stays component-shape-agnostic.
 */
export function serializeWorld(world, componentTypes) {
  const entities = world.entities().map((id) => {
    const record = { id }
    for (const type of componentTypes) {
      if (world.hasComponent(id, type)) {
        record[type] = world.getComponent(id, type)
      }
    }
    return record
  })

  return JSON.stringify({ version: 1, savedAt: Date.now(), entities })
}

export function deserializeWorld(world, json, componentTypes) {
  const parsed = JSON.parse(json)
  const idMap = new Map()

  for (const record of parsed.entities || []) {
    const newId = world.createEntity()
    idMap.set(record.id, newId)
    for (const type of componentTypes) {
      if (record[type] !== undefined) {
        world.addComponent(newId, type, record[type])
      }
    }
  }

  return { idMap, savedAt: parsed.savedAt || null }
}
