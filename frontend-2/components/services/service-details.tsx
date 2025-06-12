"use client"

import { useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Star, Calendar, GraduationCap, Clock, Check } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Service } from "@/types/service"
import { formatDate, formatTime } from "@/lib/utils"
import ServiceBenefits from "./service-benefits"
import SessionsList from "./sessions-list"
import PractitionersList from "./practitioners-list"
import { ServiceTypeBadge } from "@/components/ui/service-type-badge"

interface ServiceDetailsProps {
  service: Service
}

export default function ServiceDetails({ service }: ServiceDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview")

  // Determine which tabs to show based on service type
  const getTabs = () => {
    const tabs = [{ id: "overview", label: "Overview", icon: <Star className="h-4 w-4 mr-1" /> }]

    // Add Sessions tab for courses and workshops
    if (service.service_type.name === "course" || service.service_type.name === "workshop") {
      tabs.push({ id: "sessions", label: "Sessions", icon: <Calendar className="h-4 w-4 mr-1" /> })
    }

    // Add Practitioners tab if there are multiple practitioners
    if (service.practitioners && service.practitioners.length > 1) {
      tabs.push({ id: "practitioners", label: "Practitioners", icon: <GraduationCap className="h-4 w-4 mr-1" /> })
    }

    return tabs
  }

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <Avatar className="h-24 w-24 rounded-md">
          <AvatarImage src={service.image_url || "/placeholder.svg"} alt={service.name} className="object-cover" />
          <AvatarFallback className="rounded-md">{service.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold mb-2">{service.name}</h1>

          <div className="flex flex-wrap gap-2 mb-2">
            {service.categories?.map((category, index) => (
              <Badge key={index} variant="outline">
                {category}
              </Badge>
            ))}
            <ServiceTypeBadge type={service.service_type.name} />
          </div>

          <div className="flex items-center gap-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < Math.floor(service.rating || 4.5) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">({service.review_count || 0} reviews)</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          {getTabs().map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center">
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <Separator className="my-2" />

        <TabsContent value="overview" className="mt-4">
          <div>
            <p className="mb-6">{service.description}</p>

            {service.what_youll_learn && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">What You'll Learn</h3>
                <ul className="space-y-1">
                  {service.what_youll_learn.split("\n").map((item, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                      <span>{item.replace(/^- /, "")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {service.benefits && service.benefits.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Benefits</h3>
                <ServiceBenefits benefits={service.benefits} />
              </div>
            )}

            {service.agenda_items && service.agenda_items.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Agenda</h3>
                <ul className="space-y-2">
                  {service.agenda_items.map((item, index) => (
                    <li key={index} className="flex">
                      <div className="font-bold mr-2">{index + 1}.</div>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-muted-foreground text-sm">{item.description}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <div>
            {service.sessions && service.sessions.length > 0 ? (
              <SessionsList sessions={service.sessions} serviceType={service.service_type.name} />
            ) : (
              <p>No sessions scheduled yet.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="practitioners" className="mt-4">
          <div>
            <PractitionersList practitioners={service.practitioners} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Mobile accordion view for sessions */}
      {(service.service_type.name === "course" || service.service_type.name === "workshop") && (
        <div className="block sm:hidden mb-6">
          <h3 className="text-lg font-semibold mb-2">Sessions</h3>
          <Accordion type="single" collapsible className="w-full">
            {service.sessions.map((session, index) => (
              <AccordionItem key={index} value={`session-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{session.title || `Session ${index + 1}`}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 py-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(session.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </span>
                    </div>
                    {session.description && <p className="text-sm text-muted-foreground">{session.description}</p>}
                    <Button asChild variant="outline" className="w-full mt-2">
                      <Link href={`/services/${service.id}/sessions/${session.id}`}>Session Details</Link>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">About the Practitioner</h2>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={service.primary_practitioner.profile_image || "/placeholder.svg"}
                alt={service.primary_practitioner.display_name}
              />
              <AvatarFallback>{service.primary_practitioner.display_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{service.primary_practitioner.display_name}</h3>
              <p className="text-sm text-muted-foreground">{service.primary_practitioner.title}</p>
            </div>
          </div>
          <p className="mb-4">
            {service.primary_practitioner.bio || "Experienced practitioner specializing in this field."}
          </p>
          <Button variant="outline" asChild>
            <Link href={`/practitioners/${service.primary_practitioner.id}`}>View Full Profile</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
