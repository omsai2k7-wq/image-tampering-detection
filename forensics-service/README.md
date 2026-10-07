# TRACE Forensics ML Localization Service

A stateless, lightweight Python FastAPI microservice that performs image manipulation localization and generates 8-bit grayscale anomaly masks for the TRACE forensic pipeline.

## Endpoints

- `GET /health` — Health check returning service status, model metadata, and version.
- `POST /localize` — Accepts `multipart/form-data` with an `image` file and a `Bearer <FORENSICS_SERVICE_TOKEN>` authorization header. Returns:
  ```json
  {
    "score": 0.78,
    "mapPngBase64": "...",
    "model": "spatial-freq-attention-v1",
    "version": "1.0.0",
    "elapsedMs": 142
  }
  ```

## Security & Privacy Isolation
- Server-to-server only; no CORS enabled.
- Images are processed strictly in volatile RAM and never persisted to disk or logs.
- Maximum payload limit: 8 MB.
- Maximum internal resolution: 1024 px on the longest side.

## Running Locally

```bash
cd forensics-service
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
export FORENSICS_SERVICE_TOKEN=your-secret-token
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Running with Docker

```bash
docker build -t trace-forensics-service .
docker run -p 8000:8000 -e FORENSICS_SERVICE_TOKEN=your-secret-token trace-forensics-service
```
