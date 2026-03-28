"use client"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { modalityCategoriesListOptions } from "@/src/client/@tanstack/react-query.gen"

const FeaturedCategoriesSection = () => {
  const { data, isLoading, isError } = useQuery(
    modalityCategoriesListOptions({
      query: {
        is_active: true,
        ordering: "order",
        page_size: 6,
      },
    })
  )

  const categories = data?.results ?? []

  // Hide section entirely if error or no data
  if (isError) return null
  if (!isLoading && categories.length === 0) return null

  return (
    <section className="py-12 md:py-16 bg-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-[15%] left-[8%] w-[250px] h-[250px] rounded-full bg-primary/5 blur-3xl opacity-70 z-0" />
      <div className="absolute bottom-[10%] right-[5%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-3xl opacity-70 z-0" />

      <div className="container relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Explore Wellness Categories</h2>
          <div className="h-1 w-20 bg-primary/80 mx-auto rounded-full mb-4"></div>
          <p className="text-muted-foreground max-w-[800px] mx-auto">
            Discover diverse paths to wellness and personal growth through our curated categories.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[280px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="h-full flex flex-col rounded-xl overflow-hidden transition-all duration-300 hover:translate-y-[-8px] hover:shadow-md"
              >
                <div
                  className="h-[180px] relative flex items-center justify-center"
                  style={{
                    backgroundColor: category.color ? `${category.color}20` : "#f0f0f0",
                  }}
                >
                  {category.icon && (
                    <span className="text-6xl">{category.icon}</span>
                  )}
                </div>
                <CardContent className="flex-grow p-6">
                  <h3 className="text-lg font-semibold mb-3">{category.name}</h3>
                  <p className="text-muted-foreground mb-4">
                    {category.short_description || `Explore ${category.name.toLowerCase()} practices and services.`}
                  </p>
                  {category.modality_count != null && category.modality_count > 0 && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {category.modality_count} {category.modality_count === 1 ? "modality" : "modalities"}
                    </p>
                  )}
                  <Button variant="ghost" className="mt-auto text-primary hover:bg-primary/10" asChild>
                    <Link href={`/marketplace?modality_category=${category.slug || category.name.toLowerCase().replace(/\s+/g, "-")}`}>
                      Explore
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default FeaturedCategoriesSection
