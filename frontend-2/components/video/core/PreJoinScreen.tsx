"use client";

import React from 'react';
import { PreJoin } from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, AlertCircle, Video, Mic, Headphones, Calendar, Clock } from 'lucide-react';
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
  loading?: boolean;
  error?: string;
}

export function PreJoinScreen({
  bookingDetails,
  sessionDetails,
  onJoinRoom,
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
  const sessionTitle = sessionInfo?.service?.name || sessionInfo?.title || 'Video Session';
  const sessionTime = sessionInfo?.start_time ? new Date(sessionInfo.start_time) : null;
  const practitioner = sessionInfo?.practitioner;
  const serviceType = sessionInfo?.service?.service_type || 'session';

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
                  <div className="lk-prejoin-container" style={{ 
                    '--lk-bg': 'var(--cream-50)',
                    '--lk-control-bg': 'var(--sage-100)',
                    '--lk-control-hover-bg': 'var(--sage-200)',
                    '--lk-button-bg': 'var(--sage-600)',
                    '--lk-button-hover-bg': 'var(--sage-700)',
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
            <Card className="border-sage-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-cream-100 to-sage-100 rounded-t-lg">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg text-estuary-900">{sessionTitle}</CardTitle>
                  {getServiceTypeBadge()}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {sessionTime && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Calendar className="h-4 w-4 text-sage-600" />
                    <span>{format(sessionTime, 'EEEE, MMMM d')}</span>
                  </div>
                )}
                {sessionTime && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Clock className="h-4 w-4 text-sage-600" />
                    <span>{format(sessionTime, 'h:mm a')}</span>
                  </div>
                )}
                
                {practitioner && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-2">Your practitioner</p>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={practitioner.profile_photo} alt={practitioner.name} />
                        <AvatarFallback className="bg-sage-100 text-sage-700">
                          {practitioner.name?.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-estuary-900">{practitioner.name}</p>
                        {practitioner.specialization && (
                          <p className="text-xs text-gray-500">{practitioner.specialization}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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