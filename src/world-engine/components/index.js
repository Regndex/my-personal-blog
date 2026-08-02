/**
 * Components are plain, JSON-serializable data — no methods, no classes.
 * That's deliberate: it's what makes Persistence.js's generic save/load
 * possible, and what keeps every behavior in systems (where it can be
 * composed/extended) rather than smeared across data objects.
 *
 * Adding a new component type for a future system (e.g. `FlightCapability`,
 * `Nocturnal`, `WeatherSensitivity`) means adding a new factory here and
 * having the relevant system(s) read it — the World and Scheduler need no
 * changes at all.
 */

export function Position(x = 0, y = 0) {
  return { x, y }
}

export function Velocity(x = 0, y = 0) {
  return { x, y }
}

/** Radians; kept distinct from Velocity's direction since a resting/hiding
 *  creature still faces a meaningful direction with zero velocity. */
export function Facing(angle = 0) {
  return { angle }
}

/** Purely visual — read only by RenderSyncSystem, never by AI/physics. */
export function Appearance(speciesId, { baseColor = 0xffffff, scale = 1 } = {}) {
  return { speciesId, baseColor, scale }
}

/**
 * Fixed at spawn (rolled from the species' trait ranges — see
 * species/index.js), 0-1 each. These are the knobs DecisionSystem reads
 * to make each individual feel different from others of the same species.
 */
export function Personality({ curiosity = 0.5, sociability = 0.5, courage = 0.5, playfulness = 0.5 } = {}) {
  return { curiosity, sociability, courage, playfulness }
}

/** Dynamic drives that change over time and feed DecisionSystem's utility
 *  scoring — the foundation "hunger/thirst/temperature" style future needs
 *  would extend rather than replace. */
export function Needs({ energy = 1, boredom = 0 } = {}) {
  return { energy, boredom }
}

/** Rebuilt every tick by PerceptionSystem; every other system treats it as
 *  read-only "what this creature currently knows about its surroundings". */
export function Perception() {
  return {
    nearbyEntityIds: [],
    nearestHidingSpotId: null,
    pointerDistance: null,
    pointerVisible: false,
  }
}

/** familiarity: plain object (not Map) so it round-trips through
 *  JSON.stringify in Persistence.js — keys are OTHER entities' ids
 *  (as strings), values accumulate/decay based on proximity over time. */
export function SocialMemory() {
  return { familiarity: {} }
}

export function AIState() {
  return {
    action: 'wander',
    targetEntityId: null,
    targetPoint: null,
    nextDecisionAt: 0,
    wanderAngle: Math.random() * Math.PI * 2,
  }
}

/** Bookkeeping foundation for future aging/birth-death systems — not acted
 *  on by anything yet beyond recording when/what an entity is. */
export function Lifecycle(speciesId, spawnedAt) {
  return { speciesId, spawnedAt }
}

/**
 * Purely visual "performance" state — computed by AnimationSystem from
 * Velocity/AIState/Needs, consumed only by RenderSync. Kept separate from
 * Appearance (which is static per-species) because this changes every
 * frame; separating "what a creature looks like" from "how it's currently
 * performing" is what let cartoon-animation-principle logic (squash and
 * stretch, slow in/out, anticipation) be added as one new system rather
 * than scattered into Steering/Physics.
 */
export function AnimationState() {
  return {
    expression: 'neutral',
    stretchAlong: 1,
    stretchAcross: 1,
    prevSpeed: 0,
    squashPulse: 0,
    breathingPhase: Math.random() * Math.PI * 2,
    // Smoothly-eased (never snapped) — what RenderSync actually applies,
    // distinct from the instantaneous "hiding: true/false" AIState.
    displayAlpha: 1,
    displayScale: 1,
  }
}
