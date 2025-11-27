"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type PractitionerRole = "guide" | "facilitator" | "instructor" | "practitioner"

interface Practitioner {
  id: string | number
  name?: string
  display_name?: string
  title?: string
  bio?: string
  short_bio?: string
  image?: string
  profile_image_url?: string
  slug?: string
}

interface PractitionerSpotlightProps {
  practitioners: Practitioner[]
  /** The role determines the heading text (e.g., "Meet Your Guide") */
  role?: PractitionerRole
  /** Custom heading override */
  heading?: string
  /** Additional className for the section */
  className?: string
  /** Animation delay for staggered animations */
  animationDelay?: string
}

const roleHeadings: Record<PractitionerRole, { singular: string; plural: string }> = {
  guide: { singular: "Meet Your Guide", plural: "Meet Your Guides" },
  facilitator: { singular: "Meet Your Expert Facilitator", plural: "Meet Your Expert Facilitators" },
  instructor: { singular: "Meet Your Instructor", plural: "Meet Your Instructors" },
  practitioner: { singular: "Meet Your Practitioner", plural: "Meet Your Practitioners" },
}

export default function PractitionerSpotlight({
  practitioners,
  role = "guide",
  heading,
  className,
  animationDelay = "0.6s",
}: PractitionerSpotlightProps) {
  if (!practitioners || practitioners.length === 0) return null

  const headingText = heading || (practitioners.length > 1
    ? roleHeadings[role].plural
    : roleHeadings[role].singular)

  return (
    <section
      className={cn("animate-fade-in", className)}
      style={{ animationDelay }}
    >
      <h2 className="text-3xl font-bold text-olive-900 mb-10">{headingText}</h2>
      <div className="grid gap-6">
        {practitioners.map((practitioner) => {
          const name = practitioner.display_name || practitioner.name || "Practitioner"
          const image = practitioner.profile_image_url || practitioner.image
          const bio = practitioner.short_bio || practitioner.bio
          const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
          const profileUrl = practitioner.slug
            ? `/practitioners/${practitioner.slug}`
            : `/practitioners/${practitioner.id}`

          return (
            <Card
              key={practitioner.id}
              className="border-2 border-sage-200 overflow-hidden group hover:border-sage-300 hover:shadow-lg transition-all"
            >
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Image Section */}
                  <div className="md:w-64 h-64 bg-gradient-to-br from-terracotta-50 via-sage-50 to-terracotta-50 flex items-center justify-center p-6">
                    {image ? (
                      <div className="w-44 h-44 rounded-3xl bg-white shadow-2xl overflow-hidden ring-4 ring-white/50">
                        <img
                          src={image}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-44 h-44 rounded-3xl bg-gradient-to-br from-sage-300 to-terracotta-300 shadow-2xl flex items-center justify-center ring-4 ring-white/50">
                        <span className="text-5xl font-bold text-white">
                          {initials}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 p-8 flex flex-col">
                    <h3 className="text-2xl font-semibold text-olive-900 mb-2 group-hover:text-sage-700 transition-colors">
                      {name}
                    </h3>

                    {practitioner.title && (
                      <p className="text-lg text-sage-700 mb-4">{practitioner.title}</p>
                    )}

                    {bio && (
                      <p className="text-olive-600 leading-relaxed mb-6 line-clamp-3 flex-1">
                        {bio}
                      </p>
                    )}

                    <Link
                      href={profileUrl}
                      className="inline-flex items-center gap-2 text-sage-600 hover:text-sage-800 font-medium text-sm px-4 py-2 rounded-lg hover:bg-sage-50 transition-all self-start mt-auto"
                    >
                      View Full Profile
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
