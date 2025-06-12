import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight, Mail, MapPin, Phone, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-50/30 to-white">
      <div className="container max-w-5xl py-16">
        <Breadcrumb className="mb-12">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="text-gray-600 hover:text-gray-900">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href="/contact" className="text-gray-900 font-medium">Contact</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-16">
          <section className="text-center">
            <h1 className="text-5xl md:text-6xl font-medium tracking-tight mb-6">Contact Us</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              We're here to help with any questions, feedback, or support you might need.
            </p>
          </section>

          <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send Us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input id="first-name" placeholder="Enter your first name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input id="last-name" placeholder="Enter your last name" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="Enter your email address" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inquiry-type">Inquiry Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an inquiry type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Question</SelectItem>
                        <SelectItem value="support">Technical Support</SelectItem>
                        <SelectItem value="billing">Billing Inquiry</SelectItem>
                        <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" placeholder="Enter your message" rows={5} />
                  </div>

                  <div className="space-y-2">
                    <Label>Are you a practitioner or client?</Label>
                    <RadioGroup defaultValue="client" className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="client" id="client" />
                        <Label htmlFor="client">Client</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="practitioner" id="practitioner" />
                        <Label htmlFor="practitioner">Practitioner</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="neither" id="neither" />
                        <Label htmlFor="neither">Neither</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button type="submit" className="w-full">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">
                      123 Wellness Way
                      <br />
                      New York, NY 10001
                      <br />
                      United States
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a href="mailto:support@estuary.com" className="text-sm text-primary hover:underline">
                      support@estuary.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <a href="tel:+18005551234" className="text-sm text-primary hover:underline">
                      (800) 555-1234
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Support Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span>9:00 AM - 8:00 PM ET</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span>10:00 AM - 6:00 PM ET</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span>Closed</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Need immediate assistance? Chat with our support team during business hours.
                </p>
                <Button className="w-full" variant="outline">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Start Live Chat
                </Button>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
