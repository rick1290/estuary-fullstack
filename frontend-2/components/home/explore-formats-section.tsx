"use client"
import Link from "next/link"
import { Users, GraduationCap, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

// Format options
const FORMAT_OPTIONS = [
  {
    title: "Workshops",
    description: "Join group experiences led by expert practitioners",
    icon: <Users className="h-8 w-8" />,
    href: "/marketplace/workshops",
    color: "bg-[#F8EDE3]",
    textColor: "text-[#9A6D38]",
    iconColor: "text-[#9A6D38]",
  },
  {
    title: "Courses",
    description: "Embark on structured learning journeys",
    icon: <GraduationCap className="h-8 w-8" />,
    href: "/marketplace/courses",
    color: "bg-[#E3EFE3]",
    textColor: "text-[#4A6D4A]",
    iconColor: "text-[#4A6D4A]",
  },
  {
    title: "1:1 Sessions",
    description: "Connect with practitioners for personalized guidance",
    icon: <User className="h-8 w-8" />,
    href: "/marketplace/sessions",
    color: "bg-[#E8E3EF]",
    textColor: "text-[#6D4A9A]",
    iconColor: "text-[#6D4A9A]",
  },
]

export default function ExploreFormatsSection() {
  return (
    <section className="py-12 bg-[#F8F5F1]/30 relative overflow-hidden">
      {/* Decorative wave SVG */}
      <div className="absolute top-0 left-0 right-0 h-12 overflow-hidden z-0">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 w-full h-12 text-white">
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            opacity=".25"
            fill="currentColor"
          ></path>
          <path
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
            opacity=".5"
            fill="currentColor"
          ></path>
          <path
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
            fill="currentColor"
          ></path>
        </svg>
      </div>

      <div className="container relative z-10 mt-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-[#4A4036]">Explore by Format</h2>
          <p className="text-[#4A4036]/70 max-w-[600px] mx-auto">
            Discover the perfect way to engage with our community of practitioners
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {FORMAT_OPTIONS.map((format) => (
            <Link key={format.title} href={format.href} className="block h-full">
              <Card
                className={`h-full transition-all duration-300 hover:shadow-md hover:translate-y-[-4px] ${format.color} border-none`}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className={`p-4 rounded-full ${format.color} ${format.iconColor} mb-4`}>{format.icon}</div>
                  <h3 className={`text-xl font-semibold mb-2 ${format.textColor}`}>{format.title}</h3>
                  <p className={`${format.textColor}/80`}>{format.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
