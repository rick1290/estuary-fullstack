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
  DisconnectButton
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import '@livekit/components-styles';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      options={roomOptions}
      connect={true}
      onConnected={() => {
        console.log('Connected to LiveKit room successfully!');
        console.log('Server URL:', serverUrl);
        console.log('Room options:', roomOptions);
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
        <div className="h-screen flex bg-gray-900">
          {/* Room Audio - Important for audio to work */}
          <RoomAudioRenderer />
          
          {/* Connection State Notifications */}
          <ConnectionStateToast />
          
          {/* Main Video Section */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 p-4 flex items-center justify-between">
              <div className="text-white">
                <h2 className="text-lg font-semibold">
                  {bookingDetails?.service?.title || sessionDetails?.service?.title || 'Video Session'}
                </h2>
                <p className="text-sm text-gray-300">
                  {isHost ? 'Host' : 'Participant'} • {roomType === 'individual' ? '1-on-1' : 'Group'} Session
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Chat Toggle */}
                {roomType !== 'individual' && (
                  <Button
                    variant={showChat ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setShowChat(!showChat)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                )}
                
                {/* Settings Toggle */}
                <Button
                  variant={showSettings ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                
                <LeaveButton onLeaveRoom={onLeaveRoom} />
              </div>
            </div>
            
            {/* Main Video Area */}
            <div className="flex-1 relative overflow-hidden">
              {roomType === 'individual' ? (
                <IndividualLayout />
              ) : roomType === 'webinar' ? (
                <WebinarLayout isHost={isHost} />
              ) : (
                <GroupLayout />
              )}
            </div>
            
            {/* Control Bar */}
            <div className="bg-gray-800 p-4">
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
          
          {/* Chat Sidebar */}
          {showChat && roomType !== 'individual' && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-white font-medium">Chat</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Chat style={{ height: '100%', backgroundColor: 'transparent' }} />
              </div>
            </div>
          )}
          
          {/* Settings Sidebar */}
          {showSettings && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-white font-medium">Settings</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 p-4 space-y-6">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Camera</label>
                  <MediaDeviceMenu kind="videoinput" />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Microphone</label>
                  <MediaDeviceMenu kind="audioinput" />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Speaker</label>
                  <MediaDeviceMenu kind="audiooutput" />
                </div>
              </div>
            </div>
          )}
        </div>
      </LayoutContextProvider>
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
      <div className="relative h-full">
        {/* Main screen share */}
        <div className="h-full">
          <ParticipantTile trackRef={screenShareTrack} />
        </div>
        
        {/* Small camera feeds */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          {cameraTrack && (
            <div className="w-48 h-36 rounded-lg overflow-hidden shadow-lg">
              <ParticipantTile trackRef={cameraTrack} />
            </div>
          )}
          {otherCameraTrack && (
            <div className="w-48 h-36 rounded-lg overflow-hidden shadow-lg">
              <ParticipantTile trackRef={otherCameraTrack} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular 1-on-1 layout
  return (
    <div className="h-full flex gap-4 p-4">
      {tracks.map((track) => (
        <div key={track.participant.identity} className="flex-1 rounded-lg overflow-hidden">
          <ParticipantTile trackRef={track} />
        </div>
      ))}
    </div>
  );
}

// Group Session Layout (Grid)
function GroupLayout() {
  return (
    <div className="h-full p-4">
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
      <div className="flex-1 p-4">
        {hostTrack ? (
          <div className="h-full rounded-lg overflow-hidden">
            <ParticipantTile trackRef={hostTrack} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Waiting for host to join...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Viewers sidebar */}
      {viewerTracks.length > 0 && (
        <div className="w-64 bg-gray-800 p-2 overflow-y-auto">
          <h3 className="text-white text-sm font-medium mb-2 px-2">
            Participants ({viewerTracks.length})
          </h3>
          <div className="space-y-2">
            {viewerTracks.map((track) => (
              <div key={track.participant.identity} className="aspect-video rounded overflow-hidden">
                <ParticipantTile trackRef={track} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Leave button component that properly disconnects from LiveKit
function LeaveButton({ onLeaveRoom }: { onLeaveRoom: () => void }) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const [isLeaving, setIsLeaving] = React.useState(false);
  
  const handleLeave = async () => {
    if (isLeaving) return; // Prevent multiple clicks
    
    setIsLeaving(true);
    
    try {
      // Only disconnect if we're actually connected
      if (connectionState === ConnectionState.Connected) {
        console.log('Disconnecting from LiveKit room...');
        await room.disconnect(true); // true = stop tracks immediately
        console.log('Successfully disconnected from LiveKit room');
      }
    } catch (error) {
      console.error('Error disconnecting from room:', error);
    } finally {
      // Always call the leave handler to navigate away
      onLeaveRoom();
    }
  };
  
  return (
    <Button
      variant="destructive"
      onClick={handleLeave}
      disabled={isLeaving}
      size="sm"
    >
      {isLeaving ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Leaving...
        </>
      ) : (
        'Leave Session'
      )}
    </Button>
  );
}