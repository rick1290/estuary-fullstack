"use client";

import React, { useEffect, useCallback, useMemo, useState } from 'react';
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
import { Track, ConnectionState, RemoteParticipant, RoomEvent } from 'livekit-client';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2, MessageSquare, Settings, X, Users,
  PhoneOff, Maximize2, Minimize2, Clock,
  Mic, MicOff, Video, VideoOff, Power, Volume2
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
  onEndSession?: () => Promise<void>;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  // Recording props
  isRecording?: boolean;
  onStartRecording?: (options: RecordingOptions) => Promise<void>;
  onStopRecording?: () => Promise<void>;
  // Session settings
  showTimer?: boolean;
}

export function VideoRoom({
  token,
  serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com',
  roomType,
  isHost,
  bookingDetails,
  sessionDetails,
  onLeaveRoom,
  onEndSession,
  onError,
  onConnected,
  isRecording = false,
  onStartRecording,
  onStopRecording,
  showTimer = true
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
        onConnected?.();
      }}
      onDisconnected={(reason) => {
        onLeaveRoom();
      }}
      onError={(error) => {
        console.error('Room error:', error);
        onError?.(error);
      }}
    >
      <LayoutContextProvider>
        <style jsx global>{`
          /* Ensure LiveKit participant tiles fill their containers and round properly */
          .lk-participant-tile {
            border-radius: 16px !important;
            overflow: hidden !important;
            height: 100% !important;
            width: 100% !important;
          }
          .lk-participant-tile video {
            border-radius: 16px !important;
            object-fit: cover !important;
            height: 100% !important;
            width: 100% !important;
          }
          .lk-participant-tile .lk-participant-placeholder {
            border-radius: 16px !important;
            overflow: hidden !important;
            height: 100% !important;
            width: 100% !important;
          }
          .lk-participant-tile .lk-participant-metadata {
            border-radius: 0 0 16px 16px !important;
          }

          /* Control bar device selector dropdowns */
          .lk-control-bar .lk-button-group {
            position: relative !important;
          }
          .lk-control-bar .lk-button-group-menu {
            position: relative !important;
          }
          .lk-control-bar .lk-button-group-menu .lk-device-menu {
            position: absolute !important;
            bottom: 100% !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 50 !important;
            min-width: 200px !important;
            background: white !important;
            border: 1px solid #e5ebe2 !important;
            border-radius: 12px !important;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12) !important;
            padding: 8px !important;
            margin-bottom: 8px !important;
          }
          .lk-control-bar .lk-button-group-menu .lk-device-menu ul {
            list-style: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .lk-control-bar .lk-button-group-menu .lk-device-menu li {
            padding: 8px 12px !important;
            border-radius: 8px !important;
            cursor: pointer !important;
            font-size: 13px !important;
            color: #4a5548 !important;
            transition: background 0.15s ease !important;
          }
          .lk-control-bar .lk-button-group-menu .lk-device-menu li:hover {
            background: rgba(156, 175, 136, 0.15) !important;
          }
          .lk-control-bar .lk-button-group-menu .lk-device-menu li[data-lk-active="true"] {
            background: rgba(156, 175, 136, 0.2) !important;
            font-weight: 500 !important;
          }
          /* Ensure the menu trigger button (dropdown arrow) is visible */
          .lk-control-bar .lk-button-group-menu button {
            background: rgba(156, 175, 136, 0.15) !important;
            border: 1px solid rgba(156, 175, 136, 0.3) !important;
            border-radius: 8px !important;
            padding: 6px !important;
            color: #4a5548 !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .lk-control-bar .lk-button-group-menu button:hover {
            background: rgba(156, 175, 136, 0.25) !important;
          }

          /* Speaker selector styling */
          .lk-speaker-select .lk-device-menu {
            position: static !important;
          }
          .lk-speaker-select .lk-device-menu button {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            font-family: 'DM Sans', sans-serif !important;
            font-size: 13px !important;
            color: #4a5548 !important;
            cursor: pointer !important;
            min-height: 32px !important;
          }
          .lk-speaker-select .lk-device-menu button:hover {
            color: #3d4a38 !important;
          }
          .lk-speaker-select .lk-device-menu ul {
            position: absolute !important;
            bottom: 100% !important;
            right: 0 !important;
            z-index: 50 !important;
            min-width: 220px !important;
            background: white !important;
            border: 1px solid #e5ebe2 !important;
            border-radius: 12px !important;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12) !important;
            padding: 6px !important;
            margin-bottom: 8px !important;
            list-style: none !important;
          }
          .lk-speaker-select .lk-device-menu li {
            padding: 8px 12px !important;
            border-radius: 8px !important;
            cursor: pointer !important;
            font-size: 13px !important;
            color: #4a5548 !important;
            transition: background 0.15s ease !important;
          }
          .lk-speaker-select .lk-device-menu li:hover {
            background: rgba(156, 175, 136, 0.15) !important;
          }
          .lk-speaker-select .lk-device-menu li[data-lk-active="true"] {
            background: rgba(156, 175, 136, 0.2) !important;
            font-weight: 500 !important;
          }

          /* Control bar button touch targets */
          .lk-control-bar button {
            min-height: 44px !important;
            min-width: 44px !important;
          }

          /* Mobile: reduce grid padding in layouts */
          @media (max-width: 639px) {
            .lk-grid-layout {
              gap: 4px !important;
              padding: 4px !important;
            }
          }
        `}</style>
        <div className="h-screen flex flex-col bg-gradient-to-br from-cream-50 via-sage-50/30 to-cream-50" style={{
          '--lk-fg': '#4a5548',
          '--lk-bg': 'transparent',
          '--lk-bg-2': 'rgba(156, 175, 136, 0.08)',
          '--lk-bg-3': 'rgba(156, 175, 136, 0.12)',
          '--lk-border': 'rgba(156, 175, 136, 0.25)',
          '--lk-participant-name-fg': 'white',
          '--lk-participant-name-bg': 'rgba(0, 0, 0, 0.6)',
          '--lk-participant-metadata-fg': 'rgba(255, 255, 255, 0.9)',
          '--lk-participant-tile-border': 'rgba(156, 175, 136, 0.3)',
          '--lk-focus-ring': 'rgba(156, 175, 136, 0.5)',
        } as React.CSSProperties}>
          {/* Room Audio - Important for audio to work */}
          <RoomAudioRenderer />

          {/* Connection State Notifications */}
          <ConnectionStateToast />

          {/* Handle host control messages (mute/unmute requests) */}
          <HostControlHandler />

          {/* Recording Indicator */}
          <RecordingIndicator isRecording={isRecording} />

          {/* Header */}
          <div className="bg-white/80 backdrop-blur-md border-b border-sage-200 px-3 sm:px-6 py-2.5 sm:py-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                {/* Practitioner Avatar - hidden on very small screens */}
                {practitioner && (
                  <Avatar className="h-9 w-9 sm:h-11 sm:w-11 border-2 border-sage-300 ring-2 ring-sage-200/50 hidden xs:flex flex-shrink-0">
                    <AvatarImage src={practitioner.profile_photo} alt={practitioner.name} />
                    <AvatarFallback className="bg-sage-100 text-sage-700">
                      {practitioner.name?.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="min-w-0">
                  <h2 className="text-sm sm:text-lg font-semibold text-olive-900 truncate">
                    {sessionTitle}
                  </h2>
                  <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm text-olive-600 flex-wrap">
                    {practitioner && (
                      <span className="text-olive-700 truncate hidden sm:inline">with {practitioner.name}</span>
                    )}
                    <Badge variant="secondary" className="bg-sage-100 text-sage-700 border-sage-200 text-[10px] sm:text-xs px-1.5 py-0">
                      {isHost ? 'Host' : 'Participant'}
                    </Badge>
                    <Badge variant="outline" className="border-sage-300 text-olive-600 text-[10px] sm:text-xs px-1.5 py-0 hidden sm:inline-flex">
                      {getRoomTypeLabel()}
                    </Badge>
                    {showTimer && (
                      <div className="flex items-center gap-1 text-olive-600">
                        <Clock className="h-3 w-3" />
                        <span className="tabular-nums">{formatDuration(sessionDuration)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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
                      "text-olive-700 border-sage-300 h-9 w-9 sm:h-auto sm:w-auto p-0 sm:px-3 sm:py-1.5",
                      showParticipants ? "bg-sage-100" : "hover:bg-sage-50"
                    )}
                  >
                    <Users className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Participants</span>
                  </Button>
                )}

                {/* Chat Toggle - For group/webinar */}
                {roomType !== 'individual' && (
                  <Button
                    variant={showChat ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowChat(!showChat)}
                    className={cn(
                      "text-olive-700 border-sage-300 h-9 w-9 sm:h-auto sm:w-auto p-0 sm:px-3 sm:py-1.5",
                      showChat ? "bg-sage-100" : "hover:bg-sage-50"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Chat</span>
                  </Button>
                )}

                {/* Settings Toggle — hidden, device selection is in the ControlBar dropdown arrows */}
                <Button
                  variant={showSettings ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    "text-olive-700 border-sage-300 h-9 w-9 sm:h-auto sm:w-auto p-0 sm:px-3 sm:py-1.5 hidden",
                    showSettings ? "bg-sage-100" : "hover:bg-sage-50"
                  )}
                >
                  <Settings className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>

                {/* Fullscreen Toggle - hidden on mobile (not useful) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-olive-700 hover:bg-sage-50 h-9 w-9 p-0 hidden sm:flex items-center justify-center"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>

                {/* Leave Button */}
                <LeaveButton onLeaveRoom={onLeaveRoom} />

                {/* End Session Button - Host Only */}
                {isHost && onEndSession && (
                  <EndSessionButton onEndSession={onEndSession} />
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden relative">
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
              <div className="absolute inset-0 sm:relative sm:inset-auto w-full sm:w-80 bg-white/95 backdrop-blur-md border-l border-sage-200 flex flex-col shadow-lg z-20">
                <div className="p-3 sm:p-4 border-b border-sage-200 flex items-center justify-between bg-sage-50/50">
                  <h3 className="text-olive-900 font-medium">Chat</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChat(false)}
                    className="text-olive-600 hover:text-olive-900 hover:bg-sage-100 h-9 w-9 p-0"
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
                      '--lk-chat-input-bg': 'rgba(156, 175, 136, 0.1)',
                      '--lk-chat-input-border': 'rgba(156, 175, 136, 0.3)',
                      '--lk-chat-message-bg': 'rgba(156, 175, 136, 0.08)',
                      '--lk-chat-text': '#4a5548',
                    } as React.CSSProperties}
                    messageFormatter={formatChatMessageLinks}
                  />
                </div>
              </div>
            )}

            {/* Settings Sidebar */}
            {showSettings && (
              <div className="absolute inset-0 sm:relative sm:inset-auto w-full sm:w-80 bg-white/95 backdrop-blur-md border-l border-sage-200 flex flex-col shadow-lg z-20">
                <div className="p-3 sm:p-4 border-b border-sage-200 flex items-center justify-between bg-sage-50/50">
                  <h3 className="text-olive-900 font-medium">Settings</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(false)}
                    className="text-olive-600 hover:text-olive-900 hover:bg-sage-100 h-9 w-9 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 p-4 space-y-6">
                  <div>
                    <label className="text-olive-900 text-sm font-medium mb-2 block">Camera</label>
                    <div className="lk-device-menu" style={{ '--lk-control-bg': 'rgba(156, 175, 136, 0.15)' } as React.CSSProperties}>
                      <MediaDeviceMenu kind="videoinput" />
                    </div>
                  </div>
                  <div>
                    <label className="text-olive-900 text-sm font-medium mb-2 block">Microphone</label>
                    <div className="lk-device-menu" style={{ '--lk-control-bg': 'rgba(156, 175, 136, 0.15)' } as React.CSSProperties}>
                      <MediaDeviceMenu kind="audioinput" />
                    </div>
                  </div>
                  <div>
                    <label className="text-olive-900 text-sm font-medium mb-2 block">Speaker</label>
                    <div className="lk-device-menu" style={{ '--lk-control-bg': 'rgba(156, 175, 136, 0.15)' } as React.CSSProperties}>
                      <MediaDeviceMenu kind="audiooutput" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Control Bar */}
          <div className="bg-white/80 backdrop-blur-md border-t border-sage-200 p-2.5 sm:p-4 shadow-sm relative overflow-visible">
            <div className="max-w-4xl mx-auto overflow-visible">
              <div className="flex items-center justify-center gap-2">
                <div className="lk-control-bar" style={{
                  '--lk-control-bg': 'rgba(156, 175, 136, 0.15)',
                  '--lk-control-hover-bg': 'rgba(156, 175, 136, 0.25)',
                  '--lk-control-active-bg': 'rgba(156, 175, 136, 0.35)',
                  '--lk-control-fg': '#4a5548',
                  '--lk-control-active-fg': '#3d4a38',
                  '--lk-button-bg': 'rgba(156, 175, 136, 0.15)',
                  '--lk-button-hover-bg': 'rgba(156, 175, 136, 0.25)',
                  '--lk-button-fg': '#4a5548',
                  '--lk-button-active-fg': '#3d4a38',
                  '--lk-danger-bg': 'rgb(220, 38, 38)',
                  '--lk-danger-hover-bg': 'rgb(185, 28, 28)',
                  '--lk-fg': '#4a5548',
                  '--lk-bg': 'transparent',
                } as React.CSSProperties}>
                  <ControlBar
                    variation={isHost ? "verbose" : "minimal"}
                    controls={{
                      microphone: true,
                      camera: true,
                      chat: false,
                      screenShare: isHost || roomType === 'individual',
                      leave: false
                    }}
                    saveUserChoices={true}
                  />
                </div>

                {/* Speaker Selector */}
                <div className="relative flex items-center">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sage-100/50 hover:bg-sage-100 transition-colors">
                    <Volume2 className="h-4 w-4 text-olive-600 shrink-0" />
                    <div className="lk-speaker-select">
                      <MediaDeviceMenu kind="audiooutput" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Powered by Estuary - Below controls */}
          <div className="bg-sage-50/50 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-end gap-2 text-olive-600 text-xs sm:text-sm border-t border-sage-100">
            <span>Powered by</span>
            <EstuaryLogo size="sm" className="text-sage-700" />
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
    } catch (error) {
      console.error('Failed to toggle participant video:', error);
    }
  };

  return (
    <div className="absolute inset-0 sm:relative sm:inset-auto w-full sm:w-80 bg-white/95 backdrop-blur-md border-l border-sage-200 flex flex-col shadow-lg z-20">
      <div className="p-3 sm:p-4 border-b border-sage-200 flex items-center justify-between bg-sage-50/50">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-sage-600" />
          <h3 className="text-olive-900 font-medium">Participants ({participants.length})</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-olive-600 hover:text-olive-900 hover:bg-sage-100 h-9 w-9 p-0"
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
              className="flex items-center justify-between p-3 rounded-lg bg-sage-50 border border-sage-200"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border border-sage-300">
                  <AvatarFallback className="bg-sage-100 text-sage-700 text-xs">
                    {participant.name?.split(' ').map(n => n[0]).join('') || participant.identity.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-olive-900">
                    {participant.name || participant.identity}
                    {isLocal && <span className="text-olive-500 ml-1">(You)</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    {isParticipantHost && (
                      <Badge variant="secondary" className="text-xs bg-sage-100 text-sage-700">
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
                  hasAudio ? "text-green-600" : "text-red-500 bg-red-50"
                )}>
                  {hasAudio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </div>
                <div className={cn(
                  "p-1.5 rounded",
                  hasVideo ? "text-green-600" : "text-red-500 bg-red-50"
                )}>
                  {hasVideo ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </div>

                {/* Host controls for remote participants */}
                {isHost && !isLocal && participant instanceof RemoteParticipant && (
                  <div className="flex items-center gap-1 ml-2 pl-2 border-l border-sage-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMuteParticipant(participant, hasAudio)}
                      className="h-9 w-9 p-0 text-olive-500 hover:text-olive-900 hover:bg-sage-100"
                      title={hasAudio ? "Request mute" : "Request unmute"}
                    >
                      {hasAudio ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisableVideo(participant, hasVideo)}
                      className="h-9 w-9 p-0 text-olive-500 hover:text-olive-900 hover:bg-sage-100"
                      title={hasVideo ? "Request disable video" : "Request enable video"}
                    >
                      {hasVideo ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {participants.length === 0 && (
          <div className="text-center text-olive-500 py-8">
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
      <div className="relative h-full p-2 sm:p-4">
        {/* Main screen share */}
        <div className="h-full rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-sage-200">
          <ParticipantTile trackRef={screenShareTrack} />
        </div>

        {/* Small camera feeds */}
        <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 flex gap-2 sm:gap-3">
          {cameraTracks.map((track) => (
            <div key={track.participant.identity} className="w-28 h-20 sm:w-48 sm:h-36 rounded-lg sm:rounded-xl overflow-hidden shadow-xl ring-2 ring-sage-300/50 border border-sage-200">
              <ParticipantTile trackRef={track} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Regular 1-on-1 layout
  return (
    <div className="h-full flex flex-col sm:flex-row gap-2 sm:gap-4 p-2 sm:p-6">
      {tracks.map((track) => (
        <div key={track.participant.identity + track.source} className="flex-1 h-full rounded-2xl overflow-hidden shadow-xl border border-sage-200">
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
      <div className="h-full flex flex-col p-2 sm:p-4 gap-2 sm:gap-4">
        {/* Main screen share */}
        <div className="flex-1 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-sage-200">
          <ParticipantTile trackRef={screenShareTrack} />
        </div>

        {/* Camera grid at bottom */}
        <div className="h-24 sm:h-32 flex gap-2 sm:gap-3 overflow-x-auto">
          {cameraTracks.map((track) => (
            <div key={track.participant.identity} className="h-full aspect-video rounded-lg sm:rounded-xl overflow-hidden shadow-xl ring-2 ring-sage-300/50 border border-sage-200 flex-shrink-0">
              <ParticipantTile trackRef={track} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-2 sm:p-6">
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
      <div className="h-full flex flex-col p-2 sm:p-4 gap-2 sm:gap-4">
        {/* Main screen share */}
        <div className="flex-1 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-sage-200">
          <ParticipantTile trackRef={screenShareTrack} />
        </div>

        {/* All cameras at bottom */}
        <div className="h-24 sm:h-32 flex gap-2 sm:gap-3 overflow-x-auto">
          {cameraTracks.map((track) => (
            <div key={track.participant.identity} className="h-full aspect-video rounded-lg sm:rounded-xl overflow-hidden shadow-xl ring-2 ring-sage-300/50 border border-sage-200 flex-shrink-0">
              <ParticipantTile trackRef={track} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col sm:flex-row">
      {/* Main speaker area */}
      <div className="flex-1 p-2 sm:p-6">
        {hostTrack ? (
          <div className="h-full rounded-2xl overflow-hidden shadow-xl border border-sage-200">
            <ParticipantTile trackRef={hostTrack} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-olive-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-sage-600" />
              <p>Waiting for host to join...</p>
            </div>
          </div>
        )}
      </div>

      {/* Viewers sidebar - horizontal scroll on mobile, vertical sidebar on desktop */}
      {viewerTracks.length > 0 && (
        <div className="w-full sm:w-64 bg-white/50 backdrop-blur-sm border-t sm:border-t-0 sm:border-l border-sage-200 p-2 sm:p-4 overflow-x-auto sm:overflow-y-auto flex sm:flex-col gap-2 sm:gap-0">
          <div className="flex items-center gap-2 mb-4 text-olive-700">
            <Users className="h-4 w-4" />
            <h3 className="text-sm font-medium">
              Participants ({viewerTracks.length})
            </h3>
          </div>
          <div className="space-y-3">
            {viewerTracks.map((track) => (
              <div key={track.participant.identity} className="aspect-video rounded-xl overflow-hidden shadow-lg border border-sage-200">
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
        await room.disconnect(true);
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
      className="bg-red-600 hover:bg-red-700 border-red-500 h-9 min-w-[44px] px-2 sm:px-3"
    >
      {isLeaving ? (
        <>
          <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
          <span className="hidden sm:inline">Leaving...</span>
        </>
      ) : (
        <>
          <PhoneOff className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Leave</span>
        </>
      )}
    </Button>
  );
}

// End Session button component - Host only
function EndSessionButton({ onEndSession }: { onEndSession: () => Promise<void> }) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const [isEnding, setIsEnding] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handleEndSession = async () => {
    if (isEnding) return;

    setIsEnding(true);

    try {
      // Notify all participants to disconnect before calling the API
      if (connectionState === ConnectionState.Connected) {
        try {
          room.localParticipant.publishData(
            new TextEncoder().encode(JSON.stringify({ type: 'session_ended' })),
            { reliable: true }
          );
          // Small delay to let the message propagate
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          console.warn('Failed to send session_ended message:', e);
        }
      }

      // Call the end session API
      await onEndSession();

      // Disconnect from the room
      if (connectionState === ConnectionState.Connected) {
        await room.disconnect(true);
      }
    } catch (error) {
      console.error('Error ending session:', error);
      setIsEnding(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-olive-700">End for everyone?</span>
        <Button
          variant="destructive"
          onClick={handleEndSession}
          disabled={isEnding}
          size="sm"
          className="bg-red-700 hover:bg-red-800"
        >
          {isEnding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Ending...
            </>
          ) : (
            'Yes, End'
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setShowConfirm(false)}
          size="sm"
          className="text-olive-600 hover:text-olive-800"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => setShowConfirm(true)}
      size="sm"
      className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 h-9 min-w-[44px] px-2 sm:px-3"
    >
      <Power className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">End Session</span>
    </Button>
  );
}

// Handles incoming data channel messages from host (mute/unmute, session ended)
function HostControlHandler() {
  const room = useRoomContext();

  useEffect(() => {
    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(payload));
        const localIdentity = room.localParticipant.identity;

        // session_ended is broadcast to all participants (no participantId filter)
        if (message.type === 'session_ended') {
          room.disconnect(true);
          return;
        }

        // Only act on messages targeted at this participant
        if (message.participantId !== localIdentity) return;

        switch (message.type) {
          case 'mute_request':
            room.localParticipant.setMicrophoneEnabled(false);
            break;
          case 'unmute_request':
            room.localParticipant.setMicrophoneEnabled(true);
            break;
          case 'disable_video_request':
            room.localParticipant.setCameraEnabled(false);
            break;
          case 'enable_video_request':
            room.localParticipant.setCameraEnabled(true);
            break;
        }
      } catch {
        // Ignore non-JSON data messages (e.g. chat)
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  return null;
}
