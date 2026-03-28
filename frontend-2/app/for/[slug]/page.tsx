import { Metadata } from "next"
import { notFound } from "next/navigation"
import { modalitiesBySlugRetrieve } from "@/src/client/sdk.gen"
import PractitionerLandingClient from "./landing-client"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const { data: modality } = await modalitiesBySlugRetrieve({ path: { slug } })
    if (!modality) return {}
    const name = (modality as any).name || slug
    return {
      title: `Estuary for ${name} Practitioners — Grow Your Practice`,
      description: `The all-in-one platform for ${name} practitioners. Manage bookings, accept payments, host virtual sessions, and grow your practice — all in one place. Free to list, pay only when you earn.`,
      openGraph: {
        title: `Estuary for ${name} Practitioners`,
        description: `Everything you need to run your ${name} practice online. Booking, payments, video sessions, intake forms — zero monthly fees.`,
        type: "website",
      },
    }
  } catch {
    return {}
  }
}

export default async function PractitionerLandingPage({ params }: PageProps) {
  const { slug } = await params

  let modality: any = null
  try {
    const response = await modalitiesBySlugRetrieve({ path: { slug } })
    modality = response.data
  } catch {
    notFound()
  }

  if (!modality) notFound()

  return <PractitionerLandingClient modality={modality} />
}
