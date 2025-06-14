import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function CookiePolicyPage() {
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
            <BreadcrumbLink href="/cookies">Cookie Policy</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-8">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Cookie Policy</h1>
          <p className="text-muted-foreground">Last Updated: May 10, 2025</p>
        </section>

        <div className="prose prose-slate max-w-none">
          <p>
            This Cookie Policy explains how Estuary ("we", "us", or "our") uses cookies and similar technologies to
            recognize you when you visit our website and use our services. It explains what these technologies are and
            why we use them, as well as your rights to control our use of them.
          </p>

          <h2>1. What Are Cookies?</h2>
          <p>
            Cookies are small data files that are placed on your computer or mobile device when you visit a website.
            Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well
            as to provide reporting information.
          </p>
          <p>
            Cookies set by the website owner (in this case, Estuary) are called "first-party cookies". Cookies set by
            parties other than the website owner are called "third-party cookies". Third-party cookies enable
            third-party features or functionality to be provided on or through the website (e.g., advertising,
            interactive content, and analytics).
          </p>

          <h2>2. Why Do We Use Cookies?</h2>
          <p>
            We use first-party and third-party cookies for several reasons. Some cookies are required for technical
            reasons in order for our website to operate, and we refer to these as "essential" or "strictly necessary"
            cookies. Other cookies enable us to track and target the interests of our users to enhance the experience on
            our website. Third parties serve cookies through our website for advertising, analytics, and other purposes.
          </p>

          <h2>3. Types of Cookies We Use</h2>
          <p>
            The specific types of first and third-party cookies served through our website and the purposes they perform
            are described below:
          </p>

          <h3>3.1 Essential Cookies</h3>
          <p>
            These cookies are strictly necessary to provide you with services available through our website and to use
            some of its features, such as access to secure areas. Because these cookies are strictly necessary to
            deliver the website, you cannot refuse them without impacting how our website functions.
          </p>

          <h3>3.2 Performance and Functionality Cookies</h3>
          <p>
            These cookies are used to enhance the performance and functionality of our website but are non-essential to
            their use. However, without these cookies, certain functionality may become unavailable.
          </p>

          <h3>3.3 Analytics and Customization Cookies</h3>
          <p>
            These cookies collect information that is used either in aggregate form to help us understand how our
            website is being used or how effective our marketing campaigns are, or to help us customize our website for
            you.
          </p>

          <h3>3.4 Advertising Cookies</h3>
          <p>
            These cookies are used to make advertising messages more relevant to you. They perform functions like
            preventing the same ad from continuously reappearing, ensuring that ads are properly displayed, and in some
            cases selecting advertisements that are based on your interests.
          </p>

          <h3>3.5 Social Media Cookies</h3>
          <p>
            These cookies are used to enable you to share pages and content that you find interesting on our website
            through third-party social networking and other websites. These cookies may also be used for advertising
            purposes.
          </p>

          <h2>4. Specific Cookies We Use</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>_estuary_session</TableCell>
                <TableCell>Used to maintain your session state across page requests</TableCell>
                <TableCell>Session</TableCell>
                <TableCell>Essential</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>estuary_auth</TableCell>
                <TableCell>Used to authenticate logged-in users</TableCell>
                <TableCell>30 days</TableCell>
                <TableCell>Essential</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>estuary_preferences</TableCell>
                <TableCell>Stores user preferences such as display settings</TableCell>
                <TableCell>1 year</TableCell>
                <TableCell>Functionality</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>_ga</TableCell>
                <TableCell>Used by Google Analytics to distinguish users</TableCell>
                <TableCell>2 years</TableCell>
                <TableCell>Analytics</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>_gid</TableCell>
                <TableCell>Used by Google Analytics to distinguish users</TableCell>
                <TableCell>24 hours</TableCell>
                <TableCell>Analytics</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>_fbp</TableCell>
                <TableCell>Used by Facebook to deliver advertisements</TableCell>
                <TableCell>3 months</TableCell>
                <TableCell>Advertising</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <h2>5. How to Control Cookies</h2>
          <p>
            You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences
            by clicking on the appropriate opt-out links provided in the cookie table above.
          </p>
          <p>
            You can also set or amend your web browser controls to accept or refuse cookies. If you choose to reject
            cookies, you may still use our website though your access to some functionality and areas of our website may
            be restricted. As the means by which you can refuse cookies through your web browser controls vary from
            browser-to-browser, you should visit your browser's help menu for more information.
          </p>

          <h2>6. How Often Will We Update This Cookie Policy?</h2>
          <p>
            We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies
            we use or for other operational, legal, or regulatory reasons. Please therefore re-visit this Cookie Policy
            regularly to stay informed about our use of cookies and related technologies.
          </p>
          <p>The date at the top of this Cookie Policy indicates when it was last updated.</p>

          <h2>7. Where Can You Get Further Information?</h2>
          <p>
            If you have any questions about our use of cookies or other technologies, please email us at
            privacy@estuary.com or contact us at:
          </p>
          <p>
            Estuary
            <br />
            123 Wellness Way
            <br />
            New York, NY 10001
            <br />
            United States
          </p>
        </div>
      </div>
    </div>
  )
}
