import type { Metadata } from "next"
import PractitionerMessagesList from "@/components/dashboard/practitioner/messages/practitioner-messages-list"
import PractitionerMessageDetail from "@/components/dashboard/practitioner/messages/practitioner-message-detail"

export const metadata: Metadata = {
  title: "Messages | Practitioner Portal",
  description: "Manage your client communications",
}

export default function PractitionerMessagesPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] -mt-6 -mx-6 overflow-hidden">
      <div className="w-full md:w-1/3 border-r border-border">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        </div>
        <PractitionerMessagesList />
      </div>
      <div className="hidden md:block w-2/3">
        <PractitionerMessageDetail />
      </div>
    </div>
  )
}
