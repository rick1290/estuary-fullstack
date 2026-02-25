import { createMetadata } from "@/lib/seo"
import ContactPage from "./contact-client"

export const metadata = createMetadata({
  title: "Contact Us",
  description:
    "Get in touch with the Estuary team. We read every message — whether you have a question, feedback, or partnership inquiry.",
  path: "/contact",
})

export default function Contact() {
  return <ContactPage />
}
