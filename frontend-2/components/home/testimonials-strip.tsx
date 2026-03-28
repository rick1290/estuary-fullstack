"use client"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { reviewsListOptions } from "@/src/client/@tanstack/react-query.gen"

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function TestimonialsStrip() {
  const { data, isLoading, isError } = useQuery(
    reviewsListOptions({
      query: {
        min_rating: 4,
        is_published: true,
        ordering: "-created_at",
        page_size: 3,
      },
    })
  )

  const reviews = data?.results ?? []

  // Hide section entirely if error or no data
  if (isError) return null
  if (!isLoading && reviews.length === 0) return null

  if (isLoading) {
    return (
      <section className="py-16 bg-cream-50">
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-sage-200/60 p-6 animate-pulse">
                  <div className="h-20 bg-muted rounded mb-5" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div>
                      <div className="h-4 w-20 bg-muted rounded mb-1" />
                      <div className="h-3 w-16 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-cream-50">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="max-w-5xl mx-auto"
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-8 text-center"
          >
            Their Words
          </motion.span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review, i) => (
              <motion.div
                key={review.public_uuid || i}
                variants={itemFade}
                className="bg-white rounded-2xl border border-sage-200/60 p-6"
              >
                <blockquote className="font-serif text-[15px] italic font-light leading-relaxed text-olive-800 mb-5">
                  &ldquo;{review.comment}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  {review.user_avatar_url ? (
                    <img
                      src={review.user_avatar_url}
                      alt={review.display_name || "Reviewer"}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-200 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-olive-900">
                      {review.is_anonymous ? "Anonymous" : (review.display_name || "Community Member")}
                    </p>
                    {review.service_name && (
                      <p className="text-xs text-sage-600 font-light">
                        {review.service_name}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
