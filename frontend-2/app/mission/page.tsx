import Image from "next/image"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight, Heart, Users, Globe, Shield, Leaf, Zap } from "lucide-react"

export default function MissionPage() {
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
            <BreadcrumbLink href="/mission">Our Mission</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-12">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Our Mission</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            To create a world where holistic wellness is accessible to all, empowering individuals to live with greater
            balance, purpose, and joy.
          </p>
        </section>

        <div className="relative h-[400px] rounded-xl overflow-hidden">
          <Image src="/serene-meditation-space.png" alt="Serene meditation space" fill className="object-cover" />
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-6 text-center">Our Vision</h2>
          <div className="bg-[rgba(245,240,235,0.7)] p-8 rounded-xl">
            <p className="text-xl text-center">
              We envision a future where holistic wellness practices are integrated into everyday life, where
              practitioners are valued for their unique gifts, and where communities thrive through meaningful
              connections and shared growth.
            </p>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-2xl font-semibold mb-6 text-center">Our Commitments</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: <Heart className="h-8 w-8 text-rose-500" />,
                title: "Holistic Wellbeing",
                description:
                  "We're committed to supporting the whole person—mind, body, and spirit—through diverse modalities and personalized approaches.",
              },
              {
                icon: <Users className="h-8 w-8 text-blue-500" />,
                title: "Community Connection",
                description:
                  "We foster meaningful relationships between practitioners and clients, creating a supportive ecosystem for growth and healing.",
              },
              {
                icon: <Globe className="h-8 w-8 text-emerald-500" />,
                title: "Accessibility",
                description:
                  "We're dedicated to making wellness services accessible to diverse populations through technology, education, and inclusive practices.",
              },
              {
                icon: <Shield className="h-8 w-8 text-purple-500" />,
                title: "Practitioner Support",
                description:
                  "We empower wellness professionals with the tools, resources, and community they need to thrive in their practice and expand their impact.",
              },
            ].map((commitment, index) => (
              <div key={index} className="flex gap-4">
                <div className="shrink-0 bg-white p-4 rounded-full shadow-sm">{commitment.icon}</div>
                <div>
                  <h3 className="text-xl font-medium mb-2">{commitment.title}</h3>
                  <p className="text-muted-foreground">{commitment.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[rgba(245,240,235,0.5)] p-8 rounded-xl">
          <h2 className="text-2xl font-semibold mb-6 text-center">Our Impact Goals</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: <Leaf className="h-6 w-6 text-emerald-500" />,
                title: "Environmental Sustainability",
                description:
                  "We're committed to operating in ways that minimize our environmental footprint and promote sustainable practices within our community.",
              },
              {
                icon: <Zap className="h-6 w-6 text-amber-500" />,
                title: "Wellness Education",
                description:
                  "We aim to educate and empower individuals with knowledge about holistic health practices that can enhance their wellbeing.",
              },
            ].map((goal, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  {goal.icon}
                  <h3 className="text-lg font-medium">{goal.title}</h3>
                </div>
                <p className="text-muted-foreground">{goal.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Join Our Journey</h2>
          <p className="mb-6 max-w-3xl mx-auto">
            Whether you're seeking wellness services, offering your expertise as a practitioner, or simply curious about
            holistic health, we invite you to be part of our growing community.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/practitioners"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Find a Practitioner
            </a>
            <a
              href="/become-practitioner"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Become a Practitioner
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
