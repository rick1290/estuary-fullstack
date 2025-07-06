"use client";

import React from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ConnectionStateToast
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';

interface VideoConferenceRoomProps {
  token: string;
  serverUrl?: string;
  roomType: 'individual' | 'group' | 'webinar';
  isHost: boolean;
  bookingDetails?: any;
  sessionDetails?: any;
  onLeaveRoom: () => void;
  onError?: (error: Error) => void;
}

export function VideoConferenceRoom({
  token,
  serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com',
  roomType,
  isHost,
  bookingDetails,
  sessionDetails,
  onLeaveRoom,
  onError
}: VideoConferenceRoomProps) {
  const roomOptions = {
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
      videoCodec: 'vp8' as const,
      screenShareEncoding: {
        maxBitrate: 1_500_000,
        maxFramerate: 30,
      }
    }
  };

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      options={roomOptions}
      connect={true}
      onDisconnected={(reason) => {
        console.log('Disconnected:', reason);
        onLeaveRoom();
      }}
      onError={(error) => {
        console.error('Room error:', error);
        onError?.(error);
      }}
    >
      <div className="h-screen flex flex-col bg-gray-900">
        {/* Room Audio - Important for audio to work */}
        <RoomAudioRenderer />
        
        {/* Connection State Notifications */}
        <ConnectionStateToast />
        
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
          
          <Button
            variant="destructive"
            onClick={onLeaveRoom}
            size="sm"
          >
            Leave Session
          </Button>
        </div>
        
        {/* VideoConference Component */}
        <div className="flex-1 relative">
          <VideoConference
            chatMessageFormatter={(message) => {
              // Custom message formatting
              return `${message.from?.identity}: ${message.message}`;
            }}
          />
        </div>
      </div>
    </LiveKitRoom>
  );
}