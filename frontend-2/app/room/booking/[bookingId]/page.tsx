"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { bookingsRetrieveOptions, roomsStartRecordingCreateMutation, roomsStopRecordingCreateMutation } from '@/src/client/@tanstack/react-query.gen';
import { VideoRoom } from '@/components/video/core/VideoRoom';
import { useRoomToken, useRoomPermissions } from '@/components/video/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

export default function BookingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  
  const [isRecording, setIsRecording] = useState(false);
  
  const { permissions, loading: permissionsLoading } = useRoomPermissions({ bookingId });
  const { token, loading: tokenLoading, error: tokenError, roomInfo } = useRoomToken({ bookingId });

  // Fetch booking details using React Query
  const { data: bookingDetails } = useQuery({
    ...bookingsRetrieveOptions({ path: { id: parseInt(bookingId) } }),
    enabled: !!bookingId
  });

  // Recording mutations
  const startRecordingMutation = useMutation(roomsStartRecordingCreateMutation());
  const stopRecordingMutation = useMutation(roomsStopRecordingCreateMutation());

  const handleLeaveRoom = () => {
    // Clean up and redirect
    sessionStorage.removeItem('roomSettings');
    router.push('/dashboard/user');
  };

  const handleStartRecording = async (options: {
    audioOnly: boolean;
    outputFormat: 'mp4' | 'webm' | 'hls';
    includeScreenShare: boolean;
    notifyParticipants: boolean;
  }) => {
    if (!roomInfo?.public_uuid) return;

    try {
      await startRecordingMutation.mutateAsync({
        path: { public_uuid: roomInfo.public_uuid },
        body: {
          layout: 'speaker', // Could make this configurable
          file_format: options.outputFormat === 'hls' ? 'mp4' : options.outputFormat,
          audio_only: options.audioOnly
        }
      });
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error; // Re-throw so the dialog can show the error
    }
  };

  const handleStopRecording = async () => {
    if (!roomInfo?.public_uuid) return;

    try {
      await stopRecordingMutation.mutateAsync({
        path: { public_uuid: roomInfo.public_uuid }
      });
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error; // Re-throw so the dialog can show the error
    }
  };

  // Loading state
  if (tokenLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
              <p className="text-gray-300">Connecting to session...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (tokenError || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <Card className="max-w-md w-full bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <Alert variant="destructive" className="bg-red-900/20 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                {tokenError?.message || 'Failed to join session'}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push(`/room/booking/${bookingId}/lobby`)}
              className="w-full mt-4"
              variant="secondary"
            >
              Return to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Permission check
  if (!permissions.canJoin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <Card className="max-w-md w-full bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <Alert variant="destructive" className="bg-red-900/20 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                {permissions.reason || 'You do not have permission to join this session'}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push('/dashboard/user')}
              className="w-full mt-4"
              variant="secondary"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <VideoRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      roomType="individual"
      isHost={permissions.isHost}
      bookingDetails={bookingDetails}
      onLeaveRoom={handleLeaveRoom}
      onError={(error) => {
        console.error('Room error:', error);
        // Could show a toast notification here
      }}
      // Recording props
      isRecording={isRecording}
      onStartRecording={handleStartRecording}
      onStopRecording={handleStopRecording}
    />
  );
}