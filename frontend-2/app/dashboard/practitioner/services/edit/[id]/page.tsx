import { redirect } from "next/navigation"

export default function EditServiceRedirect({ params }: { params: { id: string } }) {
  redirect(`/dashboard/practitioner/services/${params.id}`)
}
