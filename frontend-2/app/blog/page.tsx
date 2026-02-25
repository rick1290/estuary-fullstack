import { createMetadata } from "@/lib/seo"
import BlogPage from "./blog-client"

export const metadata = createMetadata({
  title: "Blog",
  description:
    "Insights, stories, and wisdom from the Estuary community — practitioner perspectives, wellness research, and more.",
  path: "/blog",
})

export default function Blog() {
  return <BlogPage />
}
