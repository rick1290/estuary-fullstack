"use client";

import React from 'react';
import { PreJoin } from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PreJoin Component */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <PreJoin
                onSubmit={handlePreJoinSubmit}
                persistUserChoices={true}
                defaults={{
                  videoEnabled: true,
                  audioEnabled: true
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Session Info & Join */}
        <div className="space-y-6">
          {/* Session Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{sessionTitle}</CardTitle>
              {sessionTime && (
                <CardDescription>
                  Scheduled for {sessionTime.toLocaleDateString()} at {sessionTime.toLocaleTimeString()}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {sessionInfo?.practitioner && (
                <div className="text-sm text-gray-600">
                  <p>With {sessionInfo.practitioner.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Ready to join?</CardTitle>
              <CardDescription>
                Check your audio and video before joining
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Tips */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Before you join:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Test your camera and microphone</li>
                  <li>• Find a quiet, well-lit space</li>
                  <li>• Close other video apps</li>
                  <li>• Use headphones for better audio</li>
                </ul>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-sage-600" />
                  <span className="ml-2 text-sm text-gray-600">Joining...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}