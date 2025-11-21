"use client";

import React, { useMemo, useState } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  useTracks,
  ControlBar,
  RoomAudioRenderer,
  ConnectionStateToast,
  LayoutContextProvider,
  Chat,
  MediaDeviceMenu,
  useRoomContext,
  useConnectionState,
  useParticipants,
  formatChatMessageLinks,
  TrackReferenceOrPlaceholder
} from '@livekit/components-react';
import { Track, ConnectionState, RemoteParticipant } from 'livekit-client';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2, MessageSquare, Settings, X, Users,
  PhoneOff, Maximize2, Minimize2, Clock,
  Mic, MicOff, Video, VideoOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EstuaryLogo } from '@/components/ui/estuary-logo';
import { RecordingControls, RecordingIndicator } from '@/components/video/features/Recording';

interface RecordingOptions {
  audioOnly: boolean;
  outputFormat: 'mp4' | 'webm' | 'hls';
  includeScreenShare: boolean;
  notifyParticipants: boolean;
}

interface VideoRoomProps {
  token: string;
  serverUrl?: string;
  roomType: 'individual' | 'group' | 'webinar';
  isHost: boolean;
  bookingDetails?: any;
  sessionDetails?: any;
  onLeaveRoom: () => void;
  onError?: (error: Error) => void;
  // Recording props
  isRecording?: boolean;
  onStartRecording?: (options: RecordingOptions) => Promise<void>;
  onStopRecording?: () => Promise<void>;
}

export function VideoRoom({
  token,
  serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com',
  roomType,
  isHost,
  bookingDetails,
  sessionDetails,
  onLeaveRoom,
  onError,
  isRecording = false,
  onStartRecording,
  onStopRecording
}: VideoRoomProps) {
  const [showChat, setShowChat] = useState(roomType !== 'individual');
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionDuration, setSessionDuration] = useState<number>(0);

  // Get session info
  const sessionInfo = bookingDetails || sessionDetails;
  const practitioner = sessionInfo?.practitioner;
  // Prefer session title (for workshops/courses), then service name
  const sessionTitle = sessionInfo?.title || sessionInfo?.service?.name || 'Video Session';

  // Room options based on room type
  const roomOptions = useMemo(() => ({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: roomType === 'individual' ? { width: 1280, height: 720 } : { width: 960, height: 540 }
    },
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    publishDefaults: {
      videoCodec: 'vp8',
      screenShareEncoding: {
        maxBitrate: 1_500_000,
        maxFramerate: 30,
      }
    }
  }), [roomType]);

  // Track session duration
  React.useEffect(() => {
    const interval = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getRoomTypeLabel = () => {
    switch (roomType) {
      case 'individual': return '1-on-1 Session';
      case 'group': return 'Group Session';
      case 'webinar': return 'Course Session';
      default: return 'Video Session';
    }
  };

  // Unified UI for all room types
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      options={roomOptions}
      connect={true}
      onConnected={() => {
        console.log('Connected to LiveKit room successfully!');
      }}
      onDisconnected={(reason) => {
        console.log('Disconnected:', reason);
        onLeaveRoom();
      }}
      onError={(error) => {
        console.error('Room error:', error);
        onError?.(error);
      }}
    >
      <LayoutContextProvider>
        <div className="h-screen flex flex-col bg-gradient-to-br from-estuary-900 to-wellness-900" style={{
          '--lk-fg': 'white',
          '--lk-bg': 'transparent',
          '--lk-bg-2': 'rgba(255, 255, 255, 0.05)',
          '--lk-bg-3': 'rgba(255, 255, 255, 0.1)',
          '--lk-border': 'rgba(255, 255, 255, 0.2)',
          '--lk-participant-name-fg': 'white',
          '--lk-participant-name-bg': 'rgba(0, 0, 0, 0.6)',
          '--lk-participant-metadata-fg': 'rgba(255, 255, 255, 0.8)',
          '--lk-participant-tile-border': 'rgba(255, 255, 255, 0.1)',
          '--lk-focus-ring': 'rgba(32, 178, 170, 0.5)',
        } as React.CSSProperties}>
          {/* Room Audio - Important for audio to work */}
          <RoomAudioRenderer />

          {/* Connection State Notifications */}
          <ConnectionStateToast />

          {/* Recording Indicator */}
          <RecordingIndicator isRecording={isRecording} />

          {/* Header */}
          <div className="bg-estuary-900/80 backdrop-blur-md border-b border-wellness-700/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Practitioner Avatar */}
                {practitioner && (
                  <Avatar className="h-11 w-11 border-2 border-wellness-600 ring-2 ring-wellness-600/30">
                    <AvatarImage src={practitioner.profile_photo} alt={practitioner.name} />
                    <AvatarFallback className="bg-wellness-700 text-white">
                      {practitioner.name?.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {sessionTitle}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-wellness-200">
                    {practitioner && (
                      <>
                        <span className="text-wellness-100">with {practitioner.name}</span>
                        <span>•</span>
                      </>
                    )}
                    <Badge variant="secondary" className="bg-wellness-700/30 text-wellness-100 border-wellness-600">
                      {isHost ? 'Host' : 'Participant'}
                    </Badge>
                    <Badge variant="outline" className="border-wellness-600 text-wellness-200">
                      {getRoomTypeLabel()}
                    </Badge>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(sessionDuration)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Recording Controls - Host only */}
                {onStartRecording && onStopRecording && (
                  <RecordingControls
                    isHost={isHost}
                    isRecording={isRecording}
                    onStartRecording={onStartRecording}
                    onStopRecording={onStopRecording}
                  />
                )}

                {/* Participants Toggle - For group/webinar, host can manage */}
                {(roomType !== 'individual' || isHost) && (
                  <Button
                    variant={showParticipants ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowParticipants(!showParticipants)}
                    className={cn(
                      "text-white border-wellness-600",
                      showParticipants ? "bg-wellness-700/50" : "hover:bg-wellness-700/30"
                    )}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Participants
                  </Button>
                )}

                {/* Chat Toggle - For group/webinar */}
                {roomType !== 'individual' && (
                  <Button
                    variant={showChat ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowChat(!showChat)}
                    className={cn(
                      "text-white border-wellness-600",
                      showChat ? "bg-wellness-700/50" : "hover:bg-wellness-700/30"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                )}

                {/* Settings Toggle */}
                <Button
                  variant={showSettings ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    "text-white border-wellness-600",
                    showSettings ? "bg-wellness-700/50" : "hover:bg-wellness-700/30"
                  )}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>

                {/* Fullscreen Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-wellness-700/30"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>

                {/* Leave Button */}
                <LeaveButton onLeaveRoom={onLeaveRoom} />
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Video Area */}
            <div className="flex-1 relative overflow-hidden">
              {roomType === 'individual' ? (
                <IndividualLayout />
              ) : roomType === 'webinar' ? (
                <WebinarLayout isHost={isHost} />
              ) : (
                <GroupLayout />
              )}
            </div>

            {/* Participants Sidebar - Host controls */}
            {showParticipants && (
              <ParticipantsSidebar
                isHost={isHost}
                onClose={() => setShowParticipants(false)}
              />
            )}

            {/* Chat Sidebar */}
            {showChat && roomType !== 'individual' && (
              <div className="w-80 bg-estuary-900/95 backdrop-blur-md border-l border-wellness-700/30 flex flex-col">
                <div className="p-4 border-b border-wellness-700/30 flex items-center justify-between">
                  <h3 className="text-white font-medium">Chat</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChat(false)}
                    className="text-wellness-200 hover:text-white hover:bg-wellness-700/30"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Chat
                    style={{
                      height: '100%',
                      backgroundColor: 'transparent',
                      '--lk-chat-bg': 'transparent',
                      '--lk-chat-input-bg': 'rgba(32, 178, 170, 0.1)',
                      '--lk-chat-input-border': 'rgba(32, 178, 170, 0.3)',
                      '--lk-chat-message-bg': 'rgba(32, 178, 170, 0.1)',
                      '--lk-chat-text': 'white',
                    } as React.CSSProperties}
                    messageFormatter={formatChatMessageLinks}
                  />
                </div>
              </div>
            )}

            {/* Settings Sidebar */}
            {showSettings && (
              <div className="w-80 bg-estuary-900/95 backdrop-blur-md border-l border-wellness-700/30 flex flex-col">
                <div className="p-4 border-b border-wellness-700/30 flex items-center justify-between">
                  <h3 className="text-white font-medium">Settings</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(false)}
                    className="text-wellness-200 hover:text-white hover:bg-wellness-700/30"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 p-4 space-y-6">
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Camera</label>
                    <div className="lk-device-menu" style={{ '--lk-control-bg': 'rgba(32, 178, 170, 0.2)' } as React.CSSProperties}>
                      <MediaDeviceMenu kind="videoinput" />
                    </div>
                  </div>
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Microphone</label>
                    <div className="lk-device-menu" style={{ '--lk-control-bg': 'rgba(32, 178, 170, 0.2)' } as React.CSSProperties}>
                      <MediaDeviceMenu kind="audioinput" />
                    </div>
                  </div>
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Speaker</label>
                    <div className="lk-device-menu" style={{ '--lk-control-bg': 'rgba(32, 178, 170, 0.2)' } as React.CSSProperties}>
                      <MediaDeviceMenu kind="audiooutput" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Control Bar */}
          <div className="bg-estuary-900/80 backdrop-blur-md border-t border-wellness-700/30 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="lk-control-bar" style={{
                '--lk-control-bg': 'rgba(255, 255, 255, 0.1)',
                '--lk-control-hover-bg': 'rgba(255, 255, 255, 0.2)',
                '--lk-control-active-bg': 'rgba(32, 178, 170, 0.3)',
                '--lk-control-fg': 'white',
                '--lk-control-active-fg': 'white',
                '--lk-button-bg': 'rgba(255, 255, 255, 0.1)',
                '--lk-button-hover-bg': 'rgba(255, 255, 255, 0.2)',
                '--lk-button-fg': 'white',
                '--lk-button-active-fg': 'white',
                '--lk-danger-bg': 'rgb(220, 38, 38)',
                '--lk-danger-hover-bg': 'rgb(185, 28, 28)',
                '--lk-fg': 'white',
                '--lk-bg': 'transparent',
              } as React.CSSProperties}>
                <ControlBar
                  variation={isHost ? "verbose" : "minimal"}
                  controls={{
                    microphone: true,
                    camera: true,
                    chat: false, // We handle chat with our own button
                    screenShare: isHost || roomType === 'individual',
                    leave: false // We handle this with our own button
                  }}
                  saveUserChoices={true}
                />
              </div>
            </div>
          </div>

          {/* Powered by Estuary - Below controls */}
          <div className="bg-estuary-900 px-4 py-2 flex items-center justify-end gap-2 text-white/60 text-sm">
            <span>Powered by</span>
            <EstuaryLogo size="sm" className="text-white/80" />
          </div>
        </div>
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}

// Participants Sidebar with Host Controls
function ParticipantsSidebar({ isHost, onClose }: { isHost: boolean; onClose: () => void }) {
  const participants = useParticipants();
  const room = useRoomContext();

  const handleMuteParticipant = async (participant: RemoteParticipant, mute: boolean) => {
    if (!isHost) return;

    try {
      // Request participant to mute/unmute their audio
      // Note: This sends a request - participant's client must handle it
      const audioTracks = participant.audioTrackPublications;
      audioTracks.forEach(pub => {
        if (pub.track) {
          // For server-side muting, you'd need to use LiveKit server API
          // This is a client-side approach using data messages
          room.localParticipant.publishData(
            new TextEncoder().encode(JSON.stringify({
              type: mute ? 'mute_request' : 'unmute_request',
              participantId: participant.identity
            })),
            { reliable: true }
          );
        }
      });
      console.log(`Sent ${mute ? 'mute' : 'unmute'} request to ${participant.identity}`);
    } catch (error) {
      console.error('Failed to mute participant:', error);
    }
  };

  const handleDisableVideo = async (participant: RemoteParticipant, disable: boolean) => {
    if (!isHost) return;

    try {
      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({
          type: disable ? 'disable_video_request' : 'enable_video_request',
          participantId: participant.identity
        })),
        { reliable: true }
      );
      console.log(`Sent ${disable ? 'disable' : 'enable'} video request to ${participant.identity}`);
    } catch (error) {
      console.error('Failed to toggle participant video:', error);
    }
  };

  return (
    <div className="w-80 bg-estuary-900/95 backdrop-blur-md border-l border-wellness-700/30 flex flex-col">
      <div className="p-4 border-b border-wellness-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-wellness-200" />
          <h3 className="text-white font-medium">Participants ({participants.length})</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-wellness-200 hover:text-white hover:bg-wellness-700/30"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {participants.map((participant) => {
          const isLocal = participant.isLocal;
          const isParticipantHost = participant.permissions?.canPublish && participant.permissions?.canPublishData;
          const hasAudio = participant.isMicrophoneEnabled;
          const hasVideo = participant.isCameraEnabled;

          return (
            <div
              key={participant.identity}
              className="flex items-center justify-between p-3 rounded-lg bg-wellness-800/30 border border-wellness-700/30"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border border-wellness-600">
                  <AvatarFallback className="bg-wellness-700 text-white text-xs">
                    {participant.name?.split(' ').map(n => n[0]).join('') || participant.identity.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-white">
                    {participant.name || participant.identity}
                    {isLocal && <span className="text-wellness-300 ml-1">(You)</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    {isParticipantHost && (
                      <Badge variant="secondary" className="text-xs bg-wellness-700/50 text-wellness-100">
                        Host
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Audio/Video status indicators */}
                <div className={cn(
                  "p-1.5 rounded",
                  hasAudio ? "text-green-400" : "text-red-400 bg-red-500/20"
                )}>
                  {hasAudio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </div>
                <div className={cn(
                  "p-1.5 rounded",
                  hasVideo ? "text-green-400" : "text-red-400 bg-red-500/20"
                )}>
                  {hasVideo ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </div>

                {/* Host controls for remote participants */}
                {isHost && !isLocal && participant instanceof RemoteParticipant && (
                  <div className="flex items-center gap-1 ml-2 pl-2 border-l border-wellness-700/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMuteParticipant(participant, hasAudio)}
                      className="h-7 w-7 p-0 text-wellness-300 hover:text-white hover:bg-wellness-700/50"
                      title={hasAudio ? "Request mute" : "Request unmute"}
                    >
                      {hasAudio ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisableVideo(participant, hasVideo)}
                      className="h-7 w-7 p-0 text-wellness-300 hover:text-white hover:bg-wellness-700/50"
                      title={hasVideo ? "Request disable video" : "Request enable video"}
                    >
                      {hasVideo ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {participants.length === 0 && (
          <div className="text-center text-wellness-300 py-8">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No participants yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Session Layout (1-on-1)
function IndividualLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Separate screen share and camera tracks
  const screenShareTrack = tracks.find(track => track.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter(track => track.source === Track.Source.Camera);

  if (screenShareTrack) {
    // Screen share layout
    return (
      <div className="relative h-full p-4">
        {/* Main screen share */}
        <div className="h-full rounded-lg overflow-hidden shadow-2xl">
          <ParticipantTile trackRef={screenShareTrack} />
        </div>

        {/* Small camera feeds */}
        <div className="absolute bottom-8 right-8 flex gap-3">
          {cameraTracks.map((track) => (
            <div key={track.participant.identity} className="w-48 h-36 rounded-lg overflow-hidden shadow-xl ring-2 ring-wellness-600/50">
              <ParticipantTile trackRef={track} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Regular 1-on-1 layout
  return (
    <div className="h-full flex gap-4 p-6">
      {tracks.map((track) => (
        <div key={track.participant.identity + track.source} className="flex-1 rounded-xl overflow-hidden shadow-2xl ring-1 ring-wellness-700/30">
          <ParticipantTile trackRef={track} />
        </div>
      ))}
    </div>
  );
}

// Group Session Layout (Grid)
function GroupLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const screenShareTrack = tracks.find(track => track.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter(track => track.source === Track.Source.Camera);

  if (screenShareTrack) {
    // Screen share + grid layout
    return (
      <div className="h-full flex flex-col p-4 gap-4">
        {/* Main screen share */}
        <div className="flex-1 rounded-lg overflow-hidden shadow-2xl">
          <ParticipantTile trackRef={screenShareTrack} />
        </div>

        {/* Camera grid at bottom */}
        <div className="h-32 flex gap-3 overflow-x-auto">
          {cameraTracks.map((track) => (
            <div key={track.participant.identity} className="h-full aspect-video rounded-lg overflow-hidden shadow-xl ring-2 ring-wellness-600/50 flex-shrink-0">
              <ParticipantTile trackRef={track} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      <GridLayout tracks={cameraTracks}>
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}

// Webinar Layout (Speaker + Viewers)
function WebinarLayout({ isHost }: { isHost: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const screenShareTrack = tracks.find(track => track.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter(track => track.source === Track.Source.Camera);

  const hostTrack = cameraTracks.find(track => track.participant.permissions?.canPublish);
  const viewerTracks = cameraTracks.filter(track => !track.participant.permissions?.canPublish);

  // If there's a screen share, show it prominently
  if (screenShareTrack) {
    return (
      <div className="h-full flex flex-col p-4 gap-4">
        {/* Main screen share */}
        <div className="flex-1 rounded-lg overflow-hidden shadow-2xl">
          <ParticipantTile trackRef={screenShareTrack} />
        </div>

        {/* All cameras at bottom */}
        <div className="h-32 flex gap-3 overflow-x-auto">
          {cameraTracks.map((track) => (
            <div key={track.participant.identity} className="h-full aspect-video rounded-lg overflow-hidden shadow-xl ring-2 ring-wellness-600/50 flex-shrink-0">
              <ParticipantTile trackRef={track} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Main speaker area */}
      <div className="flex-1 p-6">
        {hostTrack ? (
          <div className="h-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-wellness-700/30">
            <ParticipantTile trackRef={hostTrack} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-wellness-200">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Waiting for host to join...</p>
            </div>
          </div>
        )}
      </div>

      {/* Viewers sidebar */}
      {viewerTracks.length > 0 && (
        <div className="w-64 bg-estuary-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4 text-wellness-200">
            <Users className="h-4 w-4" />
            <h3 className="text-sm font-medium">
              Participants ({viewerTracks.length})
            </h3>
          </div>
          <div className="space-y-3">
            {viewerTracks.map((track) => (
              <div key={track.participant.identity} className="aspect-video rounded-lg overflow-hidden shadow-lg">
                <ParticipantTile trackRef={track} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Leave button component
function LeaveButton({ onLeaveRoom }: { onLeaveRoom: () => void }) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const [isLeaving, setIsLeaving] = React.useState(false);

  const handleLeave = async () => {
    if (isLeaving) return;

    setIsLeaving(true);

    try {
      if (connectionState === ConnectionState.Connected) {
        console.log('Disconnecting from LiveKit room...');
        await room.disconnect(true);
        console.log('Successfully disconnected from LiveKit room');
      }
    } catch (error) {
      console.error('Error disconnecting from room:', error);
    } finally {
      onLeaveRoom();
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleLeave}
      disabled={isLeaving}
      size="sm"
      className="bg-red-600 hover:bg-red-700 border-red-500"
    >
      {isLeaving ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Leaving...
        </>
      ) : (
        <>
          <PhoneOff className="h-4 w-4 mr-2" />
          Leave
        </>
      )}
    </Button>
  );
}
