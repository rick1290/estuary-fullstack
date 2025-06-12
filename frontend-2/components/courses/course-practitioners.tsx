import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar } from "@/components/ui/avatar"
import Link from "next/link"

interface CoursePractitionersProps {
  practitioners: any[]
}

export default function CoursePractitioners({ practitioners }: CoursePractitionersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{practitioners.length > 1 ? "Course Instructors" : "Course Instructor"}</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        {practitioners.map((practitioner) => (
          <div key={practitioner.id} className={practitioner.isPrimary && practitioners.length > 1 ? "mb-6" : ""}>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <img
                  src={practitioner.image || "/placeholder.svg"}
                  alt={practitioner.name}
                  className="aspect-square h-full w-full object-cover"
                />
              </Avatar>
              <div>
                <Link href={`/practitioners/${practitioner.id}`} className="font-medium text-primary hover:underline">
                  {practitioner.name}
                </Link>
                <p className="text-sm text-muted-foreground">{practitioner.title}</p>
              </div>
            </div>
            {practitioner.bio && <p className="mt-2 text-sm">{practitioner.bio}</p>}
            {practitioner.isPrimary && practitioners.length > 1 && <Separator className="my-4" />}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
