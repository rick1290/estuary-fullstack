"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoRoom } from '@/components/video/core/VideoRoom';
import { useRoomToken, useRoomPermissions } from '@/components/video/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

export default function DirectRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  
  const { permissions, loading: permissionsLoading } = useRoomPermissions({ roomId });
  const { token, loading: tokenLoading, error: tokenError } = useRoomToken({ roomId });

  const handleLeaveRoom = () => {
    router.push('/dashboard/user');
  };

  // Loading state
  if (tokenLoading || permissionsLoading) {
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
  if (tokenError || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <Card className="max-w-md w-full bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <Alert variant="destructive" className="bg-red-900/20 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                {tokenError?.message || 'Failed to join room'}
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
      onLeaveRoom={handleLeaveRoom}
      onError={(error) => {
        console.error('Room error:', error);
      }}
    />
  );
}