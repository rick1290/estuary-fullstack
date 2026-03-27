"use client"
import { Mail, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

export default function ContactPage() {
  return (
    <div className="bg-cream-50">
      {/* Hero */}
      <section className="py-14 sm:py-20 md:py-24">
        <motion.div
          className="container max-w-2xl px-4 sm:px-6 lg:px-8 text-center mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="inline-block text-xs font-medium tracking-widest uppercase text-terracotta-600 bg-terracotta-100/60 px-4 py-1.5 rounded-full mb-6"
          >
            Get in Touch
          </motion.span>

          <motion.h1
            variants={itemFade}
            className="font-serif text-4xl sm:text-5xl md:text-[56px] font-light leading-[1.12] tracking-tight text-olive-900 mb-5"
          >
            We&rsquo;d Love to{" "}
            <em className="italic text-terracotta-600">Hear From You</em>
          </motion.h1>

          <motion.p
            variants={itemFade}
            className="text-base font-light leading-relaxed text-olive-600"
          >
            Whether you have a question, feedback, or just want to say hello —
            real humans read every message.
          </motion.p>
        </motion.div>
      </section>

      <div className="h-px bg-sage-200/60 mx-4 sm:mx-6" />

      {/* Form + sidebar */}
      <section className="py-16 md:py-20">
        <div className="container max-w-4xl px-4 sm:px-6 lg:px-8 mx-auto">
          <motion.div
            className="grid md:grid-cols-5 gap-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {/* Form */}
            <motion.div variants={itemFade} className="md:col-span-3">
              <div className="bg-white rounded-2xl border border-sage-200/60 p-5 sm:p-8">
                <h2 className="font-serif text-2xl font-light text-olive-900 mb-6">
                  Send a Message
                </h2>
                <form className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="first-name" className="text-sm font-light text-olive-700">
                        First Name
                      </Label>
                      <Input
                        id="first-name"
                        placeholder="First name"
                        className="border-sage-200/60 focus-visible:ring-sage-300"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="last-name" className="text-sm font-light text-olive-700">
                        Last Name
                      </Label>
                      <Input
                        id="last-name"
                        placeholder="Last name"
                        className="border-sage-200/60 focus-visible:ring-sage-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-light text-olive-700">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="border-sage-200/60 focus-visible:ring-sage-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inquiry-type" className="text-sm font-light text-olive-700">
                      What can we help with?
                    </Label>
                    <Select>
                      <SelectTrigger className="border-sage-200/60 focus:ring-sage-300">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Question</SelectItem>
                        <SelectItem value="support">Technical Support</SelectItem>
                        <SelectItem value="billing">Billing Inquiry</SelectItem>
                        <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="text-sm font-light text-olive-700">
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us what's on your mind..."
                      rows={5}
                      className="border-sage-200/60 focus-visible:ring-sage-300"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-olive-800 hover:bg-olive-700 text-white rounded-full"
                  >
                    Send Message
                  </Button>
                </form>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div variants={itemFade} className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-sage-200/60 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-sage-50 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-sage-700" strokeWidth="1.5" />
                  </div>
                  <h3 className="text-[15px] font-medium text-olive-900">Email Us</h3>
                </div>
                <a
                  href="mailto:support@estuary.com"
                  className="text-sm font-light text-terracotta-600 hover:text-terracotta-700 transition-colors"
                >
                  support@estuary.com
                </a>
              </div>

              <div className="bg-white rounded-2xl border border-sage-200/60 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-sage-50 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-sage-700" strokeWidth="1.5" />
                  </div>
                  <h3 className="text-[15px] font-medium text-olive-900">Live Chat</h3>
                </div>
                <p className="text-[13px] font-light text-olive-500 mb-3">
                  Chat with our team during business hours.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full border-sage-200/60 text-olive-700 hover:bg-sage-50"
                >
                  Start Chat
                </Button>
              </div>

              <div className="bg-cream-100/60 rounded-2xl border border-sage-200/60 p-6">
                <p className="font-serif text-[15px] italic font-light leading-relaxed text-olive-800 mb-3">
                  &ldquo;We&rsquo;re a small team that reads every message.
                  Expect a real reply, not a ticket number.&rdquo;
                </p>
                <span className="text-[10px] font-medium tracking-widest uppercase text-sage-600">
                  — The Estuary Team
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
