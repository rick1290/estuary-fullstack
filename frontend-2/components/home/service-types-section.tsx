"use client"
import Link from "next/link"
import { ArrowRight, User, GraduationCap, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"

export default function ServiceTypesSection() {
  return (
    <section className="py-12 md:py-16 bg-muted/50 overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-primary/5 blur-3xl top-[-100px] left-[-100px] z-0" />
      <div className="absolute w-[200px] h-[200px] rounded-full bg-secondary/5 blur-3xl bottom-[50px] right-[10%] z-0" />

      <div className="container relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Your Journey to Wellness</h2>
          <div className="h-1 w-20 bg-primary/80 mx-auto rounded-full mb-4"></div>
          <p className="text-muted-foreground max-w-[700px] mx-auto">
            Discover personalized paths to growth and healing through our diverse offerings, each designed to support
            your unique journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col transition-all duration-300 hover:translate-y-[-8px] hover:shadow-md border-t-4 border-t-indigo-400 overflow-hidden">
            <div className="p-4 flex justify-center">
              <Avatar className="w-20 h-20 bg-indigo-100 text-indigo-600">
                <User className="h-10 w-10" />
              </Avatar>
            </div>
            <CardContent className="flex-grow text-center px-6 pb-6">
              <h3 className="text-xl font-semibold mb-3">Personal Sessions</h3>
              <p className="text-muted-foreground mb-6">
                Connect one-on-one with practitioners who listen, understand, and guide you through personalized healing
                experiences.
              </p>
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/marketplace/sessions">
                  Explore Sessions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col transition-all duration-300 hover:translate-y-[-8px] hover:shadow-md border-t-4 border-t-teal-400 overflow-hidden md:-mt-2">
            <div className="p-4 flex justify-center">
              <Avatar className="w-20 h-20 bg-teal-100 text-teal-600">
                <GraduationCap className="h-10 w-10" />
              </Avatar>
            </div>
            <CardContent className="flex-grow text-center px-6 pb-6">
              <h3 className="text-xl font-semibold mb-3">Transformative Courses</h3>
              <p className="text-muted-foreground mb-6">
                Embark on structured learning journeys that deepen your understanding and foster lasting personal
                growth.
              </p>
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/marketplace/courses">
                  Explore Courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col transition-all duration-300 hover:translate-y-[-8px] hover:shadow-md border-t-4 border-t-orange-400 overflow-hidden">
            <div className="p-4 flex justify-center">
              <Avatar className="w-20 h-20 bg-orange-100 text-orange-600">
                <Users className="h-10 w-10" />
              </Avatar>
            </div>
            <CardContent className="flex-grow text-center px-6 pb-6">
              <h3 className="text-xl font-semibold mb-3">Community Workshops</h3>
              <p className="text-muted-foreground mb-6">
                Join like-minded individuals in immersive group experiences that inspire connection and collective
                growth.
              </p>
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/marketplace/workshops">
                  Explore Workshops
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
