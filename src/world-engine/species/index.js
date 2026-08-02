import wisp from './definitions/wisp.js'
import skitter from './definitions/skitter.js'
import blob from './definitions/blob.js'
import * as C from '../components/index.js'

const registry = new Map([wisp, skitter, blob].map((species) => [species.id, species]))

/**
 * Adding a "dozens of species" future milestone is calling this with a new
 * data definition — spawnCreature below and everything upstream (systems,
 * renderer) is already generic over speciesId, so nothing else changes.
 */
export function registerSpecies(definition) {
  registry.set(definition.id, definition)
}

export function getSpeciesDefinition(speciesId) {
  return registry.get(speciesId)
}

export function getSpeciesIds() {
  return Array.from(registry.keys())
}

function rollInRange([min, max]) {
  return min + Math.random() * (max - min)
}

export function spawnCreature(world, speciesId, x, y, simulatedTime = 0) {
  const species = registry.get(speciesId)
  if (!species) throw new Error(`Unknown species: "${speciesId}"`)

  const id = world.createEntity()
  world.addComponent(id, 'Position', C.Position(x, y))
  world.addComponent(id, 'Velocity', C.Velocity(0, 0))
  world.addComponent(id, 'Facing', C.Facing(Math.random() * Math.PI * 2))
  world.addComponent(id, 'Appearance', C.Appearance(speciesId, species.appearance))
  world.addComponent(
    id,
    'Personality',
    C.Personality({
      curiosity: rollInRange(species.traitRanges.curiosity),
      sociability: rollInRange(species.traitRanges.sociability),
      courage: rollInRange(species.traitRanges.courage),
      playfulness: rollInRange(species.traitRanges.playfulness),
    })
  )
  world.addComponent(id, 'Needs', C.Needs())
  world.addComponent(id, 'Perception', C.Perception())
  world.addComponent(id, 'SocialMemory', C.SocialMemory())
  world.addComponent(id, 'AIState', C.AIState())
  world.addComponent(id, 'AnimationState', C.AnimationState())
  world.addComponent(id, 'Lifecycle', C.Lifecycle(speciesId, simulatedTime))

  return id
}
