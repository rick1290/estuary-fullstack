import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Instagram, Facebook, Twitter, Linkedin, Youtube, ArrowRight } from "lucide-react"

export default function Footer() {
  const footerLinks = {
    explore: [
      { name: "Marketplace", href: "/marketplace" },
      { name: "Find Practitioners", href: "/marketplace/practitioners" },
      { name: "Sessions", href: "/marketplace/sessions" },
      { name: "Workshops", href: "/marketplace/workshops" },
      { name: "Courses", href: "/marketplace/courses" },
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

  const socialLinks = [
    { icon: Instagram, href: "https://instagram.com/estuary", label: "Instagram" },
    { icon: Facebook, href: "https://facebook.com/estuary", label: "Facebook" },
    { icon: Twitter, href: "https://twitter.com/estuary", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com/company/estuary", label: "LinkedIn" },
    { icon: Youtube, href: "https://youtube.com/estuary", label: "YouTube" },
  ]

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="container max-w-7xl py-12 md:py-16">
        {/* Main footer content */}
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Brand section */}
          <div className="lg:col-span-2 max-w-md">
            <h3 className="text-xl font-medium mb-4">ESTUARY</h3>
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
                  className="bg-gray-50 border-gray-200 flex-1"
                />
                <Button size="sm" className="px-4">
                  <ArrowRight className="h-4 w-4" />
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
              <h3 className="text-sm font-medium text-gray-900 mb-4">Explore</h3>
              <ul className="space-y-3">
                {footerLinks.explore.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href} 
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Company</h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href} 
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Support</h3>
              <ul className="space-y-3">
                {footerLinks.support.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href} 
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Legal links and copyright */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} Estuary
            </p>
            <div className="flex gap-4">
              {footerLinks.legal.map((link, index) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Social links */}
          <div className="flex gap-2">
            {socialLinks.map((link) => {
              const Icon = link.icon
              return (
                <Button
                  key={link.label}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-600 hover:text-gray-900"
                  asChild
                >
                  <a 
                    href={link.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label={link.label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}