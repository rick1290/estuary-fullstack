import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { bookingsRetrieveOptions, serviceSessionsRetrieveOptions, roomsGetTokenCreateMutation } from '@/src/client/@tanstack/react-query.gen';
import { useAuth } from '@/hooks/use-auth';

interface UseRoomTokenProps {
  roomId?: string;
  bookingId?: string;
  sessionId?: string;
}

interface RoomTokenResponse {
  token: string;
  roomName: string;
  participantIdentity: string;
  expiresAt: string;
  permissions: Record<string, boolean>;
  joinUrl: string;
}

export function useRoomToken({ roomId, bookingId, sessionId }: UseRoomTokenProps) {
  const { user } = useAuth();
  const [roomUuid, setRoomUuid] = useState<string | null>(null);

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

  // Determine room UUID based on context
  useEffect(() => {
    if (roomId) {
      setRoomUuid(roomId);
    } else if (bookingQuery.data?.room?.public_uuid) {
      setRoomUuid(bookingQuery.data.room.public_uuid);
    } else if (sessionQuery.data?.room?.public_uuid) {
      setRoomUuid(sessionQuery.data.room.public_uuid);
    }
  }, [roomId, bookingQuery.data, sessionQuery.data]);

  // Get LiveKit token mutation
  const tokenMutation = useMutation({
    ...roomsGetTokenCreateMutation(),
    onError: (error) => {
      console.error('Room token error:', error);
      // Log more details about the error
      if (error && typeof error === 'object') {
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
    },
    onSuccess: (data) => {
      console.log('Room token success:', data);
    }
  });

  // Fetch token when room UUID is available
  useEffect(() => {
    if (roomUuid && user && !tokenMutation.data && !tokenMutation.isPending && !tokenMutation.error) {
      // Construct participant name with fallback logic
      const firstName = user.firstName?.trim() || '';
      const lastName = user.lastName?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const participantName = fullName || user.email || 'Anonymous User';
      
      console.log('Getting room token with participant name:', participantName);
      
      tokenMutation.mutate({
        path: { public_uuid: roomUuid },
        body: {
          participant_name: participantName
        }
      });
    }
  }, [roomUuid, user, tokenMutation.data, tokenMutation.isPending, tokenMutation.error]);

  // Determine loading and error states
  const loading = bookingQuery.isLoading || sessionQuery.isLoading || tokenMutation.isPending;
  const error = bookingQuery.error || sessionQuery.error || tokenMutation.error || 
    (!user && new Error('User must be authenticated to join a room')) ||
    (!roomId && !bookingId && !sessionId && new Error('Room, booking, or session ID required')) ||
    ((bookingId && bookingQuery.data && !bookingQuery.data.room?.public_uuid) && new Error('No room associated with this booking')) ||
    ((sessionId && sessionQuery.data && !sessionQuery.data.room?.public_uuid) && new Error('No room associated with this session'));

  return {
    token: tokenMutation.data?.token || null,
    loading,
    error: error as Error | null,
    roomInfo: tokenMutation.data || null
  };
}