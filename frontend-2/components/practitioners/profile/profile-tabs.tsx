"use client"

import { useState, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Award, Brain, Clock, MessageSquare, Rss } from "lucide-react"
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
    <Tabs defaultValue="about" value={activeTab} onValueChange={setActiveTab} className="mb-8">
      <TabsList className="bg-background border-b rounded-none w-full justify-start overflow-x-auto" ref={tabsRef}>
        <TabsTrigger
          value="about"
          className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
        >
          <User className="h-4 w-4" />
          <span>About</span>
        </TabsTrigger>
        <TabsTrigger
          value="credentials"
          className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
        >
          <Award className="h-4 w-4" />
          <span>Credentials</span>
        </TabsTrigger>
        <TabsTrigger
          value="specialties"
          className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
        >
          <Brain className="h-4 w-4" />
          <span>Specialties</span>
        </TabsTrigger>
        <TabsTrigger
          value="experience"
          className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
        >
          <Clock className="h-4 w-4" />
          <span>Experience</span>
        </TabsTrigger>
        <TabsTrigger
          value="qa"
          className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Q&A</span>
        </TabsTrigger>
        <TabsTrigger
          value="estuary"
          className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
        >
          <Rss className="h-4 w-4" />
          <span>Estuary Streams</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="about" className="pt-6">
        <AboutTab bio={practitioner.bio} />
      </TabsContent>

      <TabsContent value="credentials" className="pt-6">
        <CredentialsTab educations={practitioner.educations} certifications={practitioner.certifications} />
      </TabsContent>

      <TabsContent value="specialties" className="pt-6">
        <SpecialtiesTab
          specializations={practitioner.specializations}
          styles={practitioner.styles}
          topics={practitioner.topics}
          modalities={practitioner.modalities}
        />
      </TabsContent>

      <TabsContent value="experience" className="pt-6">
        <ExperienceTab
          years_of_experience={practitioner.years_of_experience}
          completed_sessions={practitioner.completed_sessions}
          is_verified={practitioner.is_verified}
          practitioner_status={practitioner.practitioner_status}
        />
      </TabsContent>

      <TabsContent value="qa" className="pt-6">
        <QATab questions={practitioner.questions || []} />
      </TabsContent>

      <TabsContent value="estuary" className="pt-6 bg-gradient-to-b from-background to-muted/30">
        <EstuaryTab
          practitionerId={practitioner.id}
          practitionerName={practitioner.display_name}
          practitionerImage={practitioner.profile_image_url}
        />
      </TabsContent>
    </Tabs>
  )
}
