"use client"

export default function SocialProofStrip() {
  const stats = [
    { number: "420+", label: "Practitioners" },
    { number: "2,800+", label: "Sessions Booked" },
    { number: "4.9", label: "Average Rating" },
    { number: "98%", label: "Satisfaction" },
  ]

  return (
    <section
      className="relative py-12 md:py-14 overflow-hidden"
      style={{ backgroundColor: "#6B7D5E" }}
    >
      {/* Subtle dot texture overlay */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='rgba(255,255,255,0.06)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="container max-w-5xl px-4 sm:px-6 relative z-10">
        <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16 md:gap-20">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-serif text-3xl sm:text-4xl font-normal text-white mb-1 tracking-tight">
                {stat.number}
              </div>
              <div className="text-[13px] text-white/70 font-light">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
