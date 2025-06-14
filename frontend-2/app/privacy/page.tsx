import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight } from "lucide-react"

export default function PrivacyPolicyPage() {
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
            <BreadcrumbLink href="/privacy">Privacy Policy</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-8">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last Updated: May 10, 2025</p>
        </section>

        <div className="prose prose-slate max-w-none">
          <p>
            At Estuary, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our website, mobile application, and services (collectively, the
            "Services").
          </p>

          <p>
            Please read this Privacy Policy carefully. By accessing or using our Services, you acknowledge that you have
            read, understood, and agree to be bound by all the terms of this Privacy Policy.
          </p>

          <h2>1. Information We Collect</h2>

          <h3>1.1 Personal Information</h3>
          <p>We may collect personal information that you voluntarily provide to us when you:</p>
          <ul>
            <li>Register for an account</li>
            <li>Fill out a form</li>
            <li>Book a session with a practitioner</li>
            <li>Participate in surveys or contests</li>
            <li>Contact us with inquiries</li>
            <li>Post content on our platform</li>
          </ul>
          <p>This information may include:</p>
          <ul>
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Mailing address</li>
            <li>Payment information</li>
            <li>Demographic information</li>
            <li>Health and wellness preferences</li>
          </ul>

          <h3>1.2 Automatically Collected Information</h3>
          <p>When you access our Services, we may automatically collect certain information, including:</p>
          <ul>
            <li>Device information (e.g., device type, operating system)</li>
            <li>IP address</li>
            <li>Browser type</li>
            <li>Usage patterns</li>
            <li>Referring URLs</li>
            <li>Location information</li>
          </ul>

          <h3>1.3 Cookies and Similar Technologies</h3>
          <p>
            We use cookies and similar tracking technologies to collect information about your browsing activities. You
            can control cookies through your browser settings and other tools. For more information, please see our
            Cookie Policy.
          </p>

          <h2>2. How We Use Your Information</h2>
          <p>We may use the information we collect for various purposes, including to:</p>
          <ul>
            <li>Provide, maintain, and improve our Services</li>
            <li>Process transactions and send related information</li>
            <li>Send administrative information, such as updates, security alerts, and support messages</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Personalize your experience and deliver content relevant to your interests</li>
            <li>Monitor and analyze trends, usage, and activities in connection with our Services</li>
            <li>Detect, prevent, and address technical issues, fraud, or illegal activities</li>
            <li>Develop new products and services</li>
          </ul>

          <h2>3. How We Share Your Information</h2>
          <p>We may share your information in the following circumstances:</p>

          <h3>3.1 With Practitioners</h3>
          <p>
            When you book a session with a practitioner, we share relevant information with them to facilitate the
            service.
          </p>

          <h3>3.2 With Service Providers</h3>
          <p>
            We may share your information with third-party vendors, service providers, contractors, or agents who
            perform services for us or on our behalf.
          </p>

          <h3>3.3 For Legal Reasons</h3>
          <p>
            We may disclose your information if required to do so by law or in response to valid requests by public
            authorities (e.g., a court or government agency).
          </p>

          <h3>3.4 Business Transfers</h3>
          <p>
            If we are involved in a merger, acquisition, or sale of all or a portion of our assets, your information may
            be transferred as part of that transaction.
          </p>

          <h3>3.5 With Your Consent</h3>
          <p>We may share your information with third parties when you have given us your consent to do so.</p>

          <h2>4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect the security of your personal
            information. However, please be aware that no method of transmission over the Internet or method of
            electronic storage is 100% secure.
          </p>

          <h2>5. Your Privacy Rights</h2>
          <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
          <ul>
            <li>The right to access your personal information</li>
            <li>The right to rectify inaccurate or incomplete information</li>
            <li>The right to erasure of your personal information</li>
            <li>The right to restrict processing of your personal information</li>
            <li>The right to data portability</li>
            <li>The right to object to processing of your personal information</li>
          </ul>
          <p>
            To exercise these rights, please contact us using the information provided in the "Contact Us" section
            below.
          </p>

          <h2>6. Children's Privacy</h2>
          <p>
            Our Services are not intended for individuals under the age of 18. We do not knowingly collect personal
            information from children under 18. If we learn we have collected or received personal information from a
            child under 18, we will delete that information.
          </p>

          <h2>7. International Data Transfers</h2>
          <p>
            Your information may be transferred to, and maintained on, computers located outside of your state,
            province, country, or other governmental jurisdiction where the data protection laws may differ from those
            in your jurisdiction.
          </p>

          <h2>8. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
            Privacy Policy on this page and updating the "Last Updated" date at the top of this Privacy Policy.
          </p>

          <h2>9. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at:</p>
          <p>
            Email: privacy@estuary.com
            <br />
            Address: 123 Wellness Way, New York, NY 10001, United States
          </p>
        </div>
      </div>
    </div>
  )
}
