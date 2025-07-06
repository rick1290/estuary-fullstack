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
  VideoConference,
  formatChatMessageLinks
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import '@livekit/components-styles';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Loader2, MessageSquare, Settings, X, Users, 
  PhoneOff, Maximize2, Minimize2, Clock 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface VideoRoomProps {
  token: string;
  serverUrl?: string;
  roomType: 'individual' | 'group' | 'webinar';
  isHost: boolean;
  bookingDetails?: any;
  sessionDetails?: any;
  onLeaveRoom: () => void;
  onError?: (error: Error) => void;
}

export function VideoRoom({
  token,
  serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com',
  roomType,
  isHost,
  bookingDetails,
  sessionDetails,
  onLeaveRoom,
  onError
}: VideoRoomProps) {
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionDuration, setSessionDuration] = useState<number>(0);

  // Get session info
  const sessionInfo = bookingDetails || sessionDetails;
  const practitioner = sessionInfo?.practitioner;

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

  // For individual sessions, use the enhanced UI
  if (roomType === 'individual') {
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
            
            {/* Header */}
            <div className="bg-estuary-900/80 backdrop-blur-md border-b border-wellness-700/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-white">
                    <h2 className="text-lg font-semibold">
                      {sessionInfo?.service?.name || 'Video Session'}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-wellness-200">
                      <Badge variant="secondary" className="bg-wellness-700/30 text-wellness-100 border-wellness-600">
                        {isHost ? 'Host' : 'Participant'}
                      </Badge>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(sessionDuration)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {practitioner && !isHost && (
                    <div className="flex items-center gap-3 pl-6 border-l border-wellness-700/30">
                      <Avatar className="h-10 w-10 border-2 border-wellness-600">
                        <AvatarImage src={practitioner.profile_photo} alt={practitioner.name} />
                        <AvatarFallback className="bg-wellness-700 text-white">
                          {practitioner.name?.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-white">{practitioner.name}</p>
                        {practitioner.specialization && (
                          <p className="text-xs text-wellness-200">{practitioner.specialization}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Chat Toggle */}
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
            <div className="flex-1 flex">
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
          </div>
        </LayoutContextProvider>
      </LiveKitRoom>
    );
  }

  // For group/webinar sessions, use the VideoConference component
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
      <VideoConference
        chatMessageFormatter={formatChatMessageLinks}
        SettingsComponent={() => (
          <div className="space-y-6 p-4">
            <h3 className="text-lg font-medium">Settings</h3>
            <div>
              <label className="text-sm font-medium mb-2 block">Camera</label>
              <MediaDeviceMenu kind="videoinput" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Microphone</label>
              <MediaDeviceMenu kind="audioinput" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Speaker</label>
              <MediaDeviceMenu kind="audiooutput" />
            </div>
          </div>
        )}
      />
    </LiveKitRoom>
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
  const cameraTrack = tracks.find(track => track.source === Track.Source.Camera && track.participant.identity !== screenShareTrack?.participant.identity);
  const otherCameraTrack = tracks.find(track => 
    track.source === Track.Source.Camera && 
    track.participant.identity !== cameraTrack?.participant.identity
  );

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
          {cameraTrack && (
            <div className="w-48 h-36 rounded-lg overflow-hidden shadow-xl ring-2 ring-wellness-600/50">
              <ParticipantTile trackRef={cameraTrack} />
            </div>
          )}
          {otherCameraTrack && (
            <div className="w-48 h-36 rounded-lg overflow-hidden shadow-xl ring-2 ring-wellness-600/50">
              <ParticipantTile trackRef={otherCameraTrack} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular 1-on-1 layout
  return (
    <div className="h-full flex gap-4 p-6">
      {tracks.map((track) => (
        <div key={track.participant.identity} className="flex-1 rounded-xl overflow-hidden shadow-2xl ring-1 ring-wellness-700/30">
          <ParticipantTile trackRef={track} />
        </div>
      ))}
    </div>
  );
}

// Group Session Layout (Grid)
function GroupLayout() {
  return (
    <div className="h-full p-6">
      <GridLayout tracks={useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])}>
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}

// Webinar Layout (Speaker + Viewers)
function WebinarLayout({ isHost }: { isHost: boolean }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  
  const hostTrack = tracks.find(track => track.participant.permissions?.canPublish);
  const viewerTracks = tracks.filter(track => !track.participant.permissions?.canPublish);

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