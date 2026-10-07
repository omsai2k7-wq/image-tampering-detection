import fs from "fs"
import path from "path"
import https from "https"

const PUBLIC_DIR = path.resolve(process.cwd(), "public", "mediapipe")
const WASM_SRC = path.resolve(process.cwd(), "node_modules", "@mediapipe", "tasks-vision", "wasm")
const WASM_DEST = path.join(PUBLIC_DIR, "wasm")

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true })
}
if (!fs.existsSync(WASM_DEST)) {
  fs.mkdirSync(WASM_DEST, { recursive: true })
}

// 1. Copy WASM assets
if (fs.existsSync(WASM_SRC)) {
  const files = fs.readdirSync(WASM_SRC)
  for (const file of files) {
    const src = path.join(WASM_SRC, file)
    const dst = path.join(WASM_DEST, file)
    fs.copyFileSync(src, dst)
  }
  console.log(`Copied ${files.length} wasm files to public/mediapipe/wasm/`)
} else {
  console.warn("WASM source not found in node_modules/@mediapipe/tasks-vision/wasm")
}

// 2. Download face_landmarker.task
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
const MODEL_DEST = path.join(PUBLIC_DIR, "face_landmarker.task")

async function downloadModel() {
  if (fs.existsSync(MODEL_DEST) && fs.statSync(MODEL_DEST).size > 1000000) {
    console.log("face_landmarker.task already exists at " + MODEL_DEST)
    return
  }

  console.log("Downloading face_landmarker.task from official MediaPipe storage...")
  const file = fs.createWriteStream(MODEL_DEST)
  return new Promise((resolve, reject) => {
    https.get(MODEL_URL, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectRes) => {
          redirectRes.pipe(file)
          file.on("finish", () => {
            file.close()
            console.log("Downloaded face_landmarker.task successfully.")
            resolve()
          })
        }).on("error", reject)
      } else if (response.statusCode === 200) {
        response.pipe(file)
        file.on("finish", () => {
          file.close()
          console.log("Downloaded face_landmarker.task successfully.")
          resolve()
        })
      } else {
        reject(new Error(`Failed to download: status code ${response.statusCode}`))
      }
    }).on("error", (err) => {
      fs.unlink(MODEL_DEST, () => {})
      reject(err)
    })
  })
}

downloadModel()
  .then(() => console.log("MediaPipe assets ready."))
  .catch((err) => {
    console.error("Error fetching model:", err.message)
    // Don't exit with 1 if offline, but log error
  })
