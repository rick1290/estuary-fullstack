"use client";

import { useQuery } from '@tanstack/react-query';
import { bookingsRetrieveOptions } from '@/src/client/@tanstack/react-query.gen';
import { useAuth } from '@/hooks/use-auth';
import { useMediaDevices } from '@/components/video/hooks/useMediaDevices';

interface BookingDebugInfoProps {
  bookingId: string;
}

export function BookingDebugInfo({ bookingId }: BookingDebugInfoProps) {
  const { user } = useAuth();
  const { cameras, microphones, error } = useMediaDevices();
  
  const { data: booking } = useQuery({
    ...bookingsRetrieveOptions({ path: { id: parseInt(bookingId) } }),
    enabled: !!bookingId
  });

  if (!booking || !user) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded text-xs max-w-md">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <div>Current User ID: {user.numericId}</div>
        <div>Current User Practitioner ID: {user.practitionerId}</div>
        <div>Booking ID: {bookingId}</div>
        <div>Booking Practitioner ID: {booking.practitioner?.id}</div>
        <div>Booking Client User ID: {booking.user?.id}</div>
        <div>Booking Status: {booking.status}</div>
        <div>Is Practitioner: {booking.practitioner?.id === user.practitionerId ? 'Yes' : 'No'}</div>
        <div>Is Client: {booking.user?.id === user.numericId ? 'Yes' : 'No'}</div>
        <div className="mt-2 border-t pt-2">
          <div className="font-bold">Media Devices:</div>
          <div>Cameras: {cameras.length}</div>
          <div>Microphones: {microphones.length}</div>
          {error && <div className="text-red-400">Error: {error.message}</div>}
        </div>
      </div>
    </div>
  );
}