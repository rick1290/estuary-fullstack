import { createMetadata } from "@/lib/seo"
import { organizationSchema, websiteSchema } from "@/lib/json-ld"
import { JsonLd } from "@/components/seo/json-ld"
import Home from "./home-client"

export const metadata = createMetadata({
  title: "Wellness Marketplace for Transformative Experiences",
  description:
    "Connect with expert practitioners and book transformative wellness services — sessions, workshops, and courses — all in one place.",
  path: "/",
})

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <Home />
    </>
  )
}
