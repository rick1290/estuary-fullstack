import Image from "next/image"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50/30 to-white">
      <div className="container max-w-5xl py-16">
        <Breadcrumb className="mb-12">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="text-gray-600 hover:text-gray-900">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href="/about" className="text-gray-900 font-medium">About Us</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-20">
          <section className="text-center">
            <h1 className="text-5xl md:text-6xl font-medium tracking-tight mb-6">About Estuary</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Your sanctuary for wellness, growth, and meaningful connections.
            </p>
          </section>

        <div className="relative h-[400px] rounded-xl overflow-hidden">
          <Image
            src="/diverse-group-city.png"
            alt="Diverse group of people in a city setting"
            fill
            className="object-cover"
          />
        </div>

        <section className="grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl font-medium mb-6">Our Story</h2>
            <p className="mb-4 text-gray-600 leading-relaxed">
              Estuary was founded in 2020 with a simple yet powerful vision: to create a space where individuals could
              access holistic wellness services and connect with skilled practitioners in a seamless, supportive
              environment.
            </p>
            <p className="text-gray-600 leading-relaxed">
              What began as a small community of dedicated practitioners has grown into a thriving marketplace that
              connects thousands of clients with transformative wellness experiences every day.
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-medium mb-6">Our Philosophy</h2>
            <p className="mb-4 text-gray-600 leading-relaxed">
              At Estuary, we believe that wellness is not one-size-fits-all. Each person's journey is unique, requiring
              personalized approaches and diverse modalities to support true healing and growth.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We're committed to making holistic wellness accessible, approachable, and integrated into everyday life,
              empowering individuals to take an active role in their wellbeing.
            </p>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-2xl font-semibold mb-6 text-center">Our Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Authenticity",
                description: "We foster genuine connections and encourage everyone to show up as their true selves.",
              },
              {
                title: "Inclusivity",
                description: "We create spaces where everyone feels welcome, valued, and respected.",
              },
              {
                title: "Growth",
                description: "We believe in continuous learning, evolution, and transformation.",
              },
              {
                title: "Empowerment",
                description: "We provide tools and support for individuals to take charge of their wellness journey.",
              },
              {
                title: "Community",
                description: "We build meaningful connections that nurture and sustain collective wellbeing.",
              },
              {
                title: "Excellence",
                description: "We uphold high standards in all our services, interactions, and experiences.",
              },
            ].map((value, index) => (
              <div key={index} className="bg-[rgba(245,240,235,0.5)] p-6 rounded-lg">
                <h3 className="text-xl font-medium mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[rgba(245,240,235,0.7)] p-8 rounded-xl">
          <h2 className="text-2xl font-semibold mb-6 text-center">Our Team</h2>
          <p className="text-center mb-8">
            Estuary is powered by a diverse team of passionate individuals dedicated to transforming how people access
            and experience wellness services.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Sarah Chen",
                role: "Founder & CEO",
                image: "/practitioner-1.jpg",
              },
              {
                name: "Michael Rodriguez",
                role: "Chief Wellness Officer",
                image: "/practitioner-2.jpg",
              },
              {
                name: "Aisha Johnson",
                role: "Head of Practitioner Relations",
                image: "/practitioner-3.jpg",
              },
              {
                name: "David Kim",
                role: "Chief Technology Officer",
                image: "/practitioner-4.jpg",
              },
            ].map((member, index) => (
              <div key={index} className="text-center">
                <div className="relative h-40 w-40 mx-auto mb-4">
                  <Image
                    src={member.image || "/placeholder.svg"}
                    alt={member.name}
                    fill
                    className="object-cover rounded-full"
                  />
                </div>
                <h3 className="font-medium">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </div>
            ))}
          </div>
        </section>
        </div>
      </div>
    </div>
  )
}
