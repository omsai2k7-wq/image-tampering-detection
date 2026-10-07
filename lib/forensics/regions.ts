import { RegionOutline, FaceForensics, CueResult } from "./types"
import { clamp } from "./image-utils"

// Constants
export const HYSTERESIS_HIGH = 0.70
export const HYSTERESIS_LOW = 0.50
export const MIN_AREA_PCT = 0.005 // 0.5% of total image area
export const MAX_REGIONS = 5

/**
 * Douglas-Peucker line simplification algorithm
 */
function perpendicularDistance(
  pt: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const dx = lineEnd[0] - lineStart[0]
  const dy = lineEnd[1] - lineStart[1]
  const mag = Math.sqrt(dx * dx + dy * dy)
  if (mag < 1e-6) {
    return Math.sqrt((pt[0] - lineStart[0]) ** 2 + (pt[1] - lineStart[1]) ** 2)
  }
  return Math.abs(dy * pt[0] - dx * pt[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]) / mag
}

export function douglasPeucker(
  points: [number, number][],
  epsilon: number
): [number, number][] {
  if (points.length <= 2) return points

  let maxDist = 0
  let index = 0
  const end = points.length - 1

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end])
    if (d > maxDist) {
      maxDist = d
      index = i
    }
  }

  if (maxDist > epsilon) {
    const rec1 = douglasPeucker(points.slice(0, index + 1), epsilon)
    const rec2 = douglasPeucker(points.slice(index), epsilon)
    return rec1.slice(0, rec1.length - 1).concat(rec2)
  }
  return [points[0], points[end]]
}

/**
 * Extract contour boundary polygon using boundary tracing on binary mask
 */
function extractBoundaryPolygon(
  mask: Uint8Array,
  width: number,
  height: number,
  targetId: number
): [number, number][] {
  const points: [number, number][] = []

  // Step 1: Find first perimeter pixel
  let startX = -1
  let startY = -1

  outer: for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      if (mask[row + x] === targetId) {
        startX = x
        startY = y
        break outer
      }
    }
  }

  if (startX === -1) return []

  // Step 2: Moore-Neighbor Tracing
  const dx = [0, 1, 1, 1, 0, -1, -1, -1]
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1]

  let curX = startX
  let curY = startY
  let dir = 0
  const maxSteps = 4000
  let steps = 0

  points.push([curX, curY])

  while (steps++ < maxSteps) {
    let found = false
    for (let i = 0; i < 8; i++) {
      const nextDir = (dir + i) % 8
      const nx = curX + dx[nextDir]
      const ny = curY + dy[nextDir]

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (mask[ny * width + nx] === targetId) {
          curX = nx
          curY = ny
          dir = (nextDir + 5) % 8
          found = true
          points.push([curX, curY])
          break
        }
      }
    }

    if (!found || (curX === startX && curY === startY && steps > 3)) {
      break
    }
  }

  // Simplify with Douglas-Peucker (epsilon 2.0 pixels)
  const simplified = douglasPeucker(points, 2.0)
  return simplified
}

/**
 * Perform Hysteresis Thresholding, Connected Component Labeling,
 * Area Filtering and Region Extraction.
 */
export function extractRegions(
  fusedMap: Float32Array,
  agreementMap: Float32Array,
  cues: Record<string, CueResult>,
  width: number,
  height: number,
  face?: FaceForensics,
  highThresh = HYSTERESIS_HIGH,
  lowThresh = HYSTERESIS_LOW
): RegionOutline[] {
  const totalPixels = width * height
  const minAreaPixels = totalPixels * MIN_AREA_PCT

  // 1. Hysteresis Thresholding
  // 0 = unvisited, 1 = low candidate, 2 = high seed, 3 = confirmed component
  const state = new Uint8Array(totalPixels)
  const seeds: number[] = []

  for (let i = 0; i < totalPixels; i++) {
    const val = fusedMap[i]
    if (val >= highThresh) {
      state[i] = 2
      seeds.push(i)
    } else if (val >= lowThresh) {
      state[i] = 1
    }
  }

  // Flood fill from seeds to attach 8-connected low candidates
  const labels = new Int32Array(totalPixels)
  let currentLabel = 0

  interface ComponentStats {
    id: number
    pixelCount: number
    sumScore: number
    minX: number
    maxX: number
    minY: number
    maxY: number
  }

  const components: ComponentStats[] = []
  const queue: number[] = []

  for (const seed of seeds) {
    if (labels[seed] !== 0) continue

    currentLabel++
    labels[seed] = currentLabel
    queue.push(seed)

    let pixelCount = 0
    let sumScore = 0
    let minX = width, maxX = 0, minY = height, maxY = 0

    while (queue.length > 0) {
      const idx = queue.pop()!
      pixelCount++
      sumScore += fusedMap[idx]

      const px = idx % width
      const py = Math.floor(idx / width)

      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py

      // 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        const ny = py + dy
        if (ny < 0 || ny >= height) continue
        const row = ny * width

        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = px + dx
          if (nx < 0 || nx >= width) continue

          const nIdx = row + nx
          if (labels[nIdx] === 0 && (state[nIdx] === 1 || state[nIdx] === 2)) {
            labels[nIdx] = currentLabel
            queue.push(nIdx)
          }
        }
      }
    }

    if (pixelCount >= minAreaPixels) {
      components.push({
        id: currentLabel,
        pixelCount,
        sumScore,
        minX,
        maxX,
        minY,
        maxY,
      })
    }
  }

  // 2. Rank components by (mean * Math.sqrt(area)) and keep top 5
  const ranked = components
    .map((c) => {
      const mean = c.sumScore / (c.pixelCount || 1)
      const rankScore = mean * Math.sqrt(c.pixelCount)
      return { ...c, mean, rankScore }
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, MAX_REGIONS)

  // 3. Construct detailed RegionOutlines
  const availableCues = Object.keys(cues).filter((k) => cues[k].isApplicable && k !== "Frequency")
  const totalCuesCount = availableCues.length || 4

  const results: RegionOutline[] = []

  for (let rIdx = 0; rIdx < ranked.length; rIdx++) {
    const comp = ranked[rIdx]
    const areaPct = (comp.pixelCount / totalPixels) * 100
    const meanScore = comp.mean

    // Bbox normalized 0..1
    const bbox: [number, number, number, number] = [
      comp.minX / width,
      comp.minY / height,
      (comp.maxX - comp.minX) / width,
      (comp.maxY - comp.minY) / height,
    ]

    // Extract contour polygon
    const rawPoly = extractBoundaryPolygon(new Uint8Array(labels), width, height, comp.id)
    const normalizedPoly: [number, number][] = rawPoly.map(([x, y]) => [
      clamp(x / width, 0, 1),
      clamp(y / height, 0, 1),
    ])

    // Cue agreement across this component
    const contributingCues: string[] = []
    for (const cueName of availableCues) {
      const cue = cues[cueName]
      if (!cue || !cue.map) continue

      let cueSum = 0
      let cueCount = 0
      for (let y = comp.minY; y <= comp.maxY; y++) {
        const row = y * width
        for (let x = comp.minX; x <= comp.maxX; x++) {
          if (labels[row + x] === comp.id) {
            cueSum += cue.map[row + x]
            cueCount++
          }
        }
      }
      const cueMean = cueCount > 0 ? cueSum / cueCount : 0
      if (cueMean >= 0.55) {
        contributingCues.push(cueName)
      }
    }

    const agreementCount = contributingCues.length
    const agreementText = `${agreementCount} of ${totalCuesCount}`

    // Check overlap with face and boundary
    let overlapsFace = false
    let overlapsBoundary = false

    if (face && face.detected && face.box) {
      const [fx, fy, fw, fh] = face.box
      const [bx, by, bw, bh] = bbox

      // Box intersection test
      const intersectX = Math.max(0, Math.min(bx + bw, fx + fw) - Math.max(bx, fx))
      const intersectY = Math.max(0, Math.min(by + bh, fy + fh) - Math.max(by, fy))
      if (intersectX > 0 && intersectY > 0) {
        overlapsFace = true
        if (face.boundaryScore >= 0.5) {
          overlapsBoundary = true
        }
      }
    }

    // Confidence scoring
    // high = agreement >= 3 of 4 AND (face-overlap with boundaryScore >= 0.6 OR mean >= 0.8)
    // medium = agreement >= 2 and mean >= 0.65
    // else low
    let confidence: "high" | "medium" | "low" = "low"
    if (
      agreementCount >= Math.min(3, totalCuesCount) &&
      ((overlapsFace && (face?.boundaryScore ?? 0) >= 0.6) || meanScore >= 0.8)
    ) {
      confidence = "high"
    } else if (agreementCount >= 2 && meanScore >= 0.65) {
      confidence = "medium"
    }

    // Plain language hedged description
    let description = "Independent statistical checks suggest inconsistency in this region."
    if (contributingCues.length >= 3) {
      description = `Several independent checks (${contributingCues.join(", ").toLowerCase()}) disagree with the rest of the image here.`
    } else if (overlapsFace) {
      description = "Forensic features along the facial region show noticeable variation compared to surrounding context."
    }

    results.push({
      id: rIdx + 1,
      bbox,
      polygon: normalizedPoly,
      areaPct: Number(areaPct.toFixed(2)),
      meanScore: Number(meanScore.toFixed(3)),
      agreementCount,
      agreementText,
      cuesContributed: contributingCues,
      overlapsFace,
      overlapsBoundary,
      confidence,
      description,
    })
  }

  return results
}
