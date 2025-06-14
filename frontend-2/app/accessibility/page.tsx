import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight } from "lucide-react"

export default function AccessibilityPage() {
  return (
    <div className="container max-w-4xl py-12">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink href="/accessibility">Accessibility</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-8">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Accessibility Statement</h1>
          <p className="text-muted-foreground">Last Updated: May 10, 2025</p>
        </section>

        <div className="prose prose-slate max-w-none">
          <p>
            Estuary is committed to ensuring digital accessibility for people with disabilities. We are continually
            improving the user experience for everyone, and applying the relevant accessibility standards.
          </p>

          <h2>1. Conformance Status</h2>
          <p>
            The Web Content Accessibility Guidelines (WCAG) define requirements for designers and developers to improve
            accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and
            Level AAA. Estuary is partially conformant with WCAG 2.1 level AA. Partially conformant means that some
            parts of the content do not fully conform to the accessibility standard.
          </p>

          <h2>2. Accessibility Features</h2>
          <p>Estuary's website includes the following accessibility features:</p>
          <ul>
            <li>Semantic HTML structure for better screen reader navigation</li>
            <li>Keyboard navigation support for all interactive elements</li>
            <li>Sufficient color contrast for text and important graphics</li>
            <li>Text alternatives for non-text content</li>
            <li>Resizable text without loss of functionality</li>
            <li>Clear headings and labels</li>
            <li>Consistent navigation structure</li>
            <li>Focus indicators for keyboard users</li>
          </ul>

          <h2>3. Limitations and Alternatives</h2>
          <p>
            Despite our best efforts to ensure accessibility of Estuary, there may be some limitations. Below is a
            description of known limitations, and potential solutions. Please contact us if you observe an issue not
            listed below.
          </p>
          <ul>
            <li>
              <strong>Third-party content:</strong> Some content provided by third-party practitioners may not be fully
              accessible. We are working with our practitioners to improve this.
            </li>
            <li>
              <strong>Legacy content:</strong> Some older content may not be fully accessible. We are working to update
              this content.
            </li>
            <li>
              <strong>Video content:</strong> Some video content may not have captions or audio descriptions. We are
              working to add these features.
            </li>
          </ul>

          <h2>4. Feedback</h2>
          <p>
            We welcome your feedback on the accessibility of Estuary. Please let us know if you encounter accessibility
            barriers on our website:
          </p>
          <ul>
            <li>Email: accessibility@estuary.com</li>
            <li>Phone: (800) 555-1234</li>
            <li>Postal address: 123 Wellness Way, New York, NY 10001, United States</li>
          </ul>
          <p>We try to respond to feedback within 2 business days.</p>

          <h2>5. Assessment Approach</h2>
          <p>Estuary assessed the accessibility of our website by the following approaches:</p>
          <ul>
            <li>Self-evaluation</li>
            <li>External evaluation by accessibility experts</li>
            <li>User testing with people with disabilities</li>
          </ul>

          <h2>6. Compatibility with Browsers and Assistive Technology</h2>
          <p>Estuary is designed to be compatible with the following assistive technologies:</p>
          <ul>
            <li>Screen readers (including NVDA, JAWS, VoiceOver, and TalkBack)</li>
            <li>Speech recognition software</li>
            <li>Screen magnifiers</li>
            <li>Alternative input devices</li>
          </ul>
          <p>
            Estuary is compatible with recent versions of major browsers, including Chrome, Firefox, Safari, and Edge.
          </p>

          <h2>7. Technical Specifications</h2>
          <p>
            Accessibility of Estuary relies on the following technologies to work with the particular combination of web
            browser and any assistive technologies or plugins installed on your computer:
          </p>
          <ul>
            <li>HTML</li>
            <li>WAI-ARIA</li>
            <li>CSS</li>
            <li>JavaScript</li>
          </ul>
          <p>These technologies are relied upon for conformance with the accessibility standards used.</p>

          <h2>8. Continuous Improvement</h2>
          <p>Estuary is committed to continually improving accessibility for all users. We will:</p>
          <ul>
            <li>Conduct regular accessibility audits</li>
            <li>Provide accessibility training for our staff</li>
            <li>Include accessibility as part of our development process</li>
            <li>Consider accessibility in our procurement processes</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
