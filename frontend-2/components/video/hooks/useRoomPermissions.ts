import { useQuery } from '@tanstack/react-query';
import { roomsCheckAccessRetrieveOptions } from '@/src/client/@tanstack/react-query.gen';
import { useAuth } from '@/hooks/use-auth';

interface UseRoomPermissionsProps {
  roomId: string;
}

interface RoomPermissions {
  canJoin: boolean;
  isHost: boolean;
  canRecord: boolean;
  canScreenShare: boolean;
  canMuteOthers: boolean;
  role: 'host' | 'participant' | 'viewer';
  reason?: string;
}

export function useRoomPermissions({ roomId }: UseRoomPermissionsProps) {
  const { user, isAuthenticated } = useAuth();

  // Use the unified check_access endpoint
  const { data: accessData, isLoading, error } = useQuery({
    ...roomsCheckAccessRetrieveOptions({ path: { public_uuid: roomId } }),
    enabled: !!roomId && isAuthenticated
  });

  // Calculate permissions based on access data
  const permissions: RoomPermissions = (() => {
    if (!user || !isAuthenticated) {
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

    if (!accessData) {
      return {
        canJoin: false,
        isHost: false,
        canRecord: false,
        canScreenShare: false,
        canMuteOthers: false,
        role: 'viewer',
        reason: 'Loading...'
      };
    }

    const isHost = accessData.role === 'host';
    const canJoin = accessData.can_join;

    return {
      canJoin,
      isHost,
      canRecord: isHost,
      canScreenShare: isHost || accessData.role === 'participant',
      canMuteOthers: isHost,
      role: accessData.role || 'viewer',
      reason: accessData.reason
    };
  })();

  return { 
    permissions, 
    loading: isLoading, 
    error: error as Error | null,
    accessData 
  };
}