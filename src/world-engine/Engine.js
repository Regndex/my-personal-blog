import { World } from './core/World.js'
import { Scheduler } from './core/Scheduler.js'
import { EventBus } from './core/EventBus.js'
import { SpatialGrid } from './core/SpatialGrid.js'
import { serializeWorld, deserializeWorld } from './core/Persistence.js'
import { createClock, advanceClock } from './world-resources/Clock.js'
import { createWeather } from './world-resources/Weather.js'
import { scanGeography } from './world-resources/Geography.js'
import { NeedsSystem } from './systems/NeedsSystem.js'
import { PerceptionSystem } from './systems/PerceptionSystem.js'
import { DecisionSystem } from './systems/DecisionSystem.js'
import { SteeringSystem } from './systems/SteeringSystem.js'
import { PhysicsSystem } from './systems/PhysicsSystem.js'
import { SocialSystem } from './systems/SocialSystem.js'
import { LifecycleSystem } from './systems/LifecycleSystem.js'
import { RenderSyncSystem } from './systems/RenderSyncSystem.js'
import { spawnCreature } from './species/index.js'
import { PixiRenderer } from './PixiRenderer.js'
import { config } from './config.js'

const PERSISTED_COMPONENT_TYPES = [
  'Position', 'Velocity', 'Facing', 'Appearance', 'Personality',
  'Needs', 'Perception', 'SocialMemory', 'AIState', 'Lifecycle',
]

/**
 * The only class outside code needs to know about: creates and wires the
 * World, Scheduler, resources and every system, and owns the render loop
 * integration, persistence, and geography rescanning. LivingWorld.jsx
 * should stay a thin React lifecycle wrapper around this.
 */
export class Engine {
  constructor() {
    this.world = new World()
    this.scheduler = new Scheduler()
    this.eventBus = new EventBus()
    this.renderer = new PixiRenderer()
    this._geographyTimer = null
    this._persistTimer = null
  }

  async init(canvasContainer) {
    await this.renderer.init(canvasContainer)

    this.world.setResource('spatialGrid', new SpatialGrid(config.spatialGridCellSize))
    this.world.setResource('pointer', { x: 0, y: 0, active: false })
    this.world.setResource('clock', createClock())
    this.world.setResource('weather', createWeather())
    this.world.setResource('config', config)
    this.world.setResource('renderer', this.renderer)
    this.world.setResource('geography', { regions: scanGeography(document.body) })

    this.scheduler.register('needs', (world, dt) => NeedsSystem(world, dt))
    this.scheduler.register('perception', (world) => PerceptionSystem(world))
    this.scheduler.register('decision', (world) => DecisionSystem(world))
    this.scheduler.register('steering', (world, dt) => SteeringSystem(world, dt))
    this.scheduler.register('physics', (world, dt) => PhysicsSystem(world, dt))
    this.scheduler.register('social', (world, dt) => SocialSystem(world, dt, this.eventBus))
    this.scheduler.register('lifecycle', (world) => LifecycleSystem(world))
    this.scheduler.register('renderSync', (world) => RenderSyncSystem(world))

    this._restoreOrSpawnInitialCreatures()

    this._geographyTimer = window.setInterval(() => {
      this.world.setResource('geography', { regions: scanGeography(document.body) })
    }, config.geographyRescanIntervalMs)

    this._persistTimer = window.setInterval(() => this._persist(), config.persistenceIntervalMs)
  }

  /** Wires this engine into its own PixiJS ticker and window pointer
   *  events, and returns everything needed to unwind — keeping this
   *  fragile "async resource created inside a React effect, must survive
   *  StrictMode's mount/unmount/remount" dance out of the component. */
  attachToPage() {
    const tick = (ticker) => this.tick(ticker.deltaMS / 1000)
    this.renderer.app.ticker.add(tick)

    const handlePointerMove = (event) => {
      this.setPointer(event.clientX + window.scrollX, event.clientY + window.scrollY, true)
    }
    const handlePointerLeave = () => this.setPointer(0, 0, false)

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true })

    this._detach = () => {
      this.renderer.app?.ticker?.remove(tick)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
    }
  }

  tick(dt) {
    this.world.setResource('time', this.scheduler.elapsed)
    advanceClock(this.world.getResource('clock'), dt)
    this.scheduler.tick(this.world, dt)
  }

  setPointer(x, y, active) {
    this.world.setResource('pointer', { x, y, active })
  }

  _restoreOrSpawnInitialCreatures() {
    const saved = window.localStorage.getItem(config.persistenceKey)
    if (saved) {
      try {
        const { idMap, savedAt } = deserializeWorld(this.world, saved, PERSISTED_COMPONENT_TYPES)
        this._remapSocialMemoryKeys(idMap)
        this._applyAwayCatchUp(savedAt)
        return
      } catch {
        // Corrupt/incompatible save — fall through to a fresh world rather
        // than leaving the visitor with a broken (or empty) page.
      }
    }
    this._spawnInitialCreatures()
  }

  _spawnInitialCreatures() {
    const field = this.world.getResource('geography').regions.find((region) => region.type === 'field')
    const startingSpecies = ['wisp', 'skitter', 'blob']

    startingSpecies.forEach((speciesId) => {
      const x = (field?.x ?? 0) + Math.random() * (field?.width ?? 800)
      const y = (field?.y ?? 0) + Math.random() * Math.min(field?.height ?? 600, 1200)
      spawnCreature(this.world, speciesId, x, y, this.scheduler.elapsed)
    })
  }

  /** SocialMemory.familiarity is keyed by OTHER entities' ids, which are
   *  not stable across a save/load cycle — remap them using the id
   *  translation Persistence.js's deserializeWorld returns. */
  _remapSocialMemoryKeys(idMap) {
    for (const id of this.world.query(['SocialMemory'])) {
      const social = this.world.getComponent(id, 'SocialMemory')
      const remapped = {}
      for (const [oldKey, value] of Object.entries(social.familiarity)) {
        const newId = idMap.get(Number(oldKey))
        if (newId != null) remapped[String(newId)] = value
      }
      social.familiarity = remapped
    }
  }

  /** "The world continues even when you're not here": approximate what
   *  would have happened while the tab was closed, capped at 1h of
   *  simulated effect so a week-long absence doesn't just zero everything. */
  _applyAwayCatchUp(savedAt) {
    if (!savedAt) return
    const awaySeconds = Math.min((Date.now() - savedAt) / 1000, 3600)
    for (const id of this.world.query(['Needs'])) {
      const needs = this.world.getComponent(id, 'Needs')
      needs.energy = Math.max(0.2, needs.energy - awaySeconds * 0.0004)
    }
  }

  _persist() {
    try {
      const json = serializeWorld(this.world, PERSISTED_COMPONENT_TYPES)
      window.localStorage.setItem(config.persistenceKey, json)
    } catch {
      // Decorative feature — a full/unavailable localStorage should never
      // surface as a visible error to someone reading the blog.
    }
  }

  destroy() {
    window.clearInterval(this._geographyTimer)
    window.clearInterval(this._persistTimer)
    this._detach?.()
    this._persist()
    this.renderer.destroy()
  }
}
