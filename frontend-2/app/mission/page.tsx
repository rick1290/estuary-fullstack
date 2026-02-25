import { createMetadata } from "@/lib/seo"
import MissionPage from "./mission-client"

export const metadata = createMetadata({
  title: "Our Mission",
  description:
    "Estuary's mission is to make space for the work that heals the world — by giving practitioners the infrastructure they deserve.",
  path: "/mission",
})

export default function Mission() {
  return <MissionPage />
}
