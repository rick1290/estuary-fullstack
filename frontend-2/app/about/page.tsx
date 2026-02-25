import { createMetadata } from "@/lib/seo"
import AboutPage from "./about-client"

export const metadata = createMetadata({
  title: "About Us",
  description:
    "Learn how Estuary was built to be the home wellness practitioners always needed — infrastructure that honors healing work, not a patchwork of generic tools.",
  path: "/about",
})

export default function About() {
  return <AboutPage />
}
