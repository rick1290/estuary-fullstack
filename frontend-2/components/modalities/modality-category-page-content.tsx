"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  modalityCategoriesListOptions,
  modalitiesListOptions,
  publicPractitionersListOptions,
  publicServicesListOptions,
} from "@/src/client/@tanstack/react-query.gen"
import { motion } from "framer-motion"
import { ArrowRight, Users, Sparkles, BookOpen, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { getServiceDetailUrl } from "@/lib/service-utils"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

interface ModalityCategoryPageContentProps {
  slug: string
}

export default function ModalityCategoryPageContent({ slug }: ModalityCategoryPageContentProps) {
  // Fetch category data
  const { data: categoriesData, isLoading: catLoading } = useQuery({
    ...modalityCategoriesListOptions({ query: { page_size: 50 } }),
    staleTime: 1000 * 60 * 10,
  })

  // Fetch modalities in this category
  const { data: modalitiesData, isLoading: modLoading } = useQuery({
    ...modalitiesListOptions({ query: { page_size: 200, category_ref__slug: slug } }),
    staleTime: 1000 * 60 * 10,
  })

  // Fetch practitioners in this category
  const { data: practitionersData } = useQuery({
    ...publicPractitionersListOptions({
      query: { modality_category: slug, limit: 6, ordering: '-average_rating' } as any,
    }),
    staleTime: 1000 * 60 * 5,
  })

  // Fetch services in this category
  const { data: servicesData } = useQuery({
    ...publicServicesListOptions({
      query: { modality_category: slug, page_size: 4, ordering: '-is_featured,-average_rating' } as any,
    }),
    staleTime: 1000 * 60 * 5,
  })

  const isLoading = catLoading || modLoading
  const allCategories = categoriesData?.results || []
  const category = allCategories.find((c: any) => c.slug === slug)
  const modalities = modalitiesData?.results || []
  const practitioners = (() => {
    const raw = practitionersData?.data?.results || practitionersData?.results || []
    return Array.isArray(raw) ? raw.slice(0, 6) : []
  })()
  const services = (() => {
    const raw = servicesData?.results || []
    return Array.isArray(raw) ? raw.slice(0, 4) : []
  })()
  const relatedCategories = allCategories.filter((c: any) => c.slug !== slug).slice(0, 4)

  if (isLoading) {
    return (
      <main className="bg-cream-50 min-h-screen">
        <div className="container max-w-7xl py-8 px-4">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="max-w-2xl mx-auto space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </main>
    )
  }

  const categoryName = category?.name || slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

  return (
    <main className="bg-cream-50 min-h-screen">
      {/* Breadcrumbs */}
      <div className="container max-w-7xl pt-6 px-4 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link href="/modalities">Modalities</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{categoryName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Hero */}
      <section className="py-14 md:py-20 px-4 sm:px-6">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          {category?.color && (
            <motion.div variants={itemFade} className="flex justify-center mb-5">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
            </motion.div>
          )}
          <motion.h1
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[48px] font-normal leading-[1.15] tracking-tight text-olive-900 mb-5"
          >
            {categoryName}
          </motion.h1>
          {category?.short_description && (
            <motion.p variants={itemFade} className="text-lg font-light leading-relaxed text-olive-600 mb-6">
              {category.short_description}
            </motion.p>
          )}
          <motion.div variants={itemFade} className="flex items-center justify-center gap-4 text-sm text-olive-500">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {modalities.length} {modalities.length === 1 ? "modality" : "modalities"}
            </span>
            {practitioners.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {practitioners.length}+ practitioners
              </span>
            )}
            {services.length > 0 && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {services.length}+ services
              </span>
            )}
          </motion.div>
          <motion.div variants={itemFade} className="mt-8">
            <Button className="bg-olive-800 hover:bg-olive-700 text-cream-50 rounded-full px-8" asChild>
              <Link href={`/marketplace?modality_category=${slug}`}>
                <Search className="h-4 w-4 mr-2" />
                Browse {categoryName} Services
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* About this category */}
      {category?.long_description && (
        <>
          <section className="py-14 md:py-16 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto">
              <span className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4">About</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-olive-900 mb-5">
                What is <em className="italic text-terracotta-600">{categoryName}</em>?
              </h2>
              <div className="text-base font-light leading-relaxed text-olive-600 space-y-4">
                {category.long_description.split('\n').filter(Boolean).map((p: string, i: number) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </section>
          <div className="h-px bg-sage-200/60 mx-6" />
        </>
      )}

      {/* Modalities grid */}
      <section className="py-14 md:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <span className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4">Practices</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-olive-900">
              {categoryName} <em className="italic text-terracotta-600">Modalities</em>
            </h2>
          </div>

          {modalities.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={stagger}
            >
              {modalities.map((mod: any) => (
                <motion.div key={mod.id} variants={itemFade}>
                  <Link
                    href={`/modalities/${mod.slug}`}
                    className="group block bg-white rounded-xl border border-sage-200/60 overflow-hidden hover:shadow-md hover:border-sage-300 transition-all h-full"
                  >
                    <div className="p-5 flex flex-col h-full">
                      <h3 className="font-medium text-olive-900 text-base mb-1.5 group-hover:text-terracotta-700 transition-colors">
                        {mod.name}
                      </h3>
                      {mod.short_description && (
                        <p className="text-sm font-light text-olive-600 leading-relaxed line-clamp-2 mb-3 flex-1">
                          {mod.short_description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-2">
                        {((mod.practitioner_count ?? 0) > 0 || (mod.service_count ?? 0) > 0) && (
                          <div className="flex items-center gap-2 text-[11px] text-olive-500">
                            {(mod.practitioner_count ?? 0) > 0 && (
                              <span>{mod.practitioner_count} practitioners</span>
                            )}
                            {(mod.practitioner_count ?? 0) > 0 && (mod.service_count ?? 0) > 0 && (
                              <span>&middot;</span>
                            )}
                            {(mod.service_count ?? 0) > 0 && (
                              <span>{mod.service_count} services</span>
                            )}
                          </div>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 text-sage-400 group-hover:text-sage-600 group-hover:translate-x-0.5 transition-all ml-auto" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16">
              <p className="text-olive-500 font-light text-lg">No modalities in this category yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Practitioners in this category */}
      {practitioners.length > 0 && (
        <>
          <div className="h-px bg-sage-200/60 mx-6" />
          <section className="py-14 md:py-16 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <span className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4">Guides</span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-normal text-olive-900">
                    {categoryName} <em className="italic text-terracotta-600">Practitioners</em>
                  </h2>
                </div>
                <Button variant="ghost" size="sm" className="text-sage-700 hover:text-sage-800" asChild>
                  <Link href={`/marketplace/practitioners?modality_category=${slug}`}>
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {practitioners.map((p: any) => (
                  <Link
                    key={p.id || p.public_uuid}
                    href={`/practitioners/${p.slug || p.public_uuid}`}
                    className="group text-center"
                  >
                    <Avatar className="w-16 h-16 mx-auto mb-2 border-2 border-sage-200/40 group-hover:border-sage-400 transition-colors">
                      <AvatarImage src={p.profile_image_url || ''} alt={p.display_name || ''} className="object-cover" />
                      <AvatarFallback className="bg-sage-100 text-olive-800 text-sm font-medium">
                        {(p.display_name || '?').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium text-olive-900 truncate group-hover:text-terracotta-700 transition-colors">
                      {p.display_name || p.full_name}
                    </p>
                    <p className="text-xs text-olive-500 truncate">{p.professional_title || ''}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Featured services */}
      {services.length > 0 && (
        <>
          <div className="h-px bg-sage-200/60 mx-6" />
          <section className="py-14 md:py-16 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <span className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4">Services</span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-normal text-olive-900">
                    Featured <em className="italic text-terracotta-600">Services</em>
                  </h2>
                </div>
                <Button variant="ghost" size="sm" className="text-sage-700 hover:text-sage-800" asChild>
                  <Link href={`/marketplace?modality_category=${slug}`}>
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((service: any) => (
                  <Link
                    key={service.id}
                    href={getServiceDetailUrl(service)}
                    className="group block bg-white rounded-xl border border-sage-200/60 p-5 hover:shadow-md hover:border-sage-300 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cream-50 to-sage-50 flex items-center justify-center shrink-0 overflow-hidden">
                        {service.cover_image_url ? (
                          <img src={service.cover_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Sparkles className="h-6 w-6 text-sage-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-olive-900 truncate group-hover:text-terracotta-700 transition-colors">
                          {service.name || service.title}
                        </h3>
                        <p className="text-xs text-olive-500 mt-0.5">
                          {service.practitioner_name || service.primary_practitioner?.display_name || ''}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-olive-500">
                          {service.price_cents && (
                            <span className="font-medium text-olive-700">${Math.floor(service.price_cents / 100)}</span>
                          )}
                          {service.duration_minutes && <span>&middot; {service.duration_minutes} min</span>}
                          {service.service_type_code && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                              {service.service_type_code}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-sage-400 group-hover:text-sage-600 shrink-0 mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Related Categories */}
      {relatedCategories.length > 0 && (
        <>
          <div className="h-px bg-sage-200/60 mx-6" />
          <section className="py-14 md:py-16 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <span className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4">Explore More</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-olive-900 mb-8">
                Related <em className="italic text-terracotta-600">Categories</em>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {relatedCategories.map((cat: any) => (
                  <Link
                    key={cat.id}
                    href={`/modalities/category/${cat.slug}`}
                    className="group block bg-white rounded-xl border border-sage-200/60 p-4 hover:shadow-md hover:border-sage-300 transition-all text-center"
                  >
                    {cat.color && (
                      <div className="w-3 h-3 rounded-full mx-auto mb-3" style={{ backgroundColor: cat.color }} />
                    )}
                    <h3 className="text-sm font-medium text-olive-900 group-hover:text-terracotta-700 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-olive-500 mt-1">{cat.modalities?.length || '—'} modalities</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Bottom CTA */}
      <div className="h-px bg-sage-200/60 mx-6" />
      <section className="py-14 md:py-20 px-4 sm:px-6">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-olive-900 mb-4">
            Explore All <em className="italic text-terracotta-600">Modalities</em>
          </h2>
          <p className="text-sm font-light text-olive-600 mb-6">
            Browse our full collection of {allCategories.length} categories and 100+ wellness practices.
          </p>
          <Button className="bg-olive-800 hover:bg-olive-700 text-cream-50 rounded-full px-8 py-5" asChild>
            <Link href="/modalities">View All Modalities</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
