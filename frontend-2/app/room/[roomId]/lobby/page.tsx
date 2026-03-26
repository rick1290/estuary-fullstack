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
import { Loader2, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  // Check for unsigned required consent
  const [consentNeeded, setConsentNeeded] = useState(false);
  const [consentData, setConsentData] = useState<any>(null);
  const [signingConsent, setSigningConsent] = useState(false);
  const [consentName, setConsentName] = useState('');

  useEffect(() => {
    // Only check if we have a booking UUID from the access data
    const bookingUuid = (accessData as any)?.booking?.public_uuid || (accessData as any)?.my_booking?.public_uuid;
    if (!bookingUuid) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${baseUrl}/api/v1/intake/bookings/${bookingUuid}/forms/`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        const forms = data?.data || data;
        if (forms?.consent_required && !forms?.consent_signed) {
          setConsentNeeded(true);
          const consentForm = forms.forms?.find((f: any) => f.template?.form_type === 'consent' && !f.signed);
          setConsentData(consentForm);
        }
      })
      .catch(() => {});
  }, [accessData]);

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
    title: accessData?.service_session?.title || 'Session',
    description: accessData?.service_session?.description || '',
    start_time: accessData?.service_session?.start_time,
    end_time: accessData?.service_session?.end_time,
    session_type: accessData?.service_session?.session_type,
    // Service info
    service: accessData?.service ? {
      id: accessData.service.id,
      name: accessData.service.name || 'Session',
      description: accessData.service.description || '',
      service_type: accessData.service.service_type || 'session',
      image_url: accessData.service.image_url,
      duration_minutes: accessData.service.duration_minutes || 60,
    } : undefined,
    // Practitioner info
    practitioner: accessData?.practitioner ? {
      id: accessData.practitioner.id,
      name: accessData.practitioner.name || 'Practitioner',
      profile_photo: accessData.practitioner.profile_photo,
      specialization: accessData.practitioner.specialization || '',
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

      {consentNeeded && consentData && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="max-w-lg mx-auto p-6 bg-white rounded-2xl border border-sage-200/60">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-sage-600" />
              <h3 className="font-medium text-olive-900">Consent Required</h3>
            </div>
            <p className="text-sm text-olive-600 mb-3">Please review and sign before joining your session.</p>
            <div className="max-h-48 overflow-y-auto p-4 bg-sage-50 rounded-lg border text-sm text-olive-700 mb-4">
              {consentData.template?.latest_consent?.legal_text || 'Consent text not available.'}
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Type your full name to sign"
                value={consentName}
                onChange={(e) => setConsentName(e.target.value)}
              />
              <Button
                onClick={async () => {
                  if (!consentName.trim()) return;
                  setSigningConsent(true);
                  try {
                    const bookingUuid = (accessData as any)?.booking?.public_uuid || (accessData as any)?.my_booking?.public_uuid;
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                    await fetch(`${baseUrl}/api/v1/intake/bookings/${bookingUuid}/forms/consent/`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        consent_document: consentData.template?.latest_consent?.id,
                        signer_name: consentName.trim(),
                      }),
                    });
                    setConsentNeeded(false);
                  } catch (err) {
                    console.error('Failed to sign consent:', err);
                  } finally {
                    setSigningConsent(false);
                  }
                }}
                disabled={!consentName.trim() || signingConsent}
                className="w-full"
              >
                {signingConsent ? 'Signing...' : 'Sign & Continue to Session'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!consentNeeded && (
        <PreJoinScreen
          sessionDetails={sessionDetails}
          onJoinRoom={handleJoinRoom}
          loading={tokenLoading}
          error={tokenError?.message}
        />
      )}
    </>
  );
}