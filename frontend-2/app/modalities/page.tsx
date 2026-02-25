import { createMetadata } from "@/lib/seo"
import ModalityIndexContent from "@/components/modalities/modality-index-content"

export const metadata = createMetadata({
  title: "Wellness Modalities",
  description:
    "Explore wellness modalities on Estuary — yoga, breathwork, meditation, coaching, and more. Find the practice that resonates with your journey.",
  path: "/modalities",
})

export default function ModalitiesPage() {
  return <ModalityIndexContent />
}
