import Link from "next/link"
import {
  ArrowLeft,
  Video,
  MonitorSmartphone,
  Globe,
  Camera,
  Wifi,
  Settings2,
  PlayCircle,
  MapPin,
} from "lucide-react"

export const metadata = {
  title: "Video Sessions | Estuary Help",
  description: "How to join video sessions, troubleshoot camera and mic issues, and get the most from virtual appointments.",
}

export default function VideoPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/help"
          className="inline-flex items-center gap-2 text-sm text-olive-500 hover:text-sage-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Help Center
        </Link>

        <h1 className="font-serif text-3xl font-normal text-olive-900 mb-2">
          Video Sessions
        </h1>
        <p className="text-olive-500 mb-10">
          Everything you need to join video sessions smoothly and troubleshoot common issues.
        </p>

        <div className="space-y-10">
          {/* Joining */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Video className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Joining a video session</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <div className="space-y-3">
                {[
                  { step: "1", text: "Go to your session detail page in My Journeys. The \"Join Session\" button appears 15 minutes before the scheduled start time." },
                  { step: "2", text: "Click the button to enter the pre-join lobby where you can test your camera and microphone." },
                  { step: "3", text: "When you are ready, click \"Enter Room\" to join the live video session with your practitioner." },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-sage-100 text-sage-700 font-medium text-xs">
                      {item.step}
                    </div>
                    <p className="text-[15px] text-olive-600 leading-relaxed pt-0.5">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pre-join lobby */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MonitorSmartphone className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Pre-join lobby</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Before entering the session room, you land in a lobby where you can preview your video and audio. This is a good time to make sure your camera is working, your microphone picks up your voice, and your background looks the way you want. You can toggle your camera and mic on or off before entering the room.
              </p>
            </div>
          </section>

          {/* Browser support */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Browser support</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                Estuary video sessions work directly in your browser with no downloads required. Supported browsers include:
              </p>
              <ul className="space-y-2">
                {[
                  "Google Chrome (latest version)",
                  "Mozilla Firefox (latest version)",
                  "Apple Safari (latest version)",
                  "Microsoft Edge (latest version)",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-olive-500 mt-3">
                For the best experience, make sure your browser is up to date.
              </p>
            </div>
          </section>

          {/* Camera/mic issues */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Camera and microphone issues</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                If your camera or microphone is not working, try these steps:
              </p>
              <ul className="space-y-2">
                {[
                  "Check that your browser has permission to access your camera and microphone. Look for the camera icon in your browser's address bar.",
                  "Make sure no other application (Zoom, FaceTime, etc.) is currently using your camera.",
                  "Try refreshing the page and re-entering the lobby.",
                  "If using an external webcam or microphone, ensure it is properly connected.",
                  "On Safari, you may need to go to Safari preferences and explicitly allow camera and mic access for the Estuary site.",
                  "As a last resort, try switching to a different supported browser.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Connection issues */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Wifi className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Connection issues</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                A stable internet connection is important for a smooth video session. We recommend a minimum of 5 Mbps download and upload speed. If you experience lag, freezing, or disconnections:
              </p>
              <ul className="space-y-2">
                {[
                  "Move closer to your Wi-Fi router or switch to a wired connection.",
                  "Close other tabs and applications that may be using bandwidth.",
                  "Turn off your camera temporarily to reduce bandwidth usage.",
                  "Try refreshing the page to re-establish the connection.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* During the session */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">During the session</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <ul className="space-y-2">
                {[
                  "Mute and unmute your microphone at any time using the mic button.",
                  "Turn your camera on or off using the camera button.",
                  "Share your screen if the feature is enabled by your practitioner.",
                  "The session ends when the practitioner closes the room or the scheduled time expires.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Recordings */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Recordings</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                If your practitioner enables recording for the session, the recording will be available on your journey detail page after the session ends. Not all sessions are recorded — this is at the practitioner&apos;s discretion and requires your consent. Recordings are private and only accessible to you and your practitioner.
              </p>
            </div>
          </section>

          {/* In-person */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">In-person sessions</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                For in-person sessions, no video setup is needed. Your booking detail page shows the practitioner&apos;s address and directions to the venue. Arrive a few minutes early to settle in. If you have trouble finding the location, you can message your practitioner through the platform.
              </p>
            </div>
          </section>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-sage-200/60">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Link
              href="/help/sessions"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Your Sessions
            </Link>
            <Link
              href="/help/messaging"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Messaging
            </Link>
          </div>
          <div className="text-center">
            <p className="text-sm text-olive-500">Still need help?</p>
            <a
              href="mailto:support@estuary.com"
              className="text-sm text-sage-600 hover:text-sage-700"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
