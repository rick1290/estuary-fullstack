"use client"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Play, Users, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function StreamsTeaserSection() {
  return (
    <section className="py-20 bg-cream-50">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
            >
              <motion.span
                variants={itemFade}
                className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4"
              >
                Streams
              </motion.span>

              <motion.h2
                variants={itemFade}
                className="font-serif text-3xl sm:text-4xl font-light leading-[1.2] text-olive-900 mb-5"
              >
                Explore{" "}
                <em className="italic text-terracotta-600">Living Streams</em>
              </motion.h2>

              <motion.p
                variants={itemFade}
                className="text-base font-light leading-relaxed text-olive-600 mb-8"
              >
                Discover articles, videos, and audio from practitioners in our
                community. A living library of wellness wisdom — free to browse,
                with premium content for those who want to go deeper.
              </motion.p>

              {/* Feature list */}
              <motion.div variants={itemFade} className="space-y-4 mb-8">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center flex-shrink-0">
                    <Play className="h-5 w-5 text-sage-700" strokeWidth="1.5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-olive-900">Articles, Videos & Audio</p>
                    <p className="text-[13px] text-olive-500 font-light">Explore practitioner-created content across formats</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-sage-700" strokeWidth="1.5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-olive-900">Community Connection</p>
                    <p className="text-[13px] text-olive-500 font-light">Share your journey with like-minded seekers</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-5 w-5 text-sage-700" strokeWidth="1.5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-olive-900">Free & Premium Content</p>
                    <p className="text-[13px] text-olive-500 font-light">Access open content or unlock deeper teachings</p>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemFade}>
                <Button
                  asChild
                  size="lg"
                  className="bg-olive-800 hover:bg-olive-700 text-white rounded-full px-8"
                >
                  <Link href="/streams">
                    Browse Streams
                    <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Right Visual */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden border border-sage-200/60 shadow-lg">
                <Image
                  src="/living-streams-preview.png"
                  alt="Living Streams content preview"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
