"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { serviceSessionsRetrieveOptions, roomsStartRecordingCreateMutation, roomsStopRecordingCreateMutation } from '@/src/client/@tanstack/react-query.gen';
import { VideoRoom } from '@/components/video/core/VideoRoom';
import { useRoomToken, useRoomPermissions } from '@/components/video/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SessionRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [isRecording, setIsRecording] = useState(false);
  
  const { permissions, loading: permissionsLoading } = useRoomPermissions({ sessionId });
  const { token, loading: tokenLoading, error: tokenError, roomInfo } = useRoomToken({ sessionId });

  // Fetch session details using React Query
  const { data: sessionDetails } = useQuery({
    ...serviceSessionsRetrieveOptions({ path: { id: parseInt(sessionId) } }),
    enabled: !!sessionId
  });

  // Recording mutations
  const startRecordingMutation = useMutation(roomsStartRecordingCreateMutation());
  const stopRecordingMutation = useMutation(roomsStopRecordingCreateMutation());

  const handleLeaveRoom = () => {
    // Clean up and redirect
    sessionStorage.removeItem('roomSettings');
    
    // Redirect based on user role
    if (permissions.isHost) {
      router.push('/dashboard/practitioner');
    } else {
      router.push('/dashboard/user');
    }
  };

  const handleStartRecording = async () => {
    if (!roomInfo?.roomName || !permissions.canRecord) return;
    
    try {
      await startRecordingMutation.mutateAsync({
        path: { id: roomInfo.roomName }
      });
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    if (!roomInfo?.roomName || !permissions.canRecord) return;
    
    try {
      await stopRecordingMutation.mutateAsync({
        path: { id: roomInfo.roomName }
      });
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  // Determine room type based on service type
  const getRoomType = () => {
    const serviceType = sessionDetails?.service?.service_type;
    if (serviceType === 'webinar') return 'webinar';
    return 'group';
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
              onClick={() => router.push(`/room/session/${sessionId}/lobby`)}
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
      roomType={getRoomType()}
      isHost={permissions.isHost}
      sessionDetails={sessionDetails}
      onLeaveRoom={handleLeaveRoom}
      onError={(error) => {
        console.error('Room error:', error);
        // Could show a toast notification here
      }}
    />
  );
}