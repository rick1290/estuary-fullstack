"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Calendar, Clock, Film, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { bookingsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen";
import { useSuspenseQuery } from "@tanstack/react-query";

export default function RecordingViewerPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const recordingId = params.recordingId as string;

  // Fetch booking data with recordings
  const { data: booking, isLoading } = useSuspenseQuery(
    bookingsRetrieveOptions({
      path: { id: bookingId },
    })
  );

  // Find the specific recording
  const recording = booking?.recordings?.find(
    (rec: any) => rec.id.toString() === recordingId || rec.recording_id === recordingId
  );

  if (isLoading) {
    return <RecordingViewerSkeleton />;
  }

  if (!recording) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card className="border-2 border-red-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Film className="h-12 w-12 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold">Recording Not Found</h2>
              <p className="text-muted-foreground">
                This recording may have been deleted or is not yet available.
              </p>
              <Button onClick={() => router.push(`/dashboard/user/bookings/${bookingId}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const practitioner = booking?.service?.practitioner;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-cream-50">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/user/bookings/${bookingId}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Booking
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                {recording.file_url ? (
                  <div className="relative bg-black" style={{ paddingTop: "56.25%" }}>
                    <video
                      controls
                      controlsList="nodownload"
                      className="absolute inset-0 w-full h-full"
                      preload="metadata"
                      src={recording.file_url}
                    >
                      <source src={recording.file_url} type={`video/${recording.file_format || 'mp4'}`} />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 bg-black">
                    <div className="text-center text-white space-y-2">
                      <Film className="h-12 w-12 mx-auto opacity-50" />
                      <p className="text-sm">Video not available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Video Info */}
            <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">
                        {booking?.service?.name || 'Session Recording'}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {recording.file_format?.toUpperCase() || 'MP4'}
                      </Badge>
                    </div>

                    {booking?.service?.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {booking.service.description}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    asChild
                  >
                    <a
                      href={recording.download_url || recording.file_url}
                      download
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-muted-foreground text-xs">Duration</p>
                      <p className="font-medium">
                        {recording.duration_formatted || `${Math.floor(recording.duration_seconds / 60)} min`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-muted-foreground text-xs">Recorded</p>
                      <p className="font-medium">
                        {recording.started_at
                          ? format(parseISO(recording.started_at), "MMM d, yyyy")
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {recording.file_size_bytes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      File Size: {(recording.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Booking & Practitioner Info */}
          <div className="space-y-6">
            {/* Booking Details */}
            <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Session Date</p>
                  <p className="text-sm font-medium">
                    {booking?.start_time
                      ? format(parseISO(booking.service_session?.start_time), "EEEE, MMM d, yyyy")
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium">
                    {booking?.start_time && booking?.end_time
                      ? `${format(parseISO(booking.service_session?.start_time), "h:mm a")} - ${format(parseISO(booking.service_session?.end_time), "h:mm a")}`
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {booking?.status || 'Unknown'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Practitioner Info */}
            {practitioner && (
              <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm">Practitioner</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    {practitioner.profile_picture ? (
                      <img
                        src={practitioner.profile_picture}
                        alt={practitioner.display_name || practitioner.user?.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-sage-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {practitioner.display_name || practitioner.user?.full_name || 'Practitioner'}
                      </p>
                      {practitioner.specializations && practitioner.specializations.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {practitioner.specializations[0]}
                        </p>
                      )}
                      {practitioner.id && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs mt-1"
                          onClick={() => router.push(`/practitioners/${practitioner.id}`)}
                        >
                          View Profile
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recording Note */}
            <Card className="border-2 border-sage-200 bg-sage-50/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">
                  This recording is private and only accessible to you and your practitioner.
                  Please respect the confidentiality of this session.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordingViewerSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-cream-50">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-40 mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-2 border-sage-200">
              <CardContent className="p-0">
                <Skeleton className="w-full h-96" />
              </CardContent>
            </Card>
            <Card className="border-2 border-sage-200">
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-sage-200">
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
