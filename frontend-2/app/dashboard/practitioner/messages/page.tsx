import type { Metadata } from "next"
import MessagesClient from "./messages-client"

export const metadata: Metadata = {
  title: "Messages | Practitioner Dashboard",
  description: "Communicate with your clients.",
}

export default function MessagesPage() {
  return <MessagesClient />
}