"use client"

import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

interface ModalityAboutSectionProps {
  modalityName: string
  longDescription: string
  benefits: { title: string; description: string }[]
}

export default function ModalityAboutSection({
  modalityName,
  longDescription,
  benefits,
}: ModalityAboutSectionProps) {
  return (
    <section className="py-16 md:py-20 px-4 sm:px-6">
      <motion.div
        className="max-w-3xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.div variants={itemFade} className="text-center mb-10">
          <span className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-3 block">
            About This Modality
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-olive-900">
            What Is {modalityName}?
          </h2>
        </motion.div>

        <motion.div variants={itemFade} className="prose prose-olive mx-auto mb-12">
          <p className="text-olive-600 font-light leading-relaxed text-lg text-center">
            {longDescription}
          </p>
        </motion.div>

        {benefits.length > 0 && (
          <>
            <motion.h3
              variants={itemFade}
              className="font-serif text-2xl font-normal text-olive-900 text-center mb-8"
            >
              Benefits of {modalityName}
            </motion.h3>

            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={benefit.title}
                  variants={itemFade}
                  className="relative bg-white rounded-2xl border border-sage-200/60 p-6"
                >
                  <span className="absolute -top-3 left-5 bg-terracotta-100/80 text-terracotta-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h4 className="font-medium text-olive-900 mb-2 mt-1">{benefit.title}</h4>
                  <p className="text-sm font-light text-olive-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </motion.div>
    </section>
  )
}
