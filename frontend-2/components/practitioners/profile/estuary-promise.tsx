import { Check, Calendar, Shield, HeartHandshake, LineChart } from "lucide-react"

export default function EstuaryPromise() {
  return (
    <div className="mt-16 mb-8 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-8 border border-teal-100">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-teal-800 mb-2">The Estuary Promise</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          We're committed to providing you with the highest quality care and experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <div className="flex flex-col items-center text-center p-4">
          <div className="bg-teal-100 p-3 rounded-full mb-4">
            <Check className="h-6 w-6 text-teal-700" />
          </div>
          <h3 className="font-medium text-teal-800 mb-2">Personalized Approach</h3>
          <p className="text-sm text-slate-600">
            Every session is tailored to your unique needs and goals, ensuring the most effective treatment plan for
            you.
          </p>
        </div>

        <div className="flex flex-col items-center text-center p-4">
          <div className="bg-teal-100 p-3 rounded-full mb-4">
            <Calendar className="h-6 w-6 text-teal-700" />
          </div>
          <h3 className="font-medium text-teal-800 mb-2">Flexible Scheduling</h3>
          <p className="text-sm text-slate-600">
            Easy online booking with various time slots to accommodate your busy schedule.
          </p>
        </div>

        <div className="flex flex-col items-center text-center p-4">
          <div className="bg-teal-100 p-3 rounded-full mb-4">
            <Shield className="h-6 w-6 text-teal-700" />
          </div>
          <h3 className="font-medium text-teal-800 mb-2">Safe Space</h3>
          <p className="text-sm text-slate-600">
            A comfortable and confidential environment where you can feel secure and supported.
          </p>
        </div>

        <div className="flex flex-col items-center text-center p-4">
          <div className="bg-teal-100 p-3 rounded-full mb-4">
            <LineChart className="h-6 w-6 text-teal-700" />
          </div>
          <h3 className="font-medium text-teal-800 mb-2">Continued Support</h3>
          <p className="text-sm text-slate-600">
            Regular check-ins and progress tracking to ensure you're meeting your wellness goals.
          </p>
        </div>
      </div>

      <div className="text-center mt-8">
        <div className="inline-flex items-center justify-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-teal-100">
          <HeartHandshake className="h-5 w-5 text-teal-600" />
          <span className="text-sm font-medium text-teal-800">Trusted by thousands of clients</span>
        </div>
      </div>
    </div>
  )
}
