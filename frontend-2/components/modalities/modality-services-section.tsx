"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { publicServicesListOptions } from "@/src/client/@tanstack/react-query.gen"
import ServiceCard from "@/components/ui/service-card"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

interface ModalityServicesSectionProps {
  slug: string
  modalityName: string
}

export default function ModalityServicesSection({ slug, modalityName }: ModalityServicesSectionProps) {
  const { data, isLoading } = useQuery({
    ...publicServicesListOptions({
      query: { modality: slug, page_size: 6, is_active: true },
    }),
  })

  const services = data?.results || []

  return (
    <section id="services-section" className="py-16 md:py-20 px-4 sm:px-6">
      <motion.div
        className="max-w-6xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.div variants={itemFade} className="text-center mb-10">
          <span className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-3 block">
            Available Services
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-olive-900">
            {modalityName} Services
          </h2>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-sage-200/60 h-80 animate-pulse" />
            ))}
          </div>
        ) : services.length > 0 ? (
          <>
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {services.map((service: any, index: number) => {
                const serviceType = service.service_type?.name?.toLowerCase() || "session"
                const typeMap: Record<string, string> = {
                  session: "sessions",
                  workshop: "workshops",
                  course: "courses",
                  bundle: "bundles",
                  package: "packages",
                }
                const prefix = typeMap[serviceType] || "sessions"
                const cardType = serviceType === "session" ? "one-on-one" : serviceType === "package" ? "packages" : serviceType === "bundle" ? "bundles" : serviceType === "workshop" ? "workshops" : "courses"

                return (
                  <motion.div key={service.id} variants={itemFade}>
                    <ServiceCard
                      id={service.id}
                      title={service.name || service.title || "Untitled Service"}
                      type={cardType as any}
                      description={service.short_description || service.description || ""}
                      price={service.price || 0}
                      duration={service.duration_minutes || service.duration}
                      location={service.location_type === 'virtual' ? 'Virtual'
                        : (service.practitioner_location?.city_name && service.practitioner_location?.state_code
                          ? `${service.practitioner_location.city_name}, ${service.practitioner_location.state_code}`
                          : service.practitioner_location?.full_address || service.practitioner_location?.name || 'In Person')}
                      categories={(service.categories || service.modalities || []).map((c: any) => c.name || c)}
                      practitioner={{
                        id: service.primary_practitioner?.id || service.practitioner?.id || 0,
                        name: service.primary_practitioner?.display_name || service.practitioner?.display_name || service.practitioner?.full_name || "Practitioner",
                        image: service.primary_practitioner?.profile_image_url || service.practitioner?.profile_image_url,
                      }}
                      href={`/${prefix}/${service.slug}`}
                      index={index}
                    />
                  </motion.div>
                )
              })}
            </motion.div>
            <motion.div variants={itemFade} className="text-center mt-8">
              <Link
                href={`/marketplace?modality=${slug}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-olive-700 hover:text-terracotta-600 transition-colors"
              >
                View all in Marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </>
        ) : (
          <motion.div variants={itemFade} className="text-center py-12">
            <p className="text-olive-500 font-light">
              No services available yet for {modalityName}. Check back soon!
            </p>
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}
