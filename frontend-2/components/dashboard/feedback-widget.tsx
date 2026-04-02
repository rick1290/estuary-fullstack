"use client"

import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { featureRequestsCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  MessageCircle,
  X,
  Bug,
  Lightbulb,
  HelpCircle,
  ChevronLeft,
  Send,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

type FeedbackType = null | "bug" | "feature" | "help"

const CATEGORIES = [
  { value: "scheduling", label: "Scheduling" },
  { value: "payments", label: "Payments & Billing" },
  { value: "analytics", label: "Analytics" },
  { value: "client_management", label: "Client Management" },
  { value: "messaging", label: "Messaging" },
  { value: "ui_ux", label: "UI / UX" },
  { value: "mobile", label: "Mobile" },
  { value: "integrations", label: "Integrations" },
  { value: "other", label: "Other" },
]

export default function FeedbackWidget() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null)
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("other")
  const [priority, setPriority] = useState("medium")

  // Determine if user is a practitioner
  const isPractitioner = user?.hasPractitionerAccount && pathname?.startsWith("/dashboard/practitioner")

  // Move feedback button up on pages where it overlaps with fixed bottom navigation (e.g. service creation wizard)
  const isServiceCreation = pathname?.includes("/service-creation") || pathname?.includes("/services/create")

  // Feedback mutation — works for both practitioners and regular users
  const createMutation = useMutation({
    ...featureRequestsCreateMutation(),
    onSuccess: () => {
      setSubmitted(true)
      setTimeout(() => {
        resetForm()
        setIsOpen(false)
        setSubmitted(false)
      }, 2500)
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit. Please try again.")
    },
  })

  const resetForm = () => {
    setFeedbackType(null)
    setTitle("")
    setDescription("")
    setCategory("other")
    setPriority("medium")
  }

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(resetForm, 300) // reset after animation
  }

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in both title and description")
      return
    }

    createMutation.mutate({
      body: {
        title: feedbackType === "bug" ? `[Bug] ${title}` : title,
        description: `${description}\n\n---\nPage: ${pathname}\nType: ${feedbackType}`,
        category: category as any,
        priority: priority as any,
        feedback_type: feedbackType === "bug" ? "bug" : "feature",
      } as any,
    })
  }

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) handleClose()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen])

  return (
    <>
      {/* Floating Button — compact circle, doesn't block content */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-40 flex items-center justify-center rounded-full shadow-md transition-all duration-200 group right-4",
          "bg-olive-700/80 text-white hover:bg-olive-800 hover:shadow-lg backdrop-blur-sm",
          "h-10 w-10 hover:w-auto hover:px-3.5 hover:gap-2",
          isServiceCreation ? "bottom-20" : "bottom-4",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium hidden group-hover:inline whitespace-nowrap">Feedback</span>
      </button>

      {/* Widget Panel */}
      <div
        className={cn(
          "fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] transition-all duration-200 origin-bottom-right",
          isOpen
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-2 pointer-events-none"
        )}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-sage-200/60 overflow-hidden flex flex-col max-h-[min(580px,calc(100vh-6rem))]">
          {/* Header */}
          <div className="bg-gradient-to-r from-olive-800 to-olive-700 px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {feedbackType && !submitted && (
                <button
                  onClick={() => setFeedbackType(null)}
                  className="text-white/70 hover:text-white transition-colors -ml-1"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h3 className="text-white font-medium text-[15px]">
                  {submitted
                    ? "Thank You!"
                    : feedbackType === "bug"
                      ? "Report a Bug"
                      : feedbackType === "feature"
                        ? "Feature Request"
                        : feedbackType === "help"
                          ? "Get Help"
                          : "How can we help?"}
                </h3>
                {!feedbackType && !submitted && (
                  <p className="text-white/60 text-xs mt-0.5">We read every piece of feedback</p>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {submitted ? (
              /* ── Success State ── */
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-7 w-7 text-sage-600" />
                </div>
                <p className="text-olive-900 font-medium text-[15px]">
                  {feedbackType === "bug" ? "Bug report received!" : "Feedback submitted!"}
                </p>
                <p className="text-olive-500 text-sm mt-1">
                  We'll review this and get back to you.
                </p>
              </div>
            ) : !feedbackType ? (
              /* ── Type Selection ── */
              <div className="p-4 space-y-2">
                <button
                  onClick={() => setFeedbackType("bug")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-sage-200/60 hover:border-terracotta-300 hover:bg-terracotta-50/30 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-terracotta-100 flex items-center justify-center shrink-0 group-hover:bg-terracotta-200 transition-colors">
                    <Bug className="h-5 w-5 text-terracotta-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-olive-900">Report a Bug</p>
                    <p className="text-xs text-olive-500 mt-0.5">Something isn't working right</p>
                  </div>
                </button>

                <button
                  onClick={() => setFeedbackType("feature")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-sage-200/60 hover:border-sage-300 hover:bg-sage-50/30 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center shrink-0 group-hover:bg-sage-200 transition-colors">
                    <Lightbulb className="h-5 w-5 text-sage-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-olive-900">Feature Request</p>
                    <p className="text-xs text-olive-500 mt-0.5">I wish I could...</p>
                  </div>
                </button>

                <button
                  onClick={() => setFeedbackType("help")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-sage-200/60 hover:border-olive-300 hover:bg-olive-50/30 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-olive-100 flex items-center justify-center shrink-0 group-hover:bg-olive-200 transition-colors">
                    <HelpCircle className="h-5 w-5 text-olive-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-olive-900">Get Help</p>
                    <p className="text-xs text-olive-500 mt-0.5">I'm stuck or have a question</p>
                  </div>
                </button>
              </div>
            ) : feedbackType === "help" ? (
              /* ── Help Panel ── */
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <Link
                    href={isPractitioner ? "/help/practitioners" : "/help"}
                    onClick={handleClose}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-sage-200/60 hover:border-sage-300 hover:bg-sage-50/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-5 w-5 text-sage-600" />
                      <div>
                        <p className="font-medium text-sm text-olive-900">Help Center</p>
                        <p className="text-xs text-olive-500">Browse guides and FAQs</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-olive-500" />
                  </Link>

                  <Link
                    href={isPractitioner ? "/help/practitioners/getting-started" : "/help/getting-started"}
                    onClick={handleClose}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-sage-200/60 hover:border-sage-300 hover:bg-sage-50/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Lightbulb className="h-5 w-5 text-sage-600" />
                      <div>
                        <p className="font-medium text-sm text-olive-900">Getting Started</p>
                        <p className="text-xs text-olive-500">Step-by-step setup guide</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-olive-500" />
                  </Link>

                  <a
                    href="mailto:support@estuarywellness.com"
                    className="flex items-center justify-between p-3.5 rounded-xl border border-sage-200/60 hover:border-sage-300 hover:bg-sage-50/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Send className="h-5 w-5 text-sage-600" />
                      <div>
                        <p className="font-medium text-sm text-olive-900">Email Support</p>
                        <p className="text-xs text-olive-500">support@estuarywellness.com</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-olive-500" />
                  </a>
                </div>

                <div className="pt-2 border-t border-sage-100">
                  <p className="text-xs text-olive-500 text-center">
                    Can't find what you need?{" "}
                    <button
                      onClick={() => setFeedbackType("bug")}
                      className="text-olive-600 hover:text-olive-800 underline"
                    >
                      Report an issue
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              /* ── Bug / Feature Form ── */
              <div className="p-5 space-y-4">
                <div>
                  <Label className="text-xs font-medium text-olive-600">
                    {feedbackType === "bug" ? "What happened?" : "What would you like?"}
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      feedbackType === "bug"
                        ? "e.g. Can't save availability changes"
                        : "e.g. Add calendar sync with Google"
                    }
                    className="mt-1.5"
                    maxLength={255}
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-olive-600">Details</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      feedbackType === "bug"
                        ? "What were you trying to do? What happened instead?"
                        : "Describe the feature and how it would help you..."
                    }
                    rows={3}
                    className="mt-1.5 resize-none"
                  />
                </div>

                {isPractitioner && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-olive-600">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="mt-1.5 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-olive-600">Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger className="mt-1.5 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Auto-captured context */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sage-50/50 border border-sage-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" />
                  <p className="text-[11px] text-olive-500 truncate">
                    Page: {pathname}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer — Submit */}
          {feedbackType && feedbackType !== "help" && !submitted && (
            <div className="px-5 py-4 border-t border-sage-100 bg-cream-50/50 shrink-0">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || !title.trim() || !description.trim()}
                className="w-full bg-olive-800 hover:bg-olive-900 text-white rounded-xl h-10"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {feedbackType === "bug" ? "Submit Bug Report" : "Submit Request"}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={handleClose}
        />
      )}
    </>
  )
}
