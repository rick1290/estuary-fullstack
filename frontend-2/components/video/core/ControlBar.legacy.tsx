"use client";

import React from 'react';
import {
  useLocalParticipant,
  useMaybeLayoutContext,
  useRoomContext,
  useParticipants
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Button } from '@/components/ui/button';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  Users,
  Settings,
  Phone,
  PhoneOff,
  Radio,
  RadioOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ControlBarProps {
  isHost: boolean;
  onLeave: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  isRecording?: boolean;
}

export function ControlBar({
  isHost,
  onLeave,
  onStartRecording,
  onStopRecording,
  isRecording = false
}: ControlBarProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const layoutContext = useMaybeLayoutContext();

  const [isVideoEnabled, setIsVideoEnabled] = React.useState(
    localParticipant.isCameraEnabled
  );
  const [isAudioEnabled, setIsAudioEnabled] = React.useState(
    localParticipant.isMicrophoneEnabled
  );
  const [isScreenShareEnabled, setIsScreenShareEnabled] = React.useState(
    localParticipant.isScreenShareEnabled
  );

  const toggleVideo = async () => {
    try {
      await localParticipant.setCameraEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  };

  const toggleAudio = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    } catch (error) {
      console.error('Failed to toggle audio:', error);
    }
  };

  const toggleScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
      setIsScreenShareEnabled(!isScreenShareEnabled);
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
    }
  };

  const handleRecordingToggle = () => {
    if (isRecording) {
      onStopRecording?.();
    } else {
      onStartRecording?.();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Audio Toggle */}
      <Button
        variant="secondary"
        size="icon"
        onClick={toggleAudio}
        className={cn(
          "rounded-full",
          !isAudioEnabled && "bg-red-500 hover:bg-red-600 text-white"
        )}
        title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </Button>

      {/* Video Toggle */}
      <Button
        variant="secondary"
        size="icon"
        onClick={toggleVideo}
        className={cn(
          "rounded-full",
          !isVideoEnabled && "bg-red-500 hover:bg-red-600 text-white"
        )}
        title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </Button>

      {/* Screen Share */}
      <Button
        variant="secondary"
        size="icon"
        onClick={toggleScreenShare}
        className={cn(
          "rounded-full",
          isScreenShareEnabled && "bg-blue-500 hover:bg-blue-600 text-white"
        )}
        title={isScreenShareEnabled ? "Stop sharing screen" : "Share screen"}
      >
        {isScreenShareEnabled ? <ScreenShareOff className="h-4 w-4" /> : <ScreenShare className="h-4 w-4" />}
      </Button>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-600 mx-2" />

      {/* Recording (Host Only) */}
      {isHost && onStartRecording && (
        <Button
          variant="secondary"
          size="icon"
          onClick={handleRecordingToggle}
          className={cn(
            "rounded-full",
            isRecording && "bg-red-500 hover:bg-red-600 text-white animate-pulse"
          )}
          title={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <RadioOff className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
        </Button>
      )}

      {/* Participants Count */}
      <Button
        variant="secondary"
        size="sm"
        className="rounded-full"
        title={`${participants.length} participants`}
      >
        <Users className="h-4 w-4 mr-1" />
        {participants.length}
      </Button>

      {/* Settings */}
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full"
        title="Settings"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-600 mx-2" />

      {/* Leave Call */}
      <Button
        variant="destructive"
        size="sm"
        onClick={onLeave}
        className="rounded-full"
        title="Leave session"
      >
        <PhoneOff className="h-4 w-4 mr-2" />
        Leave
      </Button>
    </div>
  );
}