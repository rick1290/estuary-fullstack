import { Suspense } from "react"
import StreamDetailContent from "@/components/streams/stream-detail-content"
import LoadingSpinner from "@/components/ui/loading-spinner"

export default function StreamDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StreamDetailContent streamId={params.id} />
    </Suspense>
  )
}