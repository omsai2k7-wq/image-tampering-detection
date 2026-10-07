import type { Metadata } from "next"
import "./globals.css"
import SmoothScroll from "@/components/shared/SmoothScroll"
import Providers from "@/components/shared/Providers"
import CopyGuard from "@/components/shared/CopyGuard"

export const metadata: Metadata = {
  title: "TRACE — Every edit leaves a trace",
  description:
    "Check whether an image has been morphed, face-swapped or AI-generated. In seconds, in plain language, with clear next steps.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark antialiased">
      <body className="min-h-full flex flex-col bg-transparent text-[#E9ECF5]">
        <CopyGuard />
        <Providers>
          <SmoothScroll>{children}</SmoothScroll>
        </Providers>
      </body>
    </html>
  )
}
