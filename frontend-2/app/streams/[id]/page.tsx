import type { Metadata } from "next"
import { Suspense } from "react"
import { createMetadata } from "@/lib/seo"
import StreamDetailContent from "@/components/streams/stream-detail-content"
import LoadingSpinner from "@/components/ui/loading-spinner"

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"

interface StreamDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: StreamDetailPageProps): Promise<Metadata> {
  const { id } = await params
  try {
    const res = await fetch(`${API_URL}/api/v1/stream-posts/${id}/`, {
      next: { revalidate: 600 },
    })
    if (!res.ok) return createMetadata({ title: "Stream Content", path: `/streams/${id}` })
    const json = await res.json()
    const post = json?.data || json
    return createMetadata({
      title: post?.title || "Stream Content",
      description: post?.excerpt || post?.content?.slice(0, 160) || "Wellness content from Estuary practitioners.",
      path: `/streams/${id}`,
      type: "article",
    })
  } catch {
    return createMetadata({ title: "Stream Content", path: `/streams/${id}` })
  }
}

export default async function StreamDetailPage({ params }: StreamDetailPageProps) {
  const { id } = await params
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StreamDetailContent streamId={id} />
    </Suspense>
  )
}
