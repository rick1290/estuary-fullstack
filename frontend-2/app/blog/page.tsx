import Image from "next/image"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"

export default function BlogPage() {
  const featuredPost = {
    title: "The Science Behind Mindfulness: How Daily Practice Changes Your Brain",
    excerpt:
      "Recent studies show that consistent mindfulness practice can physically alter brain structure and function, leading to improved focus, reduced stress, and enhanced emotional regulation.",
    image: "/mindful-breath.png",
    date: "May 8, 2025",
    author: "Dr. Sarah Chen",
    authorImage: "/practitioner-1.jpg",
    category: "Mindfulness",
    readTime: "8 min read",
  }

  const recentPosts = [
    {
      title: "5 Breathwork Techniques to Reduce Anxiety in Minutes",
      excerpt: "Simple breathing exercises you can practice anywhere to quickly calm your nervous system.",
      image: "/mindful-breathing.png",
      date: "May 5, 2025",
      author: "Michael Rodriguez",
      category: "Anxiety Relief",
      readTime: "5 min read",
    },
    {
      title: "How to Choose the Right Wellness Practitioner for Your Needs",
      excerpt: "Navigate the diverse world of wellness practitioners with confidence using these expert tips.",
      image: "/confident-professional.png",
      date: "May 3, 2025",
      author: "Aisha Johnson",
      category: "Wellness Guide",
      readTime: "6 min read",
    },
    {
      title: "The Connection Between Movement and Mental Health",
      excerpt: "Discover how different types of physical activity can support your psychological wellbeing.",
      image: "/diverse-fitness-group.png",
      date: "April 29, 2025",
      author: "David Kim",
      category: "Movement",
      readTime: "7 min read",
    },
  ]

  const categories = [
    "Mindfulness",
    "Meditation",
    "Movement",
    "Nutrition",
    "Mental Health",
    "Spiritual Growth",
    "Relationships",
    "Practitioner Insights",
    "Wellness Research",
  ]

  return (
    <div className="container max-w-5xl py-12">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink href="/blog">Blog</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-12">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Estuary Blog</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Insights, research, and practical wisdom for your wellness journey.
          </p>
        </section>

        <div className="relative flex items-center">
          <Input placeholder="Search articles..." className="pl-10" />
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Featured Article</h2>
          <div className="relative rounded-xl overflow-hidden">
            <div className="relative h-[400px]">
              <Image
                src={featuredPost.image || "/placeholder.svg"}
                alt={featuredPost.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-primary/90 text-white text-xs px-2 py-1 rounded-full">
                    {featuredPost.category}
                  </span>
                  <span className="text-xs">{featuredPost.readTime}</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{featuredPost.title}</h3>
                <p className="mb-4 text-white/80">{featuredPost.excerpt}</p>
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10">
                    <Image
                      src={featuredPost.authorImage || "/placeholder.svg"}
                      alt={featuredPost.author}
                      fill
                      className="object-cover rounded-full"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{featuredPost.author}</p>
                    <p className="text-xs text-white/70">{featuredPost.date}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        <div className="grid md:grid-cols-3 gap-8">
          <section className="md:col-span-2">
            <h2 className="text-2xl font-semibold mb-6">Recent Articles</h2>
            <div className="space-y-6">
              {recentPosts.map((post, index) => (
                <Card key={index}>
                  <div className="sm:flex">
                    <div className="relative h-48 sm:h-auto sm:w-1/3">
                      <Image
                        src={post.image || "/placeholder.svg"}
                        alt={post.title}
                        fill
                        className="object-cover rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none"
                      />
                    </div>
                    <div className="p-6 sm:w-2/3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
                          {post.category}
                        </span>
                        <span className="text-xs text-muted-foreground">{post.readTime}</span>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
                      <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          By {post.author} • {post.date}
                        </span>
                        <Button variant="link" className="p-0">
                          Read More
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Button variant="outline">Load More Articles</Button>
            </div>
          </section>

          <section>
            <div className="sticky top-6 space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category, index) => (
                    <Link
                      key={index}
                      href={`/blog/category/${category.toLowerCase().replace(/\s+/g, "-")}`}
                      className="bg-[rgba(245,240,235,0.7)] hover:bg-[rgba(245,240,235,0.9)] px-3 py-1 rounded-full text-sm"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Subscribe to Our Newsletter</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get the latest articles, resources, and wellness tips delivered to your inbox.
                </p>
                <div className="space-y-2">
                  <Input placeholder="Your email address" />
                  <Button className="w-full">Subscribe</Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
