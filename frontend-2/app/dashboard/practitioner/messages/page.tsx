import type { Metadata } from "next"
import PractitionerMessagesList from "@/components/dashboard/practitioner/messages/practitioner-messages-list"
import PractitionerMessageDetail from "@/components/dashboard/practitioner/messages/practitioner-message-detail"

export const metadata: Metadata = {
  title: "Messages | Practitioner Portal",
  description: "Manage your client communications",
}

export default function PractitionerMessagesPage() {
  return (
    <div className="flex h-[calc(100vh-10rem)] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden border-2 border-sage-200 rounded-xl bg-white/80 backdrop-blur-sm">
      <div className="w-full md:w-1/3 border-r border-sage-200">
        <div className="p-4 border-b border-sage-200 bg-sage-50">
          <h1 className="text-2xl font-medium tracking-tight text-olive-900">Messages</h1>
        </div>
        <PractitionerMessagesList />
      </div>
      <div className="hidden md:block w-2/3">
        <PractitionerMessageDetail />
      </div>
    </div>
  )
}
