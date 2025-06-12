"use client"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function StreamsTeaserSection() {
  return (
    <section className="py-12 bg-[#F0F7F8] relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-10">
        <Image
          src="/stream-wave-background.svg"
          alt=""
          fill
          style={{
            objectFit: "cover",
          }}
          priority
        />
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 right-0 z-0 h-[300px] w-[300px] overflow-hidden opacity-10 pointer-events-none">
        <Image
          src="/decorative-streams-pattern.svg"
          alt=""
          fill
          style={{
            objectFit: "contain",
            objectPosition: "bottom right",
          }}
          priority
        />
      </div>

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[#014451] mb-4">Join Our Streams Community</h2>
          <p className="text-[#014451]/80 text-lg mb-6">
            Connect with practitioners and fellow seekers in our vibrant online community. Share insights, ask
            questions, and deepen your journey through meaningful conversations and exclusive content.
          </p>
          <div className="flex justify-center gap-4 mb-8">
            <Button className="rounded-full bg-[#014451] hover:bg-[#014451]/90" asChild>
              <Link href="/streams">
                Explore Streams
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="relative h-[200px] rounded-xl overflow-hidden shadow-lg">
            <Image src="/mindful-yoga-community.png" alt="Streams Community" fill style={{ objectFit: "cover" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#014451]/70 to-transparent flex items-end p-4">
              <p className="text-white text-lg font-medium">Join the conversation today</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
