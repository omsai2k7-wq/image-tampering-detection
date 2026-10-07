"use client"

import { useEffect } from "react"

// This client-side guard deters casual copying and does not prevent screenshots, dev tools, or view-source.
export default function CopyGuard() {
  useEffect(() => {
    const isAllowed = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false
      return Boolean(
        target.closest("input, textarea, [contenteditable='true'], [contenteditable=''], .selectable")
      )
    }

    const handleCopy = (e: ClipboardEvent) => {
      if (!isAllowed(e.target)) {
        e.preventDefault()
      }
    }

    const handleCut = (e: ClipboardEvent) => {
      if (!isAllowed(e.target)) {
        e.preventDefault()
      }
    }

    const handleDragStart = (e: DragEvent) => {
      if (!isAllowed(e.target)) {
        e.preventDefault()
      }
    }

    const handleSelectStart = (e: Event) => {
      if (!isAllowed(e.target)) {
        e.preventDefault()
      }
    }

    document.addEventListener("copy", handleCopy)
    document.addEventListener("cut", handleCut)
    document.addEventListener("dragstart", handleDragStart)
    document.addEventListener("selectstart", handleSelectStart)

    return () => {
      document.removeEventListener("copy", handleCopy)
      document.removeEventListener("cut", handleCut)
      document.removeEventListener("dragstart", handleDragStart)
      document.removeEventListener("selectstart", handleSelectStart)
    }
  }, [])

  return null
}
