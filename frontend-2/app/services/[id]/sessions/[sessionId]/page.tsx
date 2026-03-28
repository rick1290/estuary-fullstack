import { redirect } from "next/navigation"

/**
 * Legacy route — redirects to the service detail page.
 * Sessions are now accessed via /sessions/[slug] or /workshops/[slug] etc.
 */
export default function SessionPage({
  params,
}: {
  params: { id: string; sessionId: string }
}) {
  // Redirect to the parent service page
  redirect(`/services/${params.id}`)
}
