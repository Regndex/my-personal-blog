/**
 * Turns the actual rendered page into the world's geography: headings
 * become elevated platforms, cards become buildings, images become
 * hiding spots, everything else is open field — exactly the brief's "DOM
 * is not UI, DOM is geography" idea, built as a resource any system can
 * query generically (rather than, say, SteeringSystem hardcoding "avoid
 * <img> tags"). Each region also gets a coarse `biome` tag — a cheap,
 * real (not stubbed) first cut at "biomes", since it falls straight out
 * of the classification already being done here.
 *
 * DOM access (getBoundingClientRect, querySelectorAll) only happens in
 * `scanGeography`; every other export here is pure data-in/data-out and
 * unit-testable without a real DOM.
 */

const REGION_TYPES = [
  { type: 'platform', biome: 'highland', selector: 'h1, h2, h3' },
  { type: 'building', biome: 'settlement', selector: 'article, [data-world-building]' },
  { type: 'hiding-spot', biome: 'forest', selector: 'img' },
]

export function scanGeography(rootElement) {
  const regions = []
  let idCounter = 0

  for (const { type, biome, selector } of REGION_TYPES) {
    rootElement.querySelectorAll(selector).forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width < 4 || rect.height < 4) return // not meaningfully rendered

      regions.push({
        id: `region-${idCounter++}`,
        type,
        biome,
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      })
    })
  }

  const bodyRect = rootElement.getBoundingClientRect()
  regions.push({
    id: 'region-field',
    type: 'field',
    biome: 'field',
    x: 0,
    y: window.scrollY,
    width: bodyRect.width,
    height: window.innerHeight,
  })

  return regions
}

export function regionCenter(region) {
  return { x: region.x + region.width / 2, y: region.y + region.height / 2 }
}

/** A point just outside the region's border, at a random angle — used for
 *  "hide" targets so a creature settles at an image's edge (peeking in)
 *  rather than at its dead center, which read as vanishing into the
 *  middle of whatever container happened to be measured. */
export function regionEdgePoint(region, outset = 14) {
  const angle = Math.random() * Math.PI * 2
  const center = regionCenter(region)
  const halfW = region.width / 2 + outset
  const halfH = region.height / 2 + outset
  return {
    x: center.x + Math.cos(angle) * halfW,
    y: center.y + Math.sin(angle) * halfH,
  }
}

export function isPointInRegion(region, x, y) {
  return x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height
}

export function findNearestRegionOfType(regions, type, x, y) {
  let nearest = null
  let nearestDistance = Infinity

  for (const region of regions) {
    if (region.type !== type) continue
    const center = regionCenter(region)
    const distance = Math.hypot(center.x - x, center.y - y)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = region
    }
  }

  return nearest
}

export function biomeAtPoint(regions, x, y) {
  // Later, more specific regions (platform/building/hiding-spot) should
  // win over the catch-all field region for the same point.
  const specific = regions.find((r) => r.type !== 'field' && isPointInRegion(r, x, y))
  if (specific) return specific.biome
  const field = regions.find((r) => r.type === 'field' && isPointInRegion(r, x, y))
  return field?.biome ?? 'field'
}
