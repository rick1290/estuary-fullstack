"use client"

import { useState, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Award, Brain, Clock, MessageSquare, Rss } from "lucide-react"
import { Card } from "@/components/ui/card"
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
  const tabsRef = useRef<HTMLDivElement>(null)

  return (
    <Card className="border-2 border-sage-200 bg-white rounded-3xl overflow-hidden mb-8 animate-fade-in" style={{animationDelay: '0.2s'}}>
      <Tabs defaultValue="about" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-sage-50 border-b border-sage-200 rounded-none w-full justify-start overflow-x-auto p-2" ref={tabsRef}>
          <TabsTrigger
            value="about"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-olive-900 data-[state=active]:shadow-sm rounded-xl px-4 py-2 transition-all"
          >
            <User className="h-4 w-4" strokeWidth="1.5" />
            <span>About</span>
          </TabsTrigger>
          <TabsTrigger
            value="credentials"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-olive-900 data-[state=active]:shadow-sm rounded-xl px-4 py-2 transition-all"
          >
            <Award className="h-4 w-4" strokeWidth="1.5" />
            <span>Credentials</span>
          </TabsTrigger>
          <TabsTrigger
            value="specialties"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-olive-900 data-[state=active]:shadow-sm rounded-xl px-4 py-2 transition-all"
          >
            <Brain className="h-4 w-4" strokeWidth="1.5" />
            <span>Specialties</span>
          </TabsTrigger>
          <TabsTrigger
            value="experience"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-olive-900 data-[state=active]:shadow-sm rounded-xl px-4 py-2 transition-all"
          >
            <Clock className="h-4 w-4" strokeWidth="1.5" />
            <span>Experience</span>
          </TabsTrigger>
          <TabsTrigger
            value="qa"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-olive-900 data-[state=active]:shadow-sm rounded-xl px-4 py-2 transition-all"
          >
            <MessageSquare className="h-4 w-4" strokeWidth="1.5" />
            <span>Q&A</span>
          </TabsTrigger>
          <TabsTrigger
            value="estuary"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-olive-900 data-[state=active]:shadow-sm rounded-xl px-4 py-2 transition-all"
          >
            <Rss className="h-4 w-4" strokeWidth="1.5" />
            <span>Estuary Streams</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="p-8">
          <AboutTab bio={practitioner.bio} />
        </TabsContent>

        <TabsContent value="credentials" className="p-8">
          <CredentialsTab educations={practitioner.educations} certifications={practitioner.certifications} />
        </TabsContent>

        <TabsContent value="specialties" className="p-8">
          <SpecialtiesTab
            specializations={practitioner.specializations}
            styles={practitioner.styles}
            topics={practitioner.topics}
            modalities={practitioner.modalities}
          />
        </TabsContent>

        <TabsContent value="experience" className="p-8">
          <ExperienceTab
            years_of_experience={practitioner.years_of_experience}
            completed_sessions={practitioner.completed_sessions}
            is_verified={practitioner.is_verified}
            practitioner_status={practitioner.practitioner_status}
          />
        </TabsContent>

        <TabsContent value="qa" className="p-8">
          <QATab questions={practitioner.questions || []} />
        </TabsContent>

        <TabsContent value="estuary" className="p-8 bg-gradient-to-b from-cream-50 to-sage-50">
          <EstuaryTab
            practitionerId={practitioner.id}
            practitionerName={practitioner.display_name}
            practitionerImage={practitioner.profile_image_url}
          />
        </TabsContent>
      </Tabs>
    </Card>
  )
}
