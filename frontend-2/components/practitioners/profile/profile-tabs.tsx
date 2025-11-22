"use client"

import { useState, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Award, Brain, MessageSquare, Rss } from "lucide-react"
import { cn } from "@/lib/utils"
import AboutTab from "./tabs/about-tab"
import CredentialsTab from "./tabs/credentials-tab"
import SpecialtiesTab from "./tabs/specialties-tab"
import ExperienceTab from "./tabs/experience-tab"
import QATab from "./tabs/qa-tab"
import EstuaryTab from "./tabs/estuary-tab"
import type { Practitioner } from "@/types/practitioner"

interface ProfileTabsProps {
  practitioner: Practitioner
}

export default function ProfileTabs({ practitioner }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("about")

  const tabItems = [
    { value: "about", label: "About", icon: User },
    { value: "experience", label: "Experience", icon: Award },
    { value: "specialties", label: "Expertise", icon: Brain },
    { value: "qa", label: "Q&A", icon: MessageSquare },
    { value: "estuary", label: "Streams", icon: Rss },
  ]

  return (
    <div className="mt-6">
      <Tabs defaultValue="about" value={activeTab} onValueChange={setActiveTab}>
        {/* Simple Tab Navigation */}
        <TabsList className="w-full h-auto p-1 bg-sage-50/50 border border-sage-100 rounded-xl mb-6">
          <div className="flex flex-wrap justify-start gap-1">
            {tabItems.map((item) => {
              const Icon = item.icon
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-white data-[state=active]:text-olive-900 data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-olive-600 hover:text-olive-800"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth="1.5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </TabsTrigger>
              )
            })}
          </div>
        </TabsList>

        {/* Tab Contents */}
        <div className="bg-white rounded-2xl shadow-sm border border-sage-100">
          <TabsContent value="about" className="p-6 lg:p-8 m-0">
            <AboutTab bio={practitioner.bio} />
          </TabsContent>

          <TabsContent value="experience" className="p-6 lg:p-8 m-0">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-olive-900 mb-4">Professional Background</h3>
                <ExperienceTab
                  years_of_experience={practitioner.years_of_experience}
                  completed_sessions={practitioner.completed_sessions}
                  is_verified={practitioner.is_verified}
                  practitioner_status={practitioner.practitioner_status}
                />
              </div>
              {((practitioner.educations && practitioner.educations.length > 0) || 
                (practitioner.certifications && practitioner.certifications.length > 0)) && (
                <div>
                  <h3 className="text-lg font-semibold text-olive-900 mb-4">Education & Certifications</h3>
                  <CredentialsTab 
                    educations={practitioner.educations || []} 
                    certifications={practitioner.certifications || []} 
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="specialties" className="p-6 lg:p-8 m-0">
            <SpecialtiesTab
              specializations={practitioner.specializations || []}
              styles={practitioner.styles || []}
              topics={practitioner.topics || []}
              modalities={practitioner.modalities || []}
            />
          </TabsContent>

          <TabsContent value="qa" className="p-6 lg:p-8 m-0">
            <QATab questions={practitioner.questions || []} />
          </TabsContent>

          <TabsContent value="estuary" className="p-0 m-0">
            <div className="bg-gradient-to-br from-sage-50/30 to-terracotta-50/30 p-6 lg:p-8 rounded-b-2xl">
              <EstuaryTab
                practitionerId={practitioner.id}
                practitionerName={practitioner.display_name || "Practitioner"}
                practitionerSlug={practitioner.public_uuid || String(practitioner.id)}
                practitionerImage={practitioner.profile_image_url}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}