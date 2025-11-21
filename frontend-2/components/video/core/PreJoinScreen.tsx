"use client";

import React from 'react';
import { PreJoin } from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, AlertCircle, Video, Mic, Headphones, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

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
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-sage-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-estuary-900 mb-2">Join Your Session</h1>
          <p className="text-gray-600">Test your devices and join when ready</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PreJoin Component - Main Area */}
          <div className="lg:col-span-2">
            <Card className="border-sage-200 shadow-lg overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-sage-500 to-wellness-600 p-6">
                  <h2 className="text-white text-xl font-semibold mb-2">Setup Your Camera & Audio</h2>
                  <p className="text-sage-100">Make sure you can be seen and heard clearly</p>
                </div>
                
                <div className="p-6 bg-white">
                  <style jsx global>{`
                    .lk-prejoin .lk-button {
                      padding: 10px 24px !important;
                      font-size: 15px !important;
                      font-weight: 500 !important;
                      background-color: #9CAF88 !important;
                      color: white !important;
                      border-radius: 6px !important;
                      transition: background-color 0.2s !important;
                      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
                    }
                    .lk-prejoin .lk-button:hover {
                      background-color: #8A9D7B !important;
                    }
                    .lk-prejoin .lk-button:disabled {
                      opacity: 0.5 !important;
                      cursor: not-allowed !important;
                    }
                  `}</style>
                  <div className="lk-prejoin-container" style={{ 
                    '--lk-bg': 'var(--cream-50)',
                    '--lk-control-bg': 'var(--sage-100)',
                    '--lk-control-hover-bg': 'var(--sage-200)',
                    '--lk-button-bg': '#9CAF88',
                    '--lk-button-hover-bg': '#7D9070',
                    '--lk-button-fg': 'white',
                    '--lk-button-size': '48px',
                    '--lk-button-font-weight': '600',
                    '--lk-button-font-size': '16px',
                  } as React.CSSProperties}>
                    <PreJoin
                      onSubmit={handlePreJoinSubmit}
                      persistUserChoices={true}
                      defaults={{
                        videoEnabled: true,
                        audioEnabled: true
                      }}
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
            <Card className="border-sage-200 shadow-lg overflow-hidden">
              {/* Service Image Header */}
              {serviceImage && (
                <div className="relative h-32 w-full">
                  <img
                    src={serviceImage}
                    alt={serviceName || sessionTitle}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    {getServiceTypeBadge()}
                  </div>
                </div>
              )}

              <CardHeader className={serviceImage ? "pt-4" : "bg-gradient-to-r from-cream-100 to-sage-100 rounded-t-lg"}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg text-estuary-900 leading-tight">{sessionTitle}</CardTitle>
                    {/* Show service name if different from session title */}
                    {serviceName && serviceName !== sessionTitle && (
                      <p className="text-sm text-gray-500 mt-1">{serviceName}</p>
                    )}
                  </div>
                  {!serviceImage && getServiceTypeBadge()}
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {/* Practitioner - Show prominently at top */}
                {practitioner && (
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                    <Avatar className="h-12 w-12 ring-2 ring-sage-100">
                      <AvatarImage src={practitioner.profile_photo} alt={practitioner.name} />
                      <AvatarFallback className="bg-sage-100 text-sage-700 text-lg">
                        {practitioner.name?.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-estuary-900">{practitioner.name}</p>
                      {practitioner.specialization && (
                        <p className="text-xs text-gray-500 line-clamp-2">{practitioner.specialization}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Date/Time Info */}
                <div className="space-y-2">
                  {sessionTime && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sage-50">
                        <Calendar className="h-4 w-4 text-sage-600" />
                      </div>
                      <div>
                        <p className="font-medium text-estuary-900">{format(sessionTime, 'EEEE, MMMM d')}</p>
                        <p className="text-gray-500">{format(sessionTime, 'h:mm a')}</p>
                      </div>
                    </div>
                  )}

                  {durationMinutes && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sage-50">
                        <Clock className="h-4 w-4 text-sage-600" />
                      </div>
                      <div>
                        <p className="font-medium text-estuary-900">{durationMinutes} minutes</p>
                        <p className="text-gray-500">Session duration</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pre-Join Tips */}
            <Card className="border-sage-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-wellness-50 to-sage-50 rounded-t-lg">
                <CardTitle className="text-base text-estuary-900">Quick Setup Tips</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Error Display */}
                {error && (
                  <Alert variant="destructive" className="mb-4 border-terracotta-200 bg-terracotta-50">
                    <AlertCircle className="h-4 w-4 text-terracotta-600" />
                    <AlertDescription className="text-terracotta-800">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-sage-100 p-2 mt-0.5">
                      <Video className="h-4 w-4 text-sage-700" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-estuary-900">Camera Check</p>
                      <p className="text-xs text-gray-600">Position yourself in frame with good lighting</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-sage-100 p-2 mt-0.5">
                      <Mic className="h-4 w-4 text-sage-700" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-estuary-900">Audio Test</p>
                      <p className="text-xs text-gray-600">Speak to see your mic level indicator</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-sage-100 p-2 mt-0.5">
                      <Headphones className="h-4 w-4 text-sage-700" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-estuary-900">Best Experience</p>
                      <p className="text-xs text-gray-600">Use headphones to prevent echo</p>
                    </div>
                  </div>
                </div>

                {loading && (
                  <div className="flex items-center justify-center py-4 mt-4 border-t">
                    <Loader2 className="h-5 w-5 animate-spin text-sage-600" />
                    <span className="ml-2 text-sm text-gray-600">Preparing your session...</span>
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