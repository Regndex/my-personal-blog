/**
 * Centralized tunables. Anything a future milestone needs to scale up
 * (population cap as more species/hundreds of creatures arrive, tick
 * rate for performance tuning) lives here rather than scattered magic
 * numbers through systems.
 */
export const config = {
  maxPopulation: 60,
  spatialGridCellSize: 150,
  perceptionRadius: 220,
  /** AI "thinking" is deliberately not every frame — see DecisionSystem's
   *  per-entity staggered nextDecisionAt for why this matters for realism
   *  as much as for performance. */
  geographyRescanIntervalMs: 1500,
  persistenceKey: 'living-world-save-v1',
  persistenceIntervalMs: 15000,
}
