import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingsRetrieveOptions, serviceSessionsRetrieveOptions, bookingsListOptions, roomsRetrieveOptions } from '@/src/client/@tanstack/react-query.gen';
import { useAuth } from '@/hooks/use-auth';

interface UseRoomPermissionsProps {
  bookingId?: string;
  sessionId?: string;
  roomId?: string;
}

interface RoomPermissions {
  canJoin: boolean;
  isHost: boolean;
  canRecord: boolean;
  canScreenShare: boolean;
  canMuteOthers: boolean;
  role: 'host' | 'participant' | 'viewer';
  reason?: string; // Why they can't join
}

export function useRoomPermissions({ bookingId, sessionId, roomId }: UseRoomPermissionsProps) {
  const { user } = useAuth();

  // Fetch booking details if bookingId provided
  const bookingQuery = useQuery({
    ...bookingsRetrieveOptions({ path: { id: parseInt(bookingId || '0') } }),
    enabled: !!bookingId && !!user
  });

  // Fetch session details if sessionId provided
  const sessionQuery = useQuery({
    ...serviceSessionsRetrieveOptions({ path: { id: parseInt(sessionId || '0') } }),
    enabled: !!sessionId && !!user
  });

  // Fetch user bookings for session if sessionId provided
  const userBookingsQuery = useQuery({
    ...bookingsListOptions({ 
      query: { 
        service_session: parseInt(sessionId || '0'),
        user: user?.numericId || 0 
      } 
    }),
    enabled: !!sessionId && !!user && !!sessionQuery.data
  });

  // Fetch room details if roomId provided
  const roomQuery = useQuery({
    ...roomsRetrieveOptions({ path: { id: roomId || '' } }),
    enabled: !!roomId && !!user
  });

  // Calculate permissions based on fetched data
  const permissions: RoomPermissions = (() => {
    if (!user) {
      return {
        canJoin: false,
        isHost: false,
        canRecord: false,
        canScreenShare: false,
        canMuteOthers: false,
        role: 'viewer',
        reason: 'Not authenticated'
      };
    }

    if (bookingId && bookingQuery.data) {
      const booking = bookingQuery.data;
      // Check if user is the practitioner (match practitioner ID with user's practitioner ID)
      const isPractitioner = booking.practitioner?.id === user.practitionerId;
      // Check if user is the client (match user ID)
      const isClient = booking.user?.id === user.numericId;

      if (!isPractitioner && !isClient) {
        return {
          canJoin: false,
          isHost: false,
          canRecord: false,
          canScreenShare: false,
          canMuteOthers: false,
          role: 'viewer',
          reason: 'Not associated with this booking'
        };
      }

      if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
        return {
          canJoin: false,
          isHost: false,
          canRecord: false,
          canScreenShare: false,
          canMuteOthers: false,
          role: 'viewer',
          reason: `Booking is ${booking.status}`
        };
      }

      return {
        canJoin: true,
        isHost: isPractitioner,
        canRecord: isPractitioner,
        canScreenShare: true,
        canMuteOthers: isPractitioner,
        role: isPractitioner ? 'host' : 'participant'
      };
    }

    if (sessionId && sessionQuery.data) {
      const session = sessionQuery.data;
      const isPractitioner = session.service?.practitioner?.user?.id === user.numericId;
      const hasBooking = userBookingsQuery.data?.results?.some(
        (booking: any) => booking.status === 'confirmed'
      );

      if (!isPractitioner && !hasBooking) {
        return {
          canJoin: false,
          isHost: false,
          canRecord: false,
          canScreenShare: false,
          canMuteOthers: false,
          role: 'viewer',
          reason: 'No confirmed booking for this session'
        };
      }

      return {
        canJoin: true,
        isHost: isPractitioner,
        canRecord: isPractitioner,
        canScreenShare: isPractitioner,
        canMuteOthers: isPractitioner,
        role: isPractitioner ? 'host' : 'participant'
      };
    }

    if (roomId && roomQuery.data) {
      const room = roomQuery.data;
      const isCreator = room.created_by === user.numericId;

      return {
        canJoin: true,
        isHost: isCreator,
        canRecord: isCreator,
        canScreenShare: true,
        canMuteOthers: isCreator,
        role: isCreator ? 'host' : 'participant'
      };
    }

    // Default permissions
    return {
      canJoin: false,
      isHost: false,
      canRecord: false,
      canScreenShare: false,
      canMuteOthers: false,
      role: 'viewer',
      reason: 'No valid context provided'
    };
  })();

  const loading = bookingQuery.isLoading || sessionQuery.isLoading || userBookingsQuery.isLoading || roomQuery.isLoading;
  const error = bookingQuery.error || sessionQuery.error || userBookingsQuery.error || roomQuery.error;

  return { permissions, loading, error: error as Error | null };
}