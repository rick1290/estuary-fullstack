"use client";

import React from 'react';
import { PreJoin } from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, AlertCircle, Video, Mic, Headphones, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';

interface JoinSettings {
  videoEnabled: boolean;
  audioEnabled: boolean;
  cameraDeviceId: string;
  microphoneDeviceId: string;
}

interface PreJoinScreenProps {
  bookingDetails?: any;
  sessionDetails?: any;
  onJoinRoom: (settings: JoinSettings) => void;
  onExit?: () => void;
  loading?: boolean;
  error?: string;
}

export function PreJoinScreen({
  bookingDetails,
  sessionDetails,
  onJoinRoom,
  onExit,
  loading = false,
  error
}: PreJoinScreenProps) {
  const { user } = useAuth();

  // Get the user's display name
  const userName = user?.display_name || user?.full_name || user?.firstName || 'Guest';

  const handlePreJoinSubmit = (userChoices: any) => {
    const settings: JoinSettings = {
      videoEnabled: userChoices.videoEnabled ?? true,
      audioEnabled: userChoices.audioEnabled ?? true,
      cameraDeviceId: userChoices.videoDeviceId || '',
      microphoneDeviceId: userChoices.audioDeviceId || ''
    };
    onJoinRoom(settings);
  };

  // Get session info
  const sessionInfo = bookingDetails || sessionDetails;
  // Prefer session title (for workshops/courses), then service name, then fallback
  const sessionTitle = sessionInfo?.title || sessionInfo?.service?.name || 'Video Session';
  const serviceName = sessionInfo?.service?.name;
  const sessionTime = sessionInfo?.start_time ? new Date(sessionInfo.start_time) : null;
  const practitioner = sessionInfo?.practitioner;
  const serviceType = sessionInfo?.session_type || sessionInfo?.service?.service_type || 'session';
  const serviceImage = sessionInfo?.service?.image_url;
  const durationMinutes = sessionInfo?.service?.duration_minutes;

  const getServiceTypeBadge = () => {
    switch (serviceType) {
      case 'workshop':
        return <Badge variant="secondary" className="bg-terracotta-100 text-terracotta-700">Workshop</Badge>;
      case 'course':
        return <Badge variant="secondary" className="bg-olive-100 text-olive-700">Course</Badge>;
      default:
        return <Badge variant="secondary" className="bg-sage-100 text-sage-700">1-on-1 Session</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-sage-50/30 to-cream-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-olive-900 mb-2">Ready to Join?</h1>
          <p className="text-olive-600">Check your camera and audio, then join when you're ready</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PreJoin Component - Main Area */}
          <div className="lg:col-span-2">
            <Card className="border-sage-200 shadow-xl overflow-hidden bg-white">
              <CardContent className="p-0">
                {/* User Welcome Banner */}
                <div className="bg-gradient-to-r from-sage-600 to-sage-500 p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm">Joining as</p>
                      <h2 className="text-white text-lg font-semibold">{userName}</h2>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <style jsx global>{`
                    /* Overall prejoin container */
                    .lk-prejoin {
                      gap: 1rem !important;
                    }

                    /* Video preview container */
                    .lk-prejoin .lk-camera-container,
                    .lk-prejoin [data-lk-theme] video,
                    .lk-prejoin video {
                      border-radius: 16px !important;
                      overflow: hidden !important;
                      background: #1a1a1a !important;
                      aspect-ratio: 16/9 !important;
                      max-height: 320px !important;
                    }

                    /* Controls container below video */
                    .lk-prejoin .lk-control-bar,
                    .lk-prejoin > div:has(.lk-button-group) {
                      background: transparent !important;
                      padding: 0 !important;
                      margin-top: 1rem !important;
                    }

                    /* Device toggle buttons container */
                    .lk-prejoin .lk-button-group {
                      display: flex !important;
                      gap: 8px !important;
                      justify-content: center !important;
                      flex-wrap: wrap !important;
                    }

                    /* Media device toggle buttons (camera/mic) */
                    .lk-prejoin .lk-button-group button[data-lk-source],
                    .lk-prejoin .lk-button-group .lk-device-button {
                      background-color: #fafbf9 !important;
                      border: 1.5px solid #e5ebe2 !important;
                      border-radius: 10px !important;
                      padding: 10px 14px !important;
                      transition: all 0.15s ease !important;
                      font-size: 13px !important;
                      font-weight: 500 !important;
                      color: #5a6855 !important;
                      display: inline-flex !important;
                      align-items: center !important;
                      gap: 6px !important;
                      min-width: auto !important;
                      height: auto !important;
                      width: auto !important;
                      max-width: none !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                    }
                    .lk-prejoin .lk-button-group button[data-lk-source]:hover,
                    .lk-prejoin .lk-button-group .lk-device-button:hover {
                      background-color: #f5f7f4 !important;
                      border-color: #9CAF88 !important;
                    }

                    /* Enabled state (green) for device buttons */
                    .lk-prejoin .lk-button-group button[data-lk-enabled="true"],
                    .lk-prejoin .lk-button-group button[data-lk-source][data-lk-enabled="true"] {
                      background-color: #f0f7ed !important;
                      border-color: #9CAF88 !important;
                      color: #5a7a4a !important;
                    }

                    /* Disabled/muted state (red) for device buttons */
                    .lk-prejoin .lk-button-group button[data-lk-enabled="false"],
                    .lk-prejoin .lk-button-group button[data-lk-source][data-lk-enabled="false"] {
                      background-color: #fef7f7 !important;
                      border-color: #f5c6c6 !important;
                      color: #b85c5c !important;
                    }

                    /* Icons inside device buttons */
                    .lk-prejoin .lk-button-group button[data-lk-source] svg {
                      width: 16px !important;
                      height: 16px !important;
                    }

                    /* Device select dropdowns */
                    .lk-prejoin select,
                    .lk-prejoin .lk-device-menu,
                    .lk-prejoin .lk-media-device-select select {
                      background-color: #fafbf9 !important;
                      border: 1.5px solid #e5ebe2 !important;
                      border-radius: 8px !important;
                      padding: 8px 12px !important;
                      font-size: 13px !important;
                      color: #4a5548 !important;
                      cursor: pointer !important;
                      min-width: 140px !important;
                      appearance: none !important;
                      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a6855' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
                      background-repeat: no-repeat !important;
                      background-position: right 10px center !important;
                      padding-right: 32px !important;
                    }
                    .lk-prejoin select:hover {
                      border-color: #c5d4be !important;
                    }
                    .lk-prejoin select:focus {
                      border-color: #9CAF88 !important;
                      outline: none !important;
                      box-shadow: 0 0 0 3px rgba(156, 175, 136, 0.15) !important;
                    }

                    /* Hide the username input since we show it above - be specific */
                    .lk-prejoin input[type="text"],
                    .lk-prejoin .lk-form-control input {
                      display: none !important;
                    }

                    /* But don't hide any parent containers that might contain the button */
                    .lk-prejoin .lk-form-control {
                      display: block !important;
                    }

                    /* Join button - target it very specifically */
                    .lk-prejoin button[type="submit"],
                    .lk-prejoin .lk-join-button,
                    .lk-prejoin-container button[type="submit"] {
                      padding: 14px 40px !important;
                      font-size: 15px !important;
                      font-weight: 600 !important;
                      background: linear-gradient(135deg, #9CAF88 0%, #8a9d7b 100%) !important;
                      color: white !important;
                      border-radius: 12px !important;
                      transition: all 0.2s ease !important;
                      box-shadow: 0 4px 14px rgba(156, 175, 136, 0.35) !important;
                      border: none !important;
                      width: 100% !important;
                      max-width: 280px !important;
                      margin: 20px auto 0 !important;
                      display: block !important;
                      letter-spacing: 0.3px !important;
                      visibility: visible !important;
                      opacity: 1 !important;
                    }
                    .lk-prejoin button[type="submit"]:hover,
                    .lk-prejoin .lk-join-button:hover,
                    .lk-prejoin-container button[type="submit"]:hover {
                      background: linear-gradient(135deg, #8a9d7b 0%, #7d9070 100%) !important;
                      transform: translateY(-1px) !important;
                      box-shadow: 0 6px 20px rgba(156, 175, 136, 0.45) !important;
                    }
                    .lk-prejoin button[type="submit"]:active,
                    .lk-prejoin .lk-join-button:active {
                      transform: translateY(0) !important;
                    }
                    .lk-prejoin button[type="submit"]:disabled,
                    .lk-prejoin .lk-join-button:disabled {
                      opacity: 0.6 !important;
                      cursor: not-allowed !important;
                      transform: none !important;
                    }

                    /* Labels for controls */
                    .lk-prejoin label {
                      font-size: 12px !important;
                      font-weight: 500 !important;
                      color: #6b7a65 !important;
                      text-transform: uppercase !important;
                      letter-spacing: 0.5px !important;
                      margin-bottom: 6px !important;
                    }

                    /* Audio level indicator */
                    .lk-prejoin .lk-audio-bar {
                      height: 3px !important;
                      border-radius: 2px !important;
                      background-color: #e5ebe2 !important;
                    }
                    .lk-prejoin .lk-audio-bar > div {
                      background-color: #9CAF88 !important;
                      border-radius: 2px !important;
                    }
                  `}</style>
                  <div className="lk-prejoin-container">
                    <PreJoin
                      onSubmit={handlePreJoinSubmit}
                      persistUserChoices={true}
                      defaults={{
                        videoEnabled: true,
                        audioEnabled: true,
                        username: userName
                      }}
                      userLabel=""
                      joinLabel={loading ? "Joining..." : "Join Session"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Session Info & Tips - Sidebar */}
          <div className="space-y-6">
            {/* Session Details Card */}
            <Card className="border-sage-200 shadow-xl overflow-hidden bg-white">
              {/* Service Image Header */}
              {serviceImage && (
                <div className="relative h-36 w-full">
                  <img
                    src={serviceImage}
                    alt={serviceName || sessionTitle}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    {getServiceTypeBadge()}
                  </div>
                </div>
              )}

              <CardHeader className={serviceImage ? "pt-4 pb-2" : "bg-gradient-to-r from-sage-50 to-olive-50 pb-2"}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg text-olive-900 leading-tight">{sessionTitle}</CardTitle>
                    {/* Show service name if different from session title */}
                    {serviceName && serviceName !== sessionTitle && (
                      <p className="text-sm text-olive-600 mt-1">{serviceName}</p>
                    )}
                  </div>
                  {!serviceImage && getServiceTypeBadge()}
                </div>
              </CardHeader>

              <CardContent className="pt-3">
                {/* Practitioner - Show prominently at top */}
                {practitioner && (
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-sage-100">
                    <Avatar className="h-12 w-12 ring-2 ring-sage-200 ring-offset-2">
                      <AvatarImage src={practitioner.profile_photo} alt={practitioner.name} />
                      <AvatarFallback className="bg-sage-100 text-sage-700 text-lg font-semibold">
                        {practitioner.name?.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-olive-900">{practitioner.name}</p>
                      {practitioner.specialization && (
                        <p className="text-xs text-olive-600 line-clamp-2">{practitioner.specialization}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Date/Time Info */}
                <div className="space-y-3">
                  {sessionTime && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sage-100">
                        <Calendar className="h-4 w-4 text-sage-700" />
                      </div>
                      <div>
                        <p className="font-medium text-olive-900">{format(sessionTime, 'EEEE, MMMM d')}</p>
                        <p className="text-olive-600">{format(sessionTime, 'h:mm a')}</p>
                      </div>
                    </div>
                  )}

                  {durationMinutes && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sage-100">
                        <Clock className="h-4 w-4 text-sage-700" />
                      </div>
                      <div>
                        <p className="font-medium text-olive-900">{durationMinutes} minutes</p>
                        <p className="text-olive-600">Session duration</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pre-Join Tips */}
            <Card className="border-sage-200 shadow-xl bg-white">
              <CardHeader className="bg-gradient-to-r from-olive-50 to-sage-50 pb-3">
                <CardTitle className="text-base text-olive-900">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Error Display */}
                {error && (
                  <Alert variant="destructive" className="mb-4 border-terracotta-200 bg-terracotta-50">
                    <AlertCircle className="h-4 w-4 text-terracotta-600" />
                    <AlertDescription className="text-terracotta-800">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-sage-100 p-2.5 mt-0.5">
                      <Video className="h-4 w-4 text-sage-700" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-olive-900">Camera</p>
                      <p className="text-xs text-olive-600">Good lighting helps you look your best</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-sage-100 p-2.5 mt-0.5">
                      <Mic className="h-4 w-4 text-sage-700" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-olive-900">Microphone</p>
                      <p className="text-xs text-olive-600">Find a quiet space for clear audio</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-sage-100 p-2.5 mt-0.5">
                      <Headphones className="h-4 w-4 text-sage-700" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-olive-900">Headphones</p>
                      <p className="text-xs text-olive-600">Recommended to prevent echo</p>
                    </div>
                  </div>
                </div>

                {loading && (
                  <div className="flex items-center justify-center py-4 mt-4 border-t border-sage-100">
                    <Loader2 className="h-5 w-5 animate-spin text-sage-600" />
                    <span className="ml-2 text-sm text-olive-600">Preparing your session...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}