import Link from "next/link"
import { ChevronRight } from "lucide-react"

export default function StreamsHelpPage() {
  return (
    <div className="min-h-screen bg-[#FAF3E0]">
      <div className="container max-w-4xl py-12">
        {/* Back link */}
        <Link
          href="/help/practitioners"
          className="inline-flex items-center text-sm text-[#7A6F5D] hover:text-[#5a5243] mb-8"
        >
          <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
          Back to Practitioner Guide
        </Link>

        {/* Header */}
        <h1 className="text-4xl font-serif font-bold text-[#4a5240] tracking-tight mb-4">
          Content & Streams
        </h1>
        <p className="text-lg text-[#7A6F5D] mb-10 max-w-2xl">
          Streams are your content channel on Estuary. Publish articles, videos,
          and audio to build your audience and create an additional revenue
          stream.
        </p>

        {/* What are streams */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            What Are Streams?
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Streams are your personal content channel on the Estuary platform.
            Think of it as a blog, podcast, and video channel rolled into one.
            You can publish articles, share video content, upload audio
            recordings, and post images — all from your practitioner dashboard.
          </p>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Streams serve two purposes: they help potential clients discover you
            and understand your expertise, and they provide an additional way to
            earn income through premium content subscriptions.
          </p>
          <p className="text-[#7A6F5D] leading-relaxed">
            Your stream content appears on your practitioner profile and in the
            Streams discovery section of the marketplace where users can browse
            content by category and topic.
          </p>
        </div>

        {/* Subscription tiers */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Subscription Tiers
          </h2>
          <p className="text-[#7A6F5D] mb-6 leading-relaxed">
            You can offer content at three access levels. This lets you provide
            value to everyone while rewarding subscribers with exclusive content.
          </p>
          <div className="space-y-5">
            <div className="border-b border-[#9CAF88]/10 pb-5">
              <h3 className="font-semibold text-[#4a5240] mb-1">Free</h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed">
                Available to all users without a subscription. Free content is
                the best way to attract new followers and demonstrate your
                knowledge. Use it for introductory material, quick tips, and
                content that showcases your approach.
              </p>
            </div>
            <div className="border-b border-[#9CAF88]/10 pb-5">
              <h3 className="font-semibold text-[#4a5240] mb-1">Entry</h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed">
                Available to users who subscribe at your Entry tier price.
                This is your mid-level content — more in-depth than free posts,
                offering practical guidance and deeper exploration of topics.
                Entry tier is a great stepping stone for clients considering
                booking a full session with you.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[#4a5240] mb-1">Premium</h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed">
                Your highest-value content, available only to Premium
                subscribers. This might include detailed courses, exclusive
                workshops recordings, guided practice sessions, comprehensive
                guides, and direct Q&A. Premium content should offer clear,
                substantial value that justifies the higher subscription price.
              </p>
            </div>
          </div>
        </div>

        {/* Creating posts */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Creating Posts
          </h2>
          <p className="text-[#7A6F5D] mb-6 leading-relaxed">
            Publishing content on your stream is straightforward. Here is how to
            create a new post.
          </p>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Choose your content type
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Select from article, video, audio, or image. Each type has
                  its own editor and upload options.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Write and upload
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Add a title, write your content or upload your media, and
                  include a cover image. The rich text editor supports
                  formatting, links, and embedded media.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Set the access level
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Choose whether this post is Free, Entry, or Premium. Users
                  without the required subscription will see a preview and a
                  prompt to subscribe.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                4
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">Publish</h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Review your post and publish. It will appear on your stream
                  immediately. You can also save as a draft and publish later.
                  Existing subscribers will be notified of new content.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Monetization */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Monetization
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Streams offer a recurring revenue opportunity beyond session
            bookings. Here is how monetization works.
          </p>
          <ul className="space-y-3 text-sm text-[#7A6F5D]">
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Setting tier prices:
                </span>{" "}
                You set the monthly subscription price for your Entry and
                Premium tiers. Free content has no charge. Adjust your pricing
                at any time from your stream settings.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  What subscribers see:
                </span>{" "}
                Free users see all your free content plus previews of locked
                posts. Entry subscribers see free and entry-level content.
                Premium subscribers have access to everything.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Revenue tracking:
                </span>{" "}
                Subscription earnings appear in your financial dashboard
                alongside your service earnings. The same 5% commission and
                payout process applies.
              </span>
            </li>
          </ul>
        </div>

        {/* Building audience */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Building Your Audience
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Growing a stream audience takes consistency and genuine value. Here
            are tips that work well for Estuary practitioners.
          </p>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="text-[#9CAF88] font-bold">1.</span>
              <div>
                <span className="font-medium text-[#4a5240]">
                  Post consistently
                </span>
                <p className="text-sm text-[#7A6F5D] mt-0.5">
                  Whether it is weekly or biweekly, a regular publishing
                  schedule helps followers know when to expect new content.
                  Consistency builds trust and keeps your stream active in
                  recommendations.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-[#9CAF88] font-bold">2.</span>
              <div>
                <span className="font-medium text-[#4a5240]">
                  Lead with free content
                </span>
                <p className="text-sm text-[#7A6F5D] mt-0.5">
                  Give generously with your free posts. When people experience
                  the quality of your free content, they are much more likely
                  to subscribe for premium material.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-[#9CAF88] font-bold">3.</span>
              <div>
                <span className="font-medium text-[#4a5240]">
                  Mix content types
                </span>
                <p className="text-sm text-[#7A6F5D] mt-0.5">
                  Alternate between articles, videos, and audio. Different
                  formats appeal to different people and keep your stream
                  feeling dynamic and engaging.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-[#9CAF88] font-bold">4.</span>
              <div>
                <span className="font-medium text-[#4a5240]">
                  Share your expertise authentically
                </span>
                <p className="text-sm text-[#7A6F5D] mt-0.5">
                  The content that performs best is content that reflects your
                  genuine knowledge and passion. Share what you know deeply,
                  tell stories from your practice (with permission), and offer
                  actionable insights.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-[#9CAF88] font-bold">5.</span>
              <div>
                <span className="font-medium text-[#4a5240]">
                  Engage with your community
                </span>
                <p className="text-sm text-[#7A6F5D] mt-0.5">
                  Respond to comments and messages from followers. When people
                  feel seen and heard, they become loyal subscribers and
                  eventually clients.
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Support footer */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-3">
            Still Need Help?
          </h2>
          <p className="text-[#7A6F5D] mb-6 max-w-xl mx-auto">
            Questions about streams and content? Our support team is here to
            help.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-6 py-3 bg-[#9CAF88] text-white rounded-xl hover:bg-[#8a9e78] transition-colors font-medium"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
