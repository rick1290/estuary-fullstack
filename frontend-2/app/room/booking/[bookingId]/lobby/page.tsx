"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { bookingsRetrieveOptions } from '@/src/client/@tanstack/react-query.gen';
import { PreJoinScreen } from '@/components/video/core/PreJoinScreen';
import { useRoomToken, useRoomPermissions } from '@/components/video/hooks';
import { BookingDebugInfo } from '@/components/video/debug/BookingDebugInfo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

export default function BookingLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  
  const { permissions, loading: permissionsLoading, error: permissionsError } = useRoomPermissions({ bookingId });
  const { token, loading: tokenLoading, error: tokenError, roomInfo } = useRoomToken({ bookingId });

  // Fetch booking details using React Query
  const { data: bookingDetails, isLoading: loadingBooking, error: bookingError } = useQuery({
    ...bookingsRetrieveOptions({ path: { id: parseInt(bookingId) } }),
    enabled: !!bookingId
  });

  const handleJoinRoom = (settings: any) => {
    // Store settings in session storage for the room page
    sessionStorage.setItem('roomSettings', JSON.stringify(settings));
    router.push(`/room/booking/${bookingId}`);
  };

  // Loading state
  if (loadingBooking || permissionsLoading) {
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
  if (bookingError || permissionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {bookingError?.message || permissionsError?.message || 'Failed to load session'}
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
        bookingDetails={bookingDetails}
        onJoinRoom={handleJoinRoom}
        loading={tokenLoading}
        error={tokenError?.message}
      />
      <BookingDebugInfo bookingId={bookingId} />
    </>
  );
}