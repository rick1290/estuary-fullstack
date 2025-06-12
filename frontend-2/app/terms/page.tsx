import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight } from "lucide-react"

export default function TermsOfServicePage() {
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
            <BreadcrumbLink href="/terms">Terms of Service</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-8">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last Updated: May 10, 2025</p>
        </section>

        <div className="prose prose-slate max-w-none">
          <p>
            Welcome to Estuary. These Terms of Service ("Terms") govern your access to and use of the Estuary website,
            mobile application, and services (collectively, the "Services"). Please read these Terms carefully before
            using our Services.
          </p>

          <p>
            By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do
            not agree to these Terms, you may not access or use the Services.
          </p>

          <h2>1. Using Our Services</h2>

          <h3>1.1 Eligibility</h3>
          <p>
            You must be at least 18 years old to use our Services. By using our Services, you represent and warrant that
            you meet all eligibility requirements.
          </p>

          <h3>1.2 Account Registration</h3>
          <p>
            To access certain features of our Services, you may need to register for an account. You agree to provide
            accurate, current, and complete information during the registration process and to update such information
            to keep it accurate, current, and complete.
          </p>

          <h3>1.3 Account Security</h3>
          <p>
            You are responsible for safeguarding your account credentials and for all activities that occur under your
            account. You agree to notify us immediately of any unauthorized use of your account.
          </p>

          <h2>2. Practitioner Services</h2>

          <h3>2.1 Practitioner Listings</h3>
          <p>
            Estuary provides a platform for wellness practitioners to offer their services. We do not employ or control
            these practitioners. We are not responsible for the quality, safety, or legality of the services they
            provide.
          </p>

          <h3>2.2 Booking and Payments</h3>
          <p>
            When you book a session with a practitioner through our Services, you agree to pay all applicable fees.
            Payments are processed through our third-party payment processors. Cancellation and refund policies may vary
            by practitioner and are specified at the time of booking.
          </p>

          <h2>3. User Content</h2>

          <h3>3.1 Content Ownership</h3>
          <p>
            You retain ownership of any content you submit, post, or display on or through our Services ("User
            Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use,
            copy, modify, create derivative works based on, distribute, publicly display, and publicly perform your User
            Content in connection with operating and providing our Services.
          </p>

          <h3>3.2 Content Guidelines</h3>
          <p>You agree not to post User Content that:</p>
          <ul>
            <li>Violates any applicable law or regulation</li>
            <li>Infringes on the rights of any third party</li>
            <li>Is harmful, abusive, defamatory, obscene, or otherwise objectionable</li>
            <li>Contains any malicious code or attempts to interfere with the proper functioning of our Services</li>
            <li>Constitutes unauthorized commercial communications</li>
          </ul>

          <h2>4. Intellectual Property</h2>
          <p>
            Our Services and their contents, features, and functionality are owned by Estuary and are protected by
            copyright, trademark, and other intellectual property laws. You may not use our name, logo, or other
            proprietary information without our prior written consent.
          </p>

          <h2>5. Termination</h2>
          <p>
            We may terminate or suspend your access to our Services immediately, without prior notice or liability, for
            any reason, including if you breach these Terms. Upon termination, your right to use the Services will
            immediately cease.
          </p>

          <h2>6. Disclaimer of Warranties</h2>
          <p>
            OUR SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
            IMPLIED. TO THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR
            IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT.
          </p>

          <h2>7. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL ESTUARY BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE,
            GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE
            THE SERVICES.
          </p>

          <h2>8. Changes to Terms</h2>
          <p>
            We may revise these Terms from time to time. The most current version will always be posted on our website.
            By continuing to access or use our Services after revisions become effective, you agree to be bound by the
            revised Terms.
          </p>

          <h2>9. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of New York, without
            regard to its conflict of law provisions.
          </p>

          <h2>10. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at legal@estuary.com.</p>
        </div>
      </div>
    </div>
  )
}
