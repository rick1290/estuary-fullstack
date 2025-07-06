"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { serviceSessionsRetrieveOptions } from '@/src/client/@tanstack/react-query.gen';
import { PreJoinScreen } from '@/components/video/core/PreJoinScreen';
import { useRoomToken, useRoomPermissions } from '@/components/video/hooks';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, Users } from 'lucide-react';

export default function SessionLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const { permissions, loading: permissionsLoading, error: permissionsError } = useRoomPermissions({ sessionId });
  const { token, loading: tokenLoading, error: tokenError, roomInfo } = useRoomToken({ sessionId });

  // Fetch session details using React Query
  const { data: sessionDetails, isLoading: loadingSession, error: sessionError } = useQuery({
    ...serviceSessionsRetrieveOptions({ path: { id: parseInt(sessionId) } }),
    enabled: !!sessionId
  });

  const handleJoinRoom = (settings: any) => {
    // Store settings in session storage for the room page
    sessionStorage.setItem('roomSettings', JSON.stringify(settings));
    router.push(`/room/session/${sessionId}`);
  };

  // Loading state
  if (loadingSession || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-sage-600 mb-4" />
              <p className="text-gray-600">Loading session details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error states
  if (sessionError || permissionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {sessionError?.message || permissionsError?.message || 'Failed to load session'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Permission denied
  if (!permissions.canJoin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {permissions.reason || 'You do not have permission to join this session'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PreJoinScreen
        sessionDetails={sessionDetails}
        onJoinRoom={handleJoinRoom}
        loading={tokenLoading}
        error={tokenError?.message}
      />
      
      {/* Session Info for Group Sessions */}
      {sessionDetails && (
        <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-sage-600" />
            <div>
              <p className="font-medium text-sm">
                {sessionDetails.current_participants || 0} / {sessionDetails.max_participants || 20} participants
              </p>
              <p className="text-xs text-gray-500">
                Session starts at {new Date(sessionDetails.start_time).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}