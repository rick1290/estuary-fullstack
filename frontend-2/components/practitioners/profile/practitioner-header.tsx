import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, Star, User, Check, Heart, MessageCircle, Sparkles } from "lucide-react"
import type { Practitioner } from "@/types/practitioner"

interface PractitionerHeaderProps {
  practitioner: Practitioner
  onMessageClick?: () => void
}

export default function PractitionerHeader({ practitioner, onMessageClick }: PractitionerHeaderProps) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Avatar Section */}
        <div className="relative">
          <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-sage-100 to-terracotta-100 shadow-lg">
            {practitioner.profile_image_url ? (
              <img
                src={practitioner.profile_image_url}
                alt={practitioner.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl lg:text-5xl font-bold text-olive-800">
                  {practitioner.display_name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            )}
          </div>
          {practitioner.is_verified && (
            <div className="absolute -bottom-2 -right-2 bg-sage-600 text-white rounded-full p-2 shadow-lg">
              <Check className="h-5 w-5" strokeWidth="2" />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="flex-1 space-y-4">
          {/* Name and Title */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-olive-900">{practitioner.display_name}</h1>
              {practitioner.is_verified && (
                <Badge variant="sage" className="px-3 py-1">
                  <Sparkles className="h-3.5 w-3.5 mr-1" strokeWidth="1.5" />
                  Verified Expert
                </Badge>
              )}
            </div>
            <p className="text-xl text-olive-700 font-light">{practitioner.title}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-cream-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                <p className="text-2xl font-bold text-olive-900">{practitioner.completed_sessions}</p>
              </div>
              <p className="text-sm text-olive-600">Sessions</p>
            </div>

            <div className="bg-cream-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                <p className="text-2xl font-bold text-olive-900">{practitioner.years_of_experience}+</p>
              </div>
              <p className="text-sm text-olive-600">Years</p>
            </div>

            <div className="bg-cream-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-terracotta-500 fill-terracotta-500" strokeWidth="1.5" />
                <p className="text-2xl font-bold text-olive-900">{practitioner.average_rating_float}</p>
              </div>
              <p className="text-sm text-olive-600">{practitioner.total_reviews} reviews</p>
            </div>

            <div className="bg-cream-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                <p className="text-lg font-bold text-olive-900 leading-tight">
                  {practitioner.locations.find((loc) => loc.is_primary)?.city_name || "Multiple"}
                </p>
              </div>
              <p className="text-sm text-olive-600">Location</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button 
              variant="outline" 
              className="group"
              onClick={onMessageClick}
            >
              <MessageCircle className="h-4 w-4 mr-2 group-hover:text-sage-600 transition-colors" strokeWidth="1.5" />
              Send Message
            </Button>
            <Button variant="outline" className="group">
              <Heart className="h-4 w-4 mr-2 group-hover:text-rose-500 transition-colors" strokeWidth="1.5" />
              Save Practitioner
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
