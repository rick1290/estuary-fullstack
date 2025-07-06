"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { roomsCheckAccessRetrieveOptions } from '@/src/client/@tanstack/react-query.gen';
import { PreJoinScreen } from '@/components/video/core/PreJoinScreen';
import { useRoomToken } from '@/components/video/hooks';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, Users } from 'lucide-react';

export default function RoomLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { user, isAuthenticated } = useAuth();
  
  // Check room access using the new endpoint
  const { data: accessData, isLoading: loadingAccess, error: accessError } = useQuery({
    ...roomsCheckAccessRetrieveOptions({ path: { public_uuid: roomId } }),
    enabled: !!roomId && isAuthenticated
  });

  // Get room token
  const { token, loading: tokenLoading, error: tokenError } = useRoomToken({ roomId });

  const handleJoinRoom = (settings: any) => {
    // Store settings in session storage for the room page
    sessionStorage.setItem('roomSettings', JSON.stringify(settings));
    router.push(`/room/${roomId}`);
  };

  // Loading state
  if (loadingAccess || tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-sage-600 mb-4" />
              <p className="text-gray-600">Loading room details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error states
  if (accessError || tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {accessError?.message || tokenError?.message || 'Failed to load room'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Permission denied
  if (accessData && !accessData.can_join) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {accessData.reason || 'You do not have permission to join this room'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build session details from access data
  const sessionDetails = accessData?.service_session ? {
    id: accessData.service_session.id,
    start_time: accessData.service_session.start_time,
    end_time: accessData.service_session.end_time,
    room: accessData.room,
  } : accessData?.booking ? {
    booking: accessData.booking,
    room: accessData.room,
  } : {
    room: accessData?.room,
  };

  return (
    <>
      <PreJoinScreen
        sessionDetails={sessionDetails}
        onJoinRoom={handleJoinRoom}
        loading={tokenLoading}
        error={tokenError?.message}
      />
      
      {/* Session Info */}
      {accessData?.room && (
        <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-sage-600" />
            <div>
              <p className="font-medium text-sm">
                {accessData.room.room_type === 'individual' ? '1-on-1 Session' : 'Group Session'}
              </p>
              <p className="text-xs text-gray-500">
                You will join as {accessData.role}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}