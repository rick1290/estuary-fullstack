import Image from "next/image"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function CareersPage() {
  const departments = [
    {
      name: "Product & Engineering",
      description: "Build the technology that powers our wellness marketplace",
      image: "/abstract-dw.png",
    },
    {
      name: "Practitioner Success",
      description: "Support our practitioners in growing their practices",
      image: "/confident-professional.png",
    },
    {
      name: "Marketing & Growth",
      description: "Share our story and expand our community",
      image: "/diverse-fitness-group.png",
    },
    {
      name: "Operations",
      description: "Keep everything running smoothly behind the scenes",
      image: "/confident-leader.png",
    },
  ]

  const openPositions = [
    {
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "Remote (US)",
      type: "Full-time",
    },
    {
      title: "Practitioner Success Manager",
      department: "Practitioner Success",
      location: "New York, NY",
      type: "Full-time",
    },
    {
      title: "Content Marketing Specialist",
      department: "Marketing",
      location: "Remote (US)",
      type: "Full-time",
    },
    {
      title: "UX/UI Designer",
      department: "Product",
      location: "Remote (US)",
      type: "Full-time",
    },
    {
      title: "Community Manager",
      department: "Marketing",
      location: "Remote (US)",
      type: "Part-time",
    },
  ]

  return (
    <div className="container max-w-5xl py-12">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink href="/careers">Careers</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-12">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Join Our Team</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Help us transform the wellness industry and make holistic health accessible to all.
          </p>
        </section>

        <div className="relative h-[400px] rounded-xl overflow-hidden">
          <Image src="/diverse-medical-team.png" alt="Diverse team collaborating" fill className="object-cover" />
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-6 text-center">Why Work With Us</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Meaningful Impact",
                description:
                  "Your work directly contributes to improving people's wellbeing and supporting wellness practitioners.",
              },
              {
                title: "Growth & Development",
                description:
                  "We invest in your professional growth with learning stipends, mentorship, and career advancement opportunities.",
              },
              {
                title: "Wellness Benefits",
                description:
                  "Practice what we preach with wellness stipends, flexible work arrangements, and mental health support.",
              },
            ].map((benefit, index) => (
              <div key={index} className="bg-[rgba(245,240,235,0.5)] p-6 rounded-lg">
                <h3 className="text-xl font-medium mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-2xl font-semibold mb-6 text-center">Our Departments</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {departments.map((dept, index) => (
              <div key={index} className="relative overflow-hidden rounded-lg h-48 group">
                <Image
                  src={dept.image || "/placeholder.svg"}
                  alt={dept.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-6 text-white">
                  <h3 className="text-xl font-medium mb-1">{dept.name}</h3>
                  <p className="text-white/80 text-sm">{dept.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Open Positions</h2>
          <div className="space-y-4">
            {openPositions.map((position, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{position.title}</CardTitle>
                  <CardDescription>{position.department}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                      {position.location}
                    </span>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                      {position.type}
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Position <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-[rgba(245,240,235,0.7)] p-8 rounded-xl text-center">
          <h2 className="text-2xl font-semibold mb-4">Don't See a Perfect Fit?</h2>
          <p className="mb-6 max-w-3xl mx-auto">
            We're always looking for talented individuals who are passionate about wellness and technology. Send us your
            resume and let us know how you can contribute to our mission.
          </p>
          <Button>Submit General Application</Button>
        </section>
      </div>
    </div>
  )
}
