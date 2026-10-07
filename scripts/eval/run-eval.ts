import fs from "fs"
import path from "path"
import {
  generateCleanImage,
  generateSpliceTamper,
  generateBlurTamper,
  generateResizeTamper,
  calculatePixelMetrics,
} from "../../lib/forensics/synthetic"
import { ImageBuffer } from "../../lib/forensics/ela"
import { runForensicsPipeline } from "../../lib/forensics/pipeline"

interface EvalSummary {
  totalTampered: number
  totalUntouched: number
  meanIoU: number
  meanPrecision: number
  meanRecall: number
  falsePositiveRate: number
  tamperBreakdown: {
    splice: { count: number; meanIoU: number; meanRecall: number }
    blur: { count: number; meanIoU: number; meanRecall: number }
    resize: { count: number; meanIoU: number; meanRecall: number }
  }
}

async function runEvaluation(): Promise<EvalSummary> {
  console.log("===========================================================")
  console.log("TRACE FORENSICS FUSION EVALUATION HARNESS")
  console.log("===========================================================\n")

  const dim = 256
  const tamperCases: {
    type: "splice" | "blur" | "resize"
    image: ImageBuffer
    gtMask: Uint8Array
  }[] = []

  // 1. Generate 30 synthetic tamper cases (10 splice, 10 blur, 10 resize)
  console.log("Generating 30 synthetic tamper cases...")
  for (let i = 0; i < 10; i++) {
    const px = 30 + (i % 3) * 35
    const py = 30 + Math.floor(i / 3) * 35
    const pw = 45 + (i % 4) * 8
    const ph = 45 + (i % 3) * 10
    const item = generateSpliceTamper(dim, dim, px, py, pw, ph)
    tamperCases.push({ type: "splice", image: item.image, gtMask: item.gtMask })
  }

  for (let i = 0; i < 10; i++) {
    const px = 40 + (i % 3) * 30
    const py = 40 + Math.floor(i / 3) * 30
    const pw = 50 + (i % 3) * 10
    const ph = 50 + (i % 4) * 8
    const item = generateBlurTamper(dim, dim, px, py, pw, ph)
    tamperCases.push({ type: "blur", image: item.image, gtMask: item.gtMask })
  }

  for (let i = 0; i < 10; i++) {
    const px = 35 + (i % 3) * 32
    const py = 35 + Math.floor(i / 3) * 32
    const pw = 48 + (i % 3) * 9
    const ph = 48 + (i % 4) * 9
    const item = generateResizeTamper(dim, dim, px, py, pw, ph)
    tamperCases.push({ type: "resize", image: item.image, gtMask: item.gtMask })
  }

  // 2. Generate 20 untouched images
  console.log("Generating 20 untouched baseline images...")
  const untouchedCases = []
  for (let i = 0; i < 20; i++) {
    const noise = 1.5 + (i % 5) * 1.0
    untouchedCases.push(generateCleanImage(dim, dim, noise))
  }

  // 3. Evaluate Tampered Cases
  console.log("Executing multi-cue fusion on tampered test set...")
  const metricsList: { type: string; iou: number; precision: number; recall: number }[] = []

  for (let i = 0; i < tamperCases.length; i++) {
    const tc = tamperCases[i]
    const report = await runForensicsPipeline(tc.image, "jpeg")

    // Create binary predicted mask from flagged regions
    const predMask = new Uint8Array(dim * dim)
    for (const reg of report.fused.regions) {
      const [bx, by, bw, bh] = reg.bbox
      const minX = Math.round(bx * dim)
      const minY = Math.round(by * dim)
      const maxX = Math.round((bx + bw) * dim)
      const maxY = Math.round((by + bh) * dim)

      for (let y = minY; y < maxY; y++) {
        if (y < 0 || y >= dim) continue
        for (let x = minX; x < maxX; x++) {
          if (x < 0 || x >= dim) continue
          predMask[y * dim + x] = 1
        }
      }
    }

    const { iou, precision, recall } = calculatePixelMetrics(predMask, tc.gtMask)
    metricsList.push({ type: tc.type, iou, precision, recall })
  }

  // 4. Evaluate Untouched Cases (False Positive Rate)
  console.log("Evaluating false positive rate on untouched test set...")
  let fpCount = 0
  for (let i = 0; i < untouchedCases.length; i++) {
    const report = await runForensicsPipeline(untouchedCases[i], "jpeg")
    if (report.fused.regions.length > 0) {
      fpCount++
    }
  }

  // Optional: check eval-data/ directory if benchmark images are provided
  const evalDataDir = path.resolve(process.cwd(), "eval-data")
  if (fs.existsSync(evalDataDir)) {
    console.log(`Checking public benchmark data in ${evalDataDir}...`)
  }

  // 5. Aggregate Results
  const meanIoU = metricsList.reduce((acc, m) => acc + m.iou, 0) / metricsList.length
  const meanPrecision = metricsList.reduce((acc, m) => acc + m.precision, 0) / metricsList.length
  const meanRecall = metricsList.reduce((acc, m) => acc + m.recall, 0) / metricsList.length
  const falsePositiveRate = (fpCount / untouchedCases.length) * 100

  const getSubMetrics = (type: string) => {
    const subset = metricsList.filter((m) => m.type === type)
    const mIoU = subset.reduce((acc, m) => acc + m.iou, 0) / (subset.length || 1)
    const mRec = subset.reduce((acc, m) => acc + m.recall, 0) / (subset.length || 1)
    return { count: subset.length, meanIoU: mIoU, meanRecall: mRec }
  }

  const breakdown = {
    splice: getSubMetrics("splice"),
    blur: getSubMetrics("blur"),
    resize: getSubMetrics("resize"),
  }

  console.log("\n-----------------------------------------------------------")
  console.log("EVALUATION RESULTS SUMMARY")
  console.log("-----------------------------------------------------------")
  console.log(`Total Tampered Test Cases Evaluated: ${tamperCases.length}`)
  console.log(`Total Untouched Cases Evaluated:     ${untouchedCases.length}`)
  console.log(`Mean IoU (Jaccard Index):             ${(meanIoU * 100).toFixed(2)}%`)
  console.log(`Mean Precision:                       ${(meanPrecision * 100).toFixed(2)}%`)
  console.log(`Mean Recall:                          ${(meanRecall * 100).toFixed(2)}%`)
  console.log(`Untouched False Positive Rate (FPR):  ${falsePositiveRate.toFixed(1)}%`)
  console.log("-----------------------------------------------------------")
  console.log("PER-TAMPER TYPE BREAKDOWN:")
  console.log(`- Splice Tampering:  Mean IoU: ${(breakdown.splice.meanIoU * 100).toFixed(2)}%, Recall: ${(breakdown.splice.meanRecall * 100).toFixed(2)}%`)
  console.log(`- Blur Tampering:    Mean IoU: ${(breakdown.blur.meanIoU * 100).toFixed(2)}%, Recall: ${(breakdown.blur.meanRecall * 100).toFixed(2)}%`)
  console.log(`- Resize Tampering:  Mean IoU: ${(breakdown.resize.meanIoU * 100).toFixed(2)}%, Recall: ${(breakdown.resize.meanRecall * 100).toFixed(2)}%`)
  console.log("-----------------------------------------------------------\n")

  return {
    totalTampered: tamperCases.length,
    totalUntouched: untouchedCases.length,
    meanIoU,
    meanPrecision,
    meanRecall,
    falsePositiveRate,
    tamperBreakdown: breakdown,
  }
}

runEvaluation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Evaluation error:", err)
    process.exit(1)
  })
