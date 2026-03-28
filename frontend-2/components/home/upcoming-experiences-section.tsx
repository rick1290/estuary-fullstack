"use client"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getServiceDetailUrl } from "@/lib/service-utils"
import { useQuery } from "@tanstack/react-query"
import { publicServicesListOptions } from "@/src/client/@tanstack/react-query.gen"

export default function UpcomingExperiencesSection() {
  const { data, isLoading, isError } = useQuery(
    publicServicesListOptions({
      query: {
        page_size: 5,
        ordering: "next_session_date",
        is_active: true,
        is_public: true,
        exclude_types: "session",
      },
    })
  )

  const services = data?.results ?? []

  // Hide section entirely if no data or error
  if (isError) return null
  if (!isLoading && services.length === 0) return null

  const featured = services[0]
  const regular = services.slice(1, 5)

  const formatPrice = (service: (typeof services)[0]) => {
    if (service.price) return `$${service.price}`
    if (service.price_cents) return `$${(service.price_cents / 100).toFixed(0)}`
    return "Free"
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return "TBD"
    const d = new Date(date)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const formatType = (code?: string) => {
    if (!code) return "Experience"
    return code.charAt(0).toUpperCase() + code.slice(1)
  }

  if (isLoading) {
    return (
      <section className="py-20 md:py-24 bg-muted/20 relative overflow-hidden">
        <div className="container relative z-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Experiences to Nurture Your Growth</h2>
            <div className="h-1 w-20 bg-primary/80 mx-auto rounded-full mb-4"></div>
            <p className="text-muted-foreground max-w-[700px] mx-auto">
              Discover transformative sessions, courses, and workshops designed to support your unique path to wellness
              and personal development.
            </p>
          </div>
          <div className="mb-24 w-full md:w-[80%] mx-auto hidden md:block">
            <Skeleton className="h-[360px] w-full rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[320px] rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 md:py-24 bg-muted/20 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-green-500/5 blur-3xl top-[10%] right-[-200px] z-0" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-orange-500/5 blur-3xl bottom-[5%] left-[-100px] z-0" />

      <div className="container relative z-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Experiences to Nurture Your Growth</h2>
          <div className="h-1 w-20 bg-primary/80 mx-auto rounded-full mb-4"></div>
          <p className="text-muted-foreground max-w-[700px] mx-auto">
            Discover transformative sessions, courses, and workshops designed to support your unique path to wellness
            and personal development.
          </p>
        </div>

        <div className="relative mt-8">
          {/* Featured Experience (Larger Card) */}
          {featured && (
            <div className="mb-24 w-full md:w-[80%] mx-auto hidden md:block">
              <Card className="rounded-xl overflow-hidden shadow-md transition-transform duration-300 hover:translate-y-[-8px] hover:shadow-lg">
                <div className="relative h-[240px]">
                  <Image
                    src={featured.image_url || featured.primary_image || "/placeholder.svg"}
                    alt={featured.name}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <Badge className="absolute top-4 right-4 bg-orange-500 hover:bg-orange-600">Featured</Badge>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-semibold">{featured.name}</h3>
                    <p className="text-sm">with {featured.primary_practitioner?.display_name || "Practitioner"}</p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8">
                      <p className="mb-4 text-muted-foreground">
                        {featured.short_description || featured.description || "Join this transformative experience."}
                      </p>
                      <div className="flex items-center mb-1">
                        <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                        <p className="text-sm text-muted-foreground">
                          {formatDate(featured.next_session_date || featured.first_session_date)}
                          {" \u2022 "}
                          {featured.location_type === "in_person" ? "In-person" : featured.location_type === "hybrid" ? "Hybrid" : "Virtual"}
                          {featured.duration_display ? ` \u2022 ${featured.duration_display}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-4 flex flex-col justify-between">
                      {featured.max_participants && (
                        <div className="flex justify-end">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {formatType(featured.service_type_code)}
                          </Badge>
                        </div>
                      )}
                      <div className="flex flex-col items-end mt-2">
                        <p className="text-xl font-semibold text-green-700">{formatPrice(featured)}</p>
                        <Button className="mt-2 rounded-full" asChild>
                          <Link href={getServiceDetailUrl({ id: featured.id, slug: featured.slug, service_type_code: featured.service_type_code })}>Learn More</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Regular Experience Cards */}
          {regular.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {regular.map((service) => (
                <Card
                  key={service.id}
                  className="h-full flex flex-col rounded-xl overflow-hidden transition-all duration-300 hover:translate-y-[-8px] hover:shadow-md"
                >
                  <div className="relative h-[160px]">
                    <Image
                      src={service.image_url || service.primary_image || "/placeholder.svg"}
                      alt={service.name}
                      fill
                      className="object-cover"
                    />
                    <Badge className="absolute top-3 right-3 bg-background/90 text-foreground hover:bg-background/80">
                      {formatType(service.service_type_code)}
                    </Badge>
                  </div>
                  <CardContent className="flex-grow flex flex-col p-4">
                    <div className="flex-grow">
                      <div className="min-h-[3rem] mb-2">
                        <h3 className="text-lg font-medium leading-snug">{service.name}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2">
                        with {service.primary_practitioner?.display_name || "Practitioner"}
                      </p>

                      <div className="flex items-center mb-1 mt-3">
                        <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                        <p className="text-sm text-muted-foreground">
                          Starts {formatDate(service.next_session_date || service.first_session_date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {service.location_type === "in_person" ? "In-person" : "Virtual"}
                      </Badge>
                      <p className="text-lg font-semibold text-green-700">{formatPrice(service)}</p>
                    </div>
                  </CardContent>
                  <div className="p-3 pt-0">
                    <Button variant="outline" className="w-full rounded-full" asChild>
                      <Link href={getServiceDetailUrl({ id: service.id, slug: service.slug, service_type_code: service.service_type_code })}>Learn More</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Button className="rounded-full" asChild>
              <Link href="/marketplace">
                Discover All Experiences
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
