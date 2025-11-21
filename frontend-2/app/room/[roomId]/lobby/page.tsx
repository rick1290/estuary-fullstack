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
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { EstuaryLogo } from '@/components/ui/estuary-logo';

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

  const handleExit = () => {
    // Navigate back to dashboard
    router.push('/dashboard/user');
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

  // Build session details from access data - pass all info to PreJoinScreen
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
    <>
      {/* Estuary Logo */}
      <div className="fixed top-4 left-4 z-50">
        <EstuaryLogo size="lg" className="text-sage-700" />
      </div>

      {/* Exit Button */}
      <button
        onClick={handleExit}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-md hover:bg-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Exit to Dashboard</span>
      </button>

      <PreJoinScreen
        sessionDetails={sessionDetails}
        onJoinRoom={handleJoinRoom}
        loading={tokenLoading}
        error={tokenError?.message}
      />
    </>
  );
}