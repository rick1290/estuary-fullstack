import type { Metadata } from "next"
import PostPageContent from "./post-page-content"

interface PostPageProps {
  params: Promise<{ uuid: string }>
}

async function fetchPost(uuid: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  try {
    const res = await fetch(`${baseUrl}/api/v1/stream-posts/${uuid}/`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { uuid } = await params
  const post = await fetchPost(uuid)

  if (!post) {
    return {
      title: "Post Not Found | Estuary",
      description: "This post could not be found.",
    }
  }

  const title = post.title || `Post by ${post.practitioner_name || "Practitioner"}`
  const description =
    post.teaser_text ||
    (post.content ? post.content.substring(0, 160) : "View this post on Estuary")

  return {
    title: `${title} | Estuary`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at,
      authors: post.practitioner_name ? [post.practitioner_name] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { uuid } = await params
  return <PostPageContent uuid={uuid} />
}
