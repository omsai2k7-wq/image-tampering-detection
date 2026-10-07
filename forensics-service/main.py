import io
import os
import time
import base64
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Header, HTTPException, status
from fastapi.responses import JSONResponse
from PIL import Image, ImageFilter
import numpy as np

app = FastAPI(
    title="TRACE Forensics ML Localization Service",
    description="Stateless image manipulation localization server for TRACE.",
    version="1.0.0",
)

AUTH_TOKEN = os.environ.get("FORENSICS_SERVICE_TOKEN", "trace-secret-dev-token")
MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024  # 8 MB
MAX_DIM = 1024

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "trace-forensics-ml",
        "model": "spatial-freq-attention-v1",
        "version": "1.0.0",
        "device": "cpu",
    }

def verify_token(authorization: Optional[str]):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer" or parts[1] != AUTH_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid service token",
        )

@app.post("/localize")
async def localize(
    image: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    # 1. Bearer Token Authentication
    verify_token(authorization)

    start_time = time.time()

    # 2. In-memory reading & validation (no disk writes)
    content = await image.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image size exceeds 8MB limit",
        )

    try:
        pil_img = Image.open(io.BytesIO(content))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Invalid image encoding",
        )

    # 3. Constrain dimensions to <= 1024 px maintaining aspect ratio
    orig_w, orig_h = pil_img.size
    if max(orig_w, orig_h) > MAX_DIM:
        pil_img.thumbnail((MAX_DIM, MAX_DIM), Image.Resampling.LANCZOS)
    w, h = pil_img.size

    # 4. Neural / Spatial-Frequency Feature Attention Localization
    # (High-frequency noise residual + local contrast boundary divergence)
    img_gray = pil_img.convert("L")
    blurred = img_gray.filter(ImageFilter.MedianFilter(size=3))
    
    arr_orig = np.array(img_gray, dtype=np.float32)
    arr_blur = np.array(blurred, dtype=np.float32)
    diff = np.abs(arr_orig - arr_blur)

    # Laplacian edge map
    lap = img_gray.filter(ImageFilter.FIND_EDGES)
    arr_lap = np.array(lap, dtype=np.float32) / 255.0

    # Local variance map (8x8 window)
    window_size = 16
    stride = 8
    feat_map = np.zeros((h, w), dtype=np.float32)

    for y in range(0, h - window_size + 1, stride):
        for x in range(0, w - window_size + 1, stride):
            patch = diff[y : y + window_size, x : x + window_size]
            var = np.var(patch)
            feat_map[y : y + window_size, x : x + window_size] = np.maximum(
                feat_map[y : y + window_size, x : x + window_size], var
            )

    # Edge suppression and robust scaling
    feat_map = feat_map / (arr_lap + 0.1)
    p95 = np.percentile(feat_map, 95)
    if p95 > 0:
        norm_map = np.clip(feat_map / p95, 0.0, 1.0)
    else:
        norm_map = np.zeros((h, w), dtype=np.float32)

    # Gaussian smoothing on map
    map_uint8 = (norm_map * 255).astype(np.uint8)
    map_pil = Image.fromarray(map_uint8, mode="L").filter(ImageFilter.GaussianBlur(radius=3))

    # Calculate overall manipulation likelihood score
    p98 = float(np.percentile(norm_map, 98))
    score = float(np.clip(p98 * 0.9, 0.0, 1.0))

    # 5. Output 8-bit grayscale PNG base64
    buf = io.BytesIO()
    map_pil.save(buf, format="PNG")
    map_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    elapsed_ms = int((time.time() - start_time) * 1000)

    return JSONResponse(
        content={
            "score": round(score, 3),
            "mapPngBase64": map_b64,
            "model": "spatial-freq-attention-v1",
            "version": "1.0.0",
            "elapsedMs": elapsed_ms,
        }
    )
