"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { roomsCheckAccessRetrieveOptions, roomsStartRecordingCreateMutation, roomsStopRecordingCreateMutation, roomsEndSessionCreateMutation, bookingsRetrieveOptions } from '@/src/client/@tanstack/react-query.gen';
import { VideoRoom } from '@/components/video/core/VideoRoom';
import { useRoomToken } from '@/components/video/hooks';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { user, isAuthenticated } = useAuth();
  
  const [isRecording, setIsRecording] = useState(false);

  // Check room access using the new endpoint
  const { data: accessData, isLoading: loadingAccess, error: accessError } = useQuery({
    ...roomsCheckAccessRetrieveOptions({ path: { public_uuid: roomId } }),
    enabled: !!roomId && isAuthenticated
  });

  const { token, loading: tokenLoading, error: tokenError, roomInfo } = useRoomToken({ roomId });

  // Initialize recording state from room token response (fresh on every join/rejoin)
  useEffect(() => {
    // Prefer roomInfo.recording_status (from token response) as it's always fresh
    // Fall back to accessData for initial render
    const recordingStatus = (roomInfo as { recording_status?: string })?.recording_status ?? accessData?.room?.recording_status;
    if (recordingStatus) {
      const isActive = ['starting', 'active'].includes(recordingStatus);
      setIsRecording(isActive);
      console.log('Initialized recording state:', {
        recording_status: recordingStatus,
        source: (roomInfo as { recording_status?: string })?.recording_status ? 'roomInfo' : 'accessData',
        isRecording: isActive
      });
    }
  }, [(roomInfo as { recording_status?: string })?.recording_status, accessData?.room?.recording_status]);
  
  // Fetch booking details if we have a booking ID
  const bookingId = accessData?.booking?.id;
  const { data: bookingData } = useQuery({
    ...bookingsRetrieveOptions({ path: { id: bookingId! } }),
    enabled: !!bookingId
  });

  // Recording mutations
  const startRecordingMutation = useMutation(roomsStartRecordingCreateMutation());
  const stopRecordingMutation = useMutation(roomsStopRecordingCreateMutation());

  // End session mutation
  const endSessionMutation = useMutation(roomsEndSessionCreateMutation());

  const handleLeaveRoom = () => {
    // Clean up and redirect
    sessionStorage.removeItem('roomSettings');
    
    // Redirect based on user role
    if (accessData?.role === 'host') {
      router.push('/dashboard/practitioner');
    } else {
      router.push('/dashboard/user');
    }
  };

  const handleStartRecording = async (options: {
    audioOnly: boolean;
    outputFormat: 'mp4' | 'webm' | 'hls';
    includeScreenShare: boolean;
    notifyParticipants: boolean;
  }) => {
    console.log('PAGE: handleStartRecording called', { options, roomId, accessData });

    if (!roomId || accessData?.role !== 'host') {
      console.error('Cannot start recording - missing data or not host', {
        hasRoomId: !!roomId,
        isHost: accessData?.role === 'host'
      });
      return;
    }

    try {
      console.log('PAGE: Starting mutation with:', {
        public_uuid: roomId,
        layout: getRoomType() === 'individual' ? 'speaker' : 'grid',
        file_format: options.outputFormat === 'hls' ? 'mp4' : options.outputFormat,
        audio_only: options.audioOnly
      });

      await startRecordingMutation.mutateAsync({
        path: { public_uuid: roomId },
        body: {
          layout: getRoomType() === 'individual' ? 'speaker' : 'grid',
          file_format: options.outputFormat === 'hls' ? 'mp4' : options.outputFormat,
          audio_only: options.audioOnly
        }
      });

      console.log('PAGE: Recording started successfully!');
      setIsRecording(true);
    } catch (error) {
      console.error('PAGE: Failed to start recording:', error);
      throw error;
    }
  };

  const handleStopRecording = async () => {
    if (!roomId || accessData?.role !== 'host') return;

    try {
      await stopRecordingMutation.mutateAsync({
        path: { public_uuid: roomId }
      });
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  };

  const handleEndSession = async () => {
    if (!roomId || accessData?.role !== 'host') return;

    try {
      await endSessionMutation.mutateAsync({
        path: { public_uuid: roomId }
      });
      // The VideoRoom component will handle disconnection and redirect
      console.log('Session ended successfully');
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  };

  // Determine room type
  const getRoomType = () => {
    return accessData?.room?.room_type || 'individual';
  };

  // Loading state
  if (tokenLoading || loadingAccess || (bookingId && !bookingData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-50 via-sage-50/30 to-cream-50">
        <Card className="border-sage-200 shadow-xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-sage-600 mb-4" />
              <p className="text-olive-600">Connecting to room...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (tokenError || accessError || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-50 via-sage-50/30 to-cream-50 p-4">
        <Card className="max-w-md w-full border-sage-200 shadow-xl">
          <CardContent className="p-6">
            <Alert variant="destructive" className="border-terracotta-200 bg-terracotta-50">
              <AlertCircle className="h-4 w-4 text-terracotta-600" />
              <AlertDescription className="text-terracotta-800">
                {tokenError?.message || accessError?.message || 'Failed to join room'}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push(`/room/${roomId}/lobby`)}
              className="w-full mt-4 bg-sage-600 hover:bg-sage-700"
            >
              Return to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Permission check
  if (!accessData?.can_join) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-50 via-sage-50/30 to-cream-50 p-4">
        <Card className="max-w-md w-full border-sage-200 shadow-xl">
          <CardContent className="p-6">
            <Alert variant="destructive" className="border-terracotta-200 bg-terracotta-50">
              <AlertCircle className="h-4 w-4 text-terracotta-600" />
              <AlertDescription className="text-terracotta-800">
                {accessData?.reason || 'You do not have permission to join this room'}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push('/dashboard/user')}
              className="w-full mt-4 bg-sage-600 hover:bg-sage-700"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build session details from access data - pass all info to VideoRoom
  const sessionDetails = {
    // Session info
    id: accessData?.service_session?.id,
    title: accessData?.service_session?.title,
    description: accessData?.service_session?.description,
    start_time: accessData?.service_session?.start_time,
    end_time: accessData?.service_session?.end_time,
    session_type: accessData?.service_session?.session_type,
    // Service info
    service: accessData?.service ? {
      id: accessData.service.id,
      name: accessData.service.name,
      description: accessData.service.description,
      service_type: accessData.service.service_type,
      image_url: accessData.service.image_url,
      duration_minutes: accessData.service.duration_minutes,
    } : undefined,
    // Practitioner info
    practitioner: accessData?.practitioner ? {
      id: accessData.practitioner.id,
      name: accessData.practitioner.name,
      profile_photo: accessData.practitioner.profile_photo,
      specialization: accessData.practitioner.specialization,
    } : undefined,
    // Room info
    room: accessData?.room,
    // Booking info if available
    booking: accessData?.my_booking,
  };

  return (
    <VideoRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      roomType={getRoomType()}
      isHost={accessData?.role === 'host'}
      sessionDetails={sessionDetails}
      onLeaveRoom={handleLeaveRoom}
      onError={(error) => {
        console.error('Room error:', error);
        // Could show a toast notification here
      }}
      // Recording props
      isRecording={isRecording}
      onStartRecording={handleStartRecording}
      onStopRecording={handleStopRecording}
      // End session props (host only)
      onEndSession={accessData?.role === 'host' ? handleEndSession : undefined}
    />
  );
}