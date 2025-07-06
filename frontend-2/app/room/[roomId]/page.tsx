"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { roomsCheckAccessRetrieveOptions, roomsStartRecordingCreateMutation, roomsStopRecordingCreateMutation } from '@/src/client/@tanstack/react-query.gen';
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

  // Recording mutations
  const startRecordingMutation = useMutation(roomsStartRecordingCreateMutation());
  const stopRecordingMutation = useMutation(roomsStopRecordingCreateMutation());

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

  const handleStartRecording = async () => {
    if (!roomInfo?.roomName || accessData?.role !== 'host') return;
    
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
    if (!roomInfo?.roomName || accessData?.role !== 'host') return;
    
    try {
      await stopRecordingMutation.mutateAsync({
        path: { id: roomInfo.roomName }
      });
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  // Determine room type
  const getRoomType = () => {
    return accessData?.room?.room_type || 'individual';
  };

  // Loading state
  if (tokenLoading || loadingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
              <p className="text-gray-300">Connecting to room...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (tokenError || accessError || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <Card className="max-w-md w-full bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <Alert variant="destructive" className="bg-red-900/20 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                {tokenError?.message || accessError?.message || 'Failed to join room'}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push(`/room/${roomId}/lobby`)}
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
  if (!accessData?.can_join) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <Card className="max-w-md w-full bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <Alert variant="destructive" className="bg-red-900/20 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                {accessData?.reason || 'You do not have permission to join this room'}
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

  // Build session details from access data
  const sessionDetails = accessData?.service_session || accessData?.booking || { room: accessData?.room };

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
    />
  );
}