import PractitionerFeed from "../../estuary-streams/practitioner-feed"

interface EstuaryTabProps {
  practitionerId: string
  practitionerName: string
  practitionerImage?: string
}

export default function EstuaryTab({ practitionerId, practitionerName, practitionerImage }: EstuaryTabProps) {
  return (
    <div>
      <PractitionerFeed
        practitionerId={practitionerId}
        practitionerName={practitionerName}
        practitionerImage={practitionerImage}
      />
    </div>
  )
}
