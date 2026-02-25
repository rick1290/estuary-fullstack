import { createMetadata } from "@/lib/seo"
import BecomePractitionerPage from "./become-practitioner-client"

export const metadata = createMetadata({
  title: "Become a Practitioner",
  description:
    "Join Estuary and grow your wellness practice with zero monthly fees. Sessions, workshops, courses, and community — all in one platform.",
  path: "/become-practitioner",
})

export default function BecomePractitioner() {
  return <BecomePractitionerPage />
}
