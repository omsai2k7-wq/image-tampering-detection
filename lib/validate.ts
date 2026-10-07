export const MAX_UPLOAD_MB = 8
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export type ValidatedMime = "image/jpeg" | "image/png" | "image/webp"

export interface ValidationResult {
  valid: boolean
  error?: {
    status: number
    code: string
    message: string
  }
  mime?: ValidatedMime
}

export function validateImageBuffer(buffer: Buffer): ValidationResult {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      error: {
        status: 400,
        code: "EMPTY_FILE",
        message: "The provided file is empty.",
      },
    }
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      error: {
        status: 413,
        code: "FILE_TOO_LARGE",
        message: `File size exceeds the maximum limit of ${MAX_UPLOAD_MB} MB.`,
      },
    }
  }

  // Magic bytes inspection
  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { valid: true, mime: "image/jpeg" }
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mime: "image/png" }
  }

  // WebP: RIFF ... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { valid: true, mime: "image/webp" }
  }

  return {
    valid: false,
    error: {
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "Unsupported file format. Please upload a JPEG, PNG, or WebP image.",
    },
  }
}
