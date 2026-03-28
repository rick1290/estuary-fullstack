"use client"

import Link from "next/link"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import {
  modalityCategoriesListOptions,
  modalitiesListOptions,
} from "@/src/client/@tanstack/react-query.gen"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&h=400&fit=crop"

interface ModalityCategoryPageContentProps {
  slug: string
}

export default function ModalityCategoryPageContent({ slug }: ModalityCategoryPageContentProps) {
  const { data: categoriesData, isLoading: catLoading } = useQuery({
    ...modalityCategoriesListOptions({ query: { page_size: 50 } }),
  })

  const { data: modalitiesData, isLoading: modLoading } = useQuery({
    ...modalitiesListOptions({ query: { page_size: 200, category_ref__slug: slug } }),
  })

  const isLoading = catLoading || modLoading
  const category = (categoriesData?.results || []).find((c: any) => c.slug === slug)
  const modalities = modalitiesData?.results || []

  if (isLoading) {
    return (
      <main className="bg-cream-50 min-h-screen">
        <div className="container max-w-7xl py-8 px-4">
          <div className="h-8 w-48 bg-sage-100 rounded animate-pulse mb-8" />
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="h-12 w-full bg-sage-100 rounded animate-pulse" />
            <div className="h-20 w-full bg-sage-100 rounded animate-pulse" />
          </div>
        </div>
      </main>
    )
  }

  const categoryName = category?.name || slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

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
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          {category?.color && (
            <motion.div variants={itemFade} className="flex justify-center mb-5">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: category.color }}
              />
            </motion.div>
          )}
          <motion.h1
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[48px] font-normal leading-[1.15] tracking-tight text-olive-900 mb-5"
          >
            {categoryName}
          </motion.h1>
          {category?.short_description && (
            <motion.p
              variants={itemFade}
              className="text-lg font-light leading-relaxed text-olive-600 mb-8"
            >
              {category.short_description}
            </motion.p>
          )}
          <motion.p variants={itemFade} className="text-sm text-olive-500">
            {modalities.length} {modalities.length === 1 ? "modality" : "modalities"} in this category
          </motion.p>
        </motion.div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* Modalities grid */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {modalities.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={stagger}
            >
              {modalities.map((mod: any) => (
                <motion.div key={mod.id} variants={itemFade}>
                  <Link
                    href={`/modalities/${mod.slug}`}
                    className="group block bg-white rounded-xl border border-sage-200/60 overflow-hidden hover:shadow-md hover:border-sage-300 transition-all"
                  >
                    <div className="p-5">
                      <h3 className="font-medium text-olive-900 text-base mb-1.5 group-hover:text-terracotta-700 transition-colors">
                        {mod.name}
                      </h3>
                      {mod.short_description && (
                        <p className="text-sm font-light text-olive-600 leading-relaxed line-clamp-2 mb-3">
                          {mod.short_description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
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
              <p className="text-olive-500 font-light text-lg">
                No modalities in this category yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <div className="h-px bg-sage-200/60 mx-6" />
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-serif text-2xl font-normal text-olive-900 mb-4">
            Explore All Modalities
          </h2>
          <p className="text-sm font-light text-olive-600 mb-6">
            Browse our full collection of wellness practices across all categories.
          </p>
          <Button
            className="bg-olive-800 hover:bg-olive-700 text-cream-50 rounded-full px-8 py-5"
            asChild
          >
            <Link href="/modalities">View All Modalities</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
