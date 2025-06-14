import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  ChevronRight,
  Search,
  ArrowRight,
  BookOpen,
  CreditCard,
  Calendar,
  MessageSquare,
  User,
  Shield,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function HelpCenterPage() {
  const popularTopics = [
    {
      title: "Getting Started",
      icon: <BookOpen className="h-5 w-5" />,
      description: "Learn how to create an account and navigate the platform",
      articles: [
        "How to create an account",
        "Setting up your profile",
        "Finding the right practitioner",
        "Booking your first session",
      ],
    },
    {
      title: "Payments & Billing",
      icon: <CreditCard className="h-5 w-5" />,
      description: "Information about payment methods, refunds, and receipts",
      articles: [
        "Accepted payment methods",
        "Understanding our refund policy",
        "How to update billing information",
        "Downloading receipts and invoices",
      ],
    },
    {
      title: "Bookings & Scheduling",
      icon: <Calendar className="h-5 w-5" />,
      description: "How to book, reschedule, or cancel appointments",
      articles: [
        "How to book a session",
        "Rescheduling an appointment",
        "Cancellation policy",
        "Setting up recurring sessions",
      ],
    },
    {
      title: "Messaging & Communication",
      icon: <MessageSquare className="h-5 w-5" />,
      description: "How to communicate with practitioners and support",
      articles: [
        "Messaging a practitioner",
        "Video session troubleshooting",
        "Sharing documents securely",
        "Contacting customer support",
      ],
    },
    {
      title: "Account & Privacy",
      icon: <User className="h-5 w-5" />,
      description: "Managing your account settings and privacy preferences",
      articles: [
        "Updating account information",
        "Privacy settings explained",
        "Deleting your account",
        "Data export requests",
      ],
    },
    {
      title: "Security",
      icon: <Shield className="h-5 w-5" />,
      description: "Information about account security and data protection",
      articles: [
        "Two-factor authentication",
        "Secure payment processing",
        "How we protect your data",
        "Reporting suspicious activity",
      ],
    },
  ]

  const faqCategories = [
    {
      id: "general",
      label: "General",
      questions: [
        {
          question: "What is Estuary?",
          answer:
            "Estuary is a wellness marketplace that connects clients with qualified practitioners offering various services including coaching, therapy, meditation, and more. Our platform makes it easy to discover, book, and experience transformative wellness services.",
        },
        {
          question: "How do I create an account?",
          answer:
            "To create an account, click on the 'Sign Up' button in the top right corner of the homepage. You can sign up using your email address, or through Google or Facebook. Follow the prompts to complete your profile setup.",
        },
        {
          question: "Is Estuary available in my country?",
          answer:
            "Estuary is currently available in the United States, Canada, United Kingdom, Australia, and New Zealand. We're actively expanding to more countries and will announce new locations as they become available.",
        },
        {
          question: "What devices can I use to access Estuary?",
          answer:
            "Estuary is accessible via web browsers on desktop computers, laptops, tablets, and mobile phones. We also offer native mobile apps for iOS and Android devices for a more optimized experience.",
        },
      ],
    },
    {
      id: "bookings",
      label: "Bookings",
      questions: [
        {
          question: "How do I book a session with a practitioner?",
          answer:
            "To book a session, browse practitioners or services, select the one you're interested in, choose an available time slot from their calendar, and complete the booking process by providing the required information and payment details.",
        },
        {
          question: "Can I reschedule or cancel my booking?",
          answer:
            "Yes, you can reschedule or cancel bookings through your account dashboard. Go to 'My Bookings,' find the session you want to modify, and select 'Reschedule' or 'Cancel.' Please note that cancellation policies vary by practitioner and are displayed during the booking process.",
        },
        {
          question: "What happens if my practitioner cancels?",
          answer:
            "If a practitioner cancels a session, you'll be notified immediately via email and in-app notification. You'll have the option to reschedule with the same practitioner or receive a full refund. Our support team is also available to help you find an alternative practitioner if needed.",
        },
        {
          question: "How far in advance can I book a session?",
          answer:
            "Booking availability varies by practitioner. Most practitioners allow bookings up to 3 months in advance, but some may have different scheduling windows. You can see the available dates when viewing a practitioner's calendar.",
        },
      ],
    },
    {
      id: "payments",
      label: "Payments",
      questions: [
        {
          question: "What payment methods are accepted?",
          answer:
            "We accept major credit and debit cards (Visa, Mastercard, American Express, Discover), PayPal, and Apple Pay. Some practitioners may also accept HSA/FSA cards for eligible services.",
        },
        {
          question: "When am I charged for a booking?",
          answer:
            "You are charged at the time of booking to confirm your reservation. For package purchases or subscriptions, you'll be charged according to the specific terms outlined during checkout.",
        },
        {
          question: "What is your refund policy?",
          answer:
            "Refund policies vary by practitioner and service type. Generally, cancellations made 24+ hours before the scheduled session are eligible for a full refund. Cancellations with less notice may be subject to partial refunds or rescheduling options. The specific policy for each service is clearly displayed during the booking process.",
        },
        {
          question: "How do I get a receipt for my session?",
          answer:
            "Receipts are automatically emailed to you after each payment. You can also access all your receipts and invoices in your account dashboard under 'Payment History.' From there, you can download or print receipts as needed.",
        },
      ],
    },
    {
      id: "technical",
      label: "Technical",
      questions: [
        {
          question: "What should I do if I'm having trouble with video sessions?",
          answer:
            "For video session issues, first ensure you have a stable internet connection and are using a supported browser (Chrome, Firefox, Safari, or Edge). Allow camera and microphone permissions when prompted. If problems persist, try refreshing the page, restarting your browser, or using our mobile app. Our help section has detailed troubleshooting guides for specific issues.",
        },
        {
          question: "How do I reset my password?",
          answer:
            "To reset your password, click on 'Login,' then select 'Forgot Password.' Enter the email address associated with your account, and we'll send you a password reset link. Follow the instructions in the email to create a new password.",
        },
        {
          question: "Why am I not receiving emails from Estuary?",
          answer:
            "First, check your spam or junk folder. Add support@estuary.com to your contacts to prevent future emails from being filtered. Ensure your email address is correct in your account settings. If you've unsubscribed from our emails previously, you may need to update your communication preferences in your account settings.",
        },
        {
          question: "Is my data secure on Estuary?",
          answer:
            "Yes, we take data security very seriously. We use industry-standard encryption for all data transmission and storage. We comply with HIPAA regulations for health information and never share your personal data with third parties without your explicit consent. You can review our Privacy Policy for more details on how we protect your information.",
        },
      ],
    },
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
            <BreadcrumbLink href="/help">Help Center</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-12">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">How Can We Help You?</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Find answers to common questions and learn how to get the most out of Estuary.
          </p>
          <div className="max-w-2xl mx-auto relative">
            <Input placeholder="Search for answers..." className="pl-10 py-6 text-lg" />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Popular Topics</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularTopics.map((topic, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full text-primary">{topic.icon}</div>
                    <CardTitle>{topic.title}</CardTitle>
                  </div>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {topic.articles.map((article, i) => (
                      <li key={i}>
                        <Link href="#" className="text-sm text-primary hover:underline flex items-center">
                          <ArrowRight className="h-3 w-3 mr-2" />
                          {article}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="w-full" asChild>
                    <Link href="#">View all articles</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
          <Tabs defaultValue="general">
            <TabsList className="mb-6">
              {faqCategories.map((category) => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {faqCategories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="space-y-4">
                {category.questions.map((faq, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">{faq.question}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{faq.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </section>

        <section className="bg-[rgba(245,240,235,0.7)] p-8 rounded-xl text-center">
          <h2 className="text-2xl font-semibold mb-4">Still Need Help?</h2>
          <p className="mb-6 max-w-3xl mx-auto">
            Can't find what you're looking for? Our support team is here to help you with any questions or issues.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button>
              <MessageSquare className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
            <Button variant="outline">Submit a Request</Button>
          </div>
        </section>
      </div>
    </div>
  )
}
