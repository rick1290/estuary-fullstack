"use client"

import PractitionerStreamsPreview from "../practitioner-streams-preview"

interface EstuaryTabProps {
  practitionerId: string | number
  practitionerName: string
  practitionerSlug?: string
  practitionerImage?: string
}

export default function EstuaryTab({
  practitionerId,
  practitionerName,
  practitionerSlug,
  practitionerImage
}: EstuaryTabProps) {
  return (
    <div className="py-2">
      <PractitionerStreamsPreview
        practitionerId={practitionerId}
        practitionerName={practitionerName}
        practitionerSlug={practitionerSlug}
      />
    </div>
  )
}
