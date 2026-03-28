import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowRight } from "lucide-react"

export default function Footer() {
  const footerLinks = {
    explore: [
      { name: "Marketplace", href: "/marketplace" },
      { name: "Find Practitioners", href: "/marketplace/practitioners" },
      { name: "Sessions", href: "/marketplace/sessions" },
      { name: "Workshops", href: "/marketplace/workshops" },
      { name: "Courses", href: "/marketplace/courses" },
      { name: "Modalities", href: "/modalities" },
    ],
    company: [
      { name: "About", href: "/about" },
      { name: "Mission", href: "/mission" },
      { name: "Careers", href: "/careers" },
      { name: "Blog", href: "/blog" },
      { name: "Contact", href: "/contact" },
    ],
    support: [
      { name: "Help Center", href: "/help" },
      { name: "FAQ", href: "/help/faq" },
      { name: "Practitioner Guide", href: "/help/practitioners" },
      { name: "Community", href: "/community" },
      { name: "Resources", href: "/resources" },
      { name: "For Practitioners", href: "/become-practitioner" },
    ],
    legal: [
      { name: "Terms", href: "/terms" },
      { name: "Privacy", href: "/privacy" },
      { name: "Cookies", href: "/cookies" },
      { name: "Accessibility", href: "/accessibility" },
    ],
  }

  // Social links - hidden until accounts are created
  // To re-enable, add URLs here and uncomment the social links section in the footer
  // const socialLinks = {
  //   instagram: "https://instagram.com/estuarywellness",
  //   twitter: "https://twitter.com/estuarywellness",
  //   facebook: "https://facebook.com/estuarywellness",
  // }

  return (
    <footer className="bg-gradient-to-b from-cream-50 to-cream-100 border-t border-sage-200">
      <div className="container max-w-7xl py-12 md:py-16">
        {/* Main footer content */}
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Brand section */}
          <div className="lg:col-span-2 max-w-md">
            <h3 className="text-2xl font-serif font-medium mb-4 tracking-[0.25em]">ESTUARY</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Your sanctuary for wellness, growth, and meaningful connections. 
              Join thousands discovering balance and transformation.
            </p>
            
            {/* Newsletter */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Stay connected</h4>
              <form className="flex gap-2">
                <Input 
                  type="email"
                  placeholder="Enter your email" 
                  className="bg-white/80 border-sage-300 flex-1 rounded-xl"
                />
                <Button size="sm" className="px-4 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 rounded-xl">
                  <ArrowRight className="h-4 w-4" strokeWidth="1.5" />
                </Button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                Monthly wellness insights. Unsubscribe anytime.
              </p>
            </div>
          </div>

          {/* Links columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            <div>
              <h3 className="text-sm font-medium text-olive-900 mb-4">Explore</h3>
              <ul className="space-y-1">
                {footerLinks.explore.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-olive-600 hover:text-olive-900 transition-colors inline-flex items-center min-h-[44px] md:min-h-0"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-olive-900 mb-4">Company</h3>
              <ul className="space-y-1">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-olive-600 hover:text-olive-900 transition-colors inline-flex items-center min-h-[44px] md:min-h-0"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-olive-900 mb-4">Support</h3>
              <ul className="space-y-1">
                {footerLinks.support.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-olive-600 hover:text-olive-900 transition-colors inline-flex items-center min-h-[44px] md:min-h-0"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-sage-200" />

        {/* Bottom section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Legal links and copyright */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <p className="text-sm text-olive-600">
              © {new Date().getFullYear()} <span className="font-serif font-medium tracking-[0.25em]">ESTUARY</span>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm text-olive-600 hover:text-olive-900 transition-colors inline-flex items-center min-h-[44px] md:min-h-0"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Social links - hidden until accounts are created */}
        </div>
      </div>
    </footer>
  )
}