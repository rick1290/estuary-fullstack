import { redirect } from "next/navigation"

// Redirect old create URL to new flow
export default function CreateServicePage() {
  redirect("/dashboard/practitioner/services/new")
}
