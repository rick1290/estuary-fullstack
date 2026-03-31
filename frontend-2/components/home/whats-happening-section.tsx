"use client"

import Link from "next/link"
import { ArrowRight, Users, Clock, MapPin, Video } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { publicServicesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { getServiceDetailUrl } from "@/lib/service-utils"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
}

// Warm gradient backgrounds for cards — cycles through brand tones
const CARD_GRADIENTS = [
  "from-[#f5ede2] to-[#e8ede4]",       // cream → sage-pale
  "from-[#f5ede2] to-[#f0ddb4]/30",     // cream → amber-light
  "from-[#faf7f2] to-[#e8c9a8]/20",     // cream → clay-warm
  "from-[#e8ede4] to-[#f5ede2]",        // sage-pale → cream
  "from-[#f5ede2] to-[#f5dfd9]/30",     // cream → blush
]

function getTimeBadge(service: any): { label: string; variant: "live" | "soon" | "upcoming" | "new" | "booking" } {
  const now = new Date()
  const sessionDate = service.next_session_date || service.sessions?.[0]?.start_time

  if (!sessionDate) {
    if (service.service_type_code === "session") return { label: "BOOKING NOW", variant: "booking" }
    return { label: "NEW", variant: "new" }
  }

  const date = new Date(sessionDate)
  const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (diffHours <= 0 && diffHours > -3) return { label: "LIVE NOW", variant: "live" }
  if (diffHours > 0 && diffHours <= 6) return { label: "TODAY", variant: "live" }
  if (diffHours > 6 && diffHours <= 30) return { label: "TOMORROW", variant: "soon" }

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()
  if (diffHours <= 168) return { label: dayName, variant: "upcoming" }

  return { label: "COMING SOON", variant: "new" }
}

function TimeBadge({ label, variant }: { label: string; variant: string }) {
  const styles = {
    live: "bg-[#3d6b1e]/90 text-white",
    soon: "bg-[#c4956a]/90 text-white",
    upcoming: "bg-olive-800/80 text-white",
    new: "bg-terracotta-600/90 text-white",
    booking: "bg-sage-700/90 text-white",
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium tracking-wide ${styles[variant as keyof typeof styles] || styles.upcoming}`}>
      {variant === "live" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      {label}
    </span>
  )
}

function formatSessionTime(service: any): string {
  const date = service.next_session_date || service.sessions?.[0]?.start_time
  if (!date) {
    if (service.service_type_code === "session") return "Open slots available"
    return ""
  }
  const d = new Date(date)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()

  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

  if (isToday) return `Today at ${time}`
  if (isTomorrow) return `Tomorrow at ${time}`
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${time}`
}

function getServiceTypeLabel(code: string): string {
  const labels: Record<string, string> = {
    session: "1:1 SESSION",
    workshop: "WORKSHOP",
    course: "COURSE",
    bundle: "BUNDLE",
    package: "PACKAGE",
  }
  return labels[code] || "SESSION"
}

interface HappeningCardProps {
  service: any
  index: number
  featured?: boolean
}

function HappeningCard({ service, index, featured = false }: HappeningCardProps) {
  const timeBadge = getTimeBadge(service)
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]
  const typeLabel = getServiceTypeLabel(service.service_type_code || "session")
  const timeStr = formatSessionTime(service)
  const practitionerName = service.practitioner?.display_name || service.primary_practitioner?.display_name || ""
  const practitionerImage = service.practitioner?.profile_image_url || service.primary_practitioner?.profile_image_url || ""
  const spotsLeft = service.max_participants ? service.max_participants - (service.current_participants || 0) : null
  const price = service.price_cents ? Math.floor(service.price_cents / 100) : service.price || null

  return (
    <Link href={getServiceDetailUrl(service)} className="group block h-full">
      <div className="relative h-full bg-white rounded-2xl overflow-hidden border border-[rgba(74,63,53,0.05)] transition-all duration-[400ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(74,63,53,0.08)]">
        {/* Image area with overlaid badge */}
        <div className={`relative w-full overflow-hidden ${featured ? "aspect-[16/14]" : "aspect-[16/10]"}`}>
          {service.cover_image_url ? (
            <img
              src={service.cover_image_url}
              alt={service.name || service.title || ""}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`} />
          )}

          {/* Badge — overlaid on image */}
          <div className="absolute top-3 left-3 z-10">
            <TimeBadge label={timeBadge.label} variant={timeBadge.variant} />
          </div>

          {/* Spots left — bottom right of image */}
          {spotsLeft !== null && spotsLeft <= 20 && (
            <div className="absolute bottom-3 right-3 z-10">
              <span className="text-[11px] font-medium text-olive-700 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm">
                {spotsLeft} spots left
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-terracotta-700">
              {typeLabel}
            </span>
            {timeStr && (
              <>
                <span className="text-olive-300">·</span>
                <span className="text-[11px] text-olive-500">{timeStr}</span>
              </>
            )}
          </div>

          <h3 className={`font-serif ${featured ? "text-xl" : "text-base"} font-normal text-olive-900 leading-snug mb-3 group-hover:text-terracotta-800 transition-colors line-clamp-2`}>
            {service.name || service.title || "Service"}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {practitionerImage ? (
                <img src={practitionerImage} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : practitionerName ? (
                <div className="w-6 h-6 rounded-full bg-sage-100 flex items-center justify-center text-[10px] font-medium text-olive-700">
                  {practitionerName.split(" ").map((n: string) => n[0]).join("")}
                </div>
              ) : null}
              {practitionerName && (
                <span className="text-[13px] text-olive-600">{practitionerName}</span>
              )}
            </div>
            {price && (
              <span className="text-[15px] font-medium text-olive-900">${price}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function WhatsHappeningSection() {
  const { data: servicesData, isLoading } = useQuery({
    ...publicServicesListOptions({
      query: {
        ordering: "-is_featured,next_session_date",
        page_size: 5,
        is_active: true,
      }
    }),
    staleTime: 1000 * 60 * 5,
  })

  const services = Array.isArray(servicesData) ? servicesData :
    (servicesData?.results && Array.isArray(servicesData.results)) ? servicesData.results : []

  if (!isLoading && services.length === 0) return null

  return (
    <section className="py-16 md:py-24 bg-[#f8f5f0]">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={itemFade}>
            <span className="block text-[11px] font-medium tracking-[2px] uppercase text-sage-600 mb-3">
              Happening This Week
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-olive-900">
              Don&apos;t Miss{" "}
              <em className="italic text-terracotta-600">What&apos;s Next</em>
            </h2>
          </motion.div>
          <motion.div variants={itemFade}>
            <Link
              href="/marketplace"
              className="text-sm font-medium text-sage-600 hover:text-olive-900 transition-colors flex items-center gap-1"
            >
              View all events <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Bento Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`bg-cream-100 rounded-2xl animate-pulse ${i === 0 ? "sm:row-span-2 h-64 sm:h-auto" : "h-48"}`} />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr] gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
          >
            {services.slice(0, 5).map((service: any, i: number) => (
              <motion.div
                key={service.id}
                variants={itemFade}
                className={i === 0 ? "sm:row-span-2" : ""}
              >
                <HappeningCard service={service} index={i} featured={i === 0} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}
