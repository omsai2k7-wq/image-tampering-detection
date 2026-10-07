import { describe, it, expect } from "vitest"
import {
  generateCleanImage,
  generateSpliceTamper,
  generateBlurTamper,
  generateResizeTamper,
  calculateBboxMaskIoU,
} from "@/lib/forensics/synthetic"
import { runForensicsPipeline } from "@/lib/forensics/pipeline"
import { computeJpegGhost } from "@/lib/forensics/ghost"

describe("Forensics Multi-Cue Verification Pipeline", () => {
  it("a) Clean smooth-gradient + noise image: asserts no region is flagged", async () => {
    const cleanImg = generateCleanImage(256, 256, 3)
    const report = await runForensicsPipeline(cleanImg, "jpeg")

    expect(report.fused.regions.length).toBe(0)
    expect(report.fused.dominantAnomaly).toBeLessThan(0.70)
  })

  it("b) Splice test: asserts at least one flagged region overlaps the patch with IoU > 0.2", async () => {
    const spliceData = generateSpliceTamper(256, 256, 60, 60, 80, 80)
    const report = await runForensicsPipeline(spliceData.image, "jpeg")

    expect(report.fused.regions.length).toBeGreaterThan(0)
    const overlaps = report.fused.regions.some((region) => {
      const iou = calculateBboxMaskIoU(region.bbox, spliceData.gtMask, 256, 256)
      return iou > 0.20
    })
    expect(overlaps).toBe(true)
  })

  it("c) Blur-region test and Resize-patch test produce detectable anomalies", async () => {
    // Blur test
    const blurData = generateBlurTamper(256, 256, 70, 70, 75, 75)
    const blurReport = await runForensicsPipeline(blurData.image, "jpeg")
    expect(blurReport.fused.dominantAnomaly).toBeGreaterThan(0.40)

    // Resize test
    const resizeData = generateResizeTamper(256, 256, 65, 65, 75, 75)
    const resizeReport = await runForensicsPipeline(resizeData.image, "jpeg")
    expect(resizeReport.fused.dominantAnomaly).toBeGreaterThan(0.40)
  })

  it("d) PNG input: the ghost cue reports 'Not applicable'", async () => {
    const cleanImg = generateCleanImage(128, 128, 2)
    const ghostResult = computeJpegGhost(cleanImg, "png")

    expect(ghostResult.isApplicable).toBe(false)
    expect(ghostResult.note).toContain("Not applicable")
    expect(ghostResult.coveragePct).toBe(0)
  })
})
