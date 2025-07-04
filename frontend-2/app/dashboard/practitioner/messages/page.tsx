import type { Metadata } from "next"
import MessagesPageV2 from "./page-v2"

export const metadata: Metadata = {
  title: "Messages | Practitioner Dashboard",
  description: "Communicate with your clients.",
}

export default function MessagesPage() {
  return <MessagesPageV2 />
}