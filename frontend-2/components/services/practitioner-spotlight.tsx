"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type PractitionerRole = "guide" | "facilitator" | "instructor" | "practitioner"

interface Practitioner {
  id: string | number
  name?: string
  display_name?: string
  title?: string
  professional_title?: string
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
  facilitator: { singular: "Meet Your Facilitator", plural: "Meet Your Facilitators" },
  instructor: { singular: "Meet Your Instructor", plural: "Meet Your Instructors" },
  practitioner: { singular: "Meet Your Practitioner", plural: "Meet Your Practitioners" },
}

// Deterministic gradient based on name
const avatarGradients = [
  "from-sage-200 to-terracotta-100",
  "from-terracotta-100 to-sage-200",
  "from-cream-200 to-sage-200",
  "from-sage-100 to-cream-200",
]

function getAvatarGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarGradients[Math.abs(hash) % avatarGradients.length]
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
    <section className={cn(className)}>
      <h2 className="font-serif text-xl font-light text-olive-900 mb-5">{headingText}</h2>
      <div className="grid gap-4">
        {practitioners.map((practitioner) => (
          <PractitionerCard key={practitioner.id} practitioner={practitioner} />
        ))}
      </div>
    </section>
  )
}

function PractitionerCard({ practitioner }: { practitioner: Practitioner }) {
  const [isTruncated, setIsTruncated] = useState(false)
  const bioRef = useRef<HTMLParagraphElement>(null)

  const name = practitioner.display_name || practitioner.name || "Practitioner"
  const title = practitioner.professional_title || practitioner.title
  const image = practitioner.profile_image_url || practitioner.image
  const bio = practitioner.short_bio || practitioner.bio
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
  const gradient = getAvatarGradient(name)
  const profileUrl = practitioner.slug
    ? `/practitioners/${practitioner.slug}`
    : `/practitioners/${practitioner.id}`

  // Check if bio text is truncated
  useEffect(() => {
    const el = bioRef.current
    if (el) {
      setIsTruncated(el.scrollHeight > el.clientHeight)
    }
  }, [bio])

  return (
    <Link href={profileUrl} className="group block">
      <div className="flex items-start gap-5 bg-white rounded-xl border border-sage-200/60 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {image ? (
            <div className="w-20 h-20 rounded-2xl overflow-hidden">
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <span className="text-xl font-serif font-light text-olive-700/40">
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-medium text-olive-900 group-hover:text-sage-700 transition-colors">
              {name}
            </h3>
            <span className="flex-shrink-0 bg-olive-900 text-cream-50 rounded-full px-4 py-1.5 text-[12px] font-medium group-hover:bg-olive-800 transition-colors whitespace-nowrap">
              View Profile
            </span>
          </div>

          {title && (
            <p className="text-[13px] font-light text-olive-500 mt-0.5">{title}</p>
          )}

          {bio && (
            <p ref={bioRef} className="text-[15px] font-light text-olive-600 leading-relaxed line-clamp-2 mt-2.5">
              {bio}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
