"use client";

import React from 'react';
import { Participant, Track } from 'livekit-client';
import { ParticipantTile, TrackRefContext } from '@livekit/components-react';
import { cn } from '@/lib/utils';

interface ParticipantGridProps {
  participants: Participant[];
  maxColumns?: number;
  className?: string;
}

export function ParticipantGrid({ 
  participants, 
  maxColumns = 4,
  className 
}: ParticipantGridProps) {
  const gridColumns = Math.min(
    participants.length === 1 ? 1 : 
    participants.length === 2 ? 2 : 
    Math.ceil(Math.sqrt(participants.length)), 
    maxColumns
  );

  return (
    <div 
      className={cn(
        "h-full w-full grid gap-2 p-2",
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
        gridAutoRows: '1fr'
      }}
    >
      {participants.map((participant) => (
        <ParticipantItem key={participant.identity} participant={participant} />
      ))}
    </div>
  );
}

interface ParticipantItemProps {
  participant: Participant;
}

function ParticipantItem({ participant }: ParticipantItemProps) {
  const videoTrack = participant.getTrack(Track.Source.Camera);
  const audioTrack = participant.getTrack(Track.Source.Microphone);

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-800">
      <TrackRefContext.Provider value={{ participant, source: Track.Source.Camera }}>
        <ParticipantTile 
          participant={participant}
          source={Track.Source.Camera}
          onParticipantClick={() => {
            console.log('Participant clicked:', participant.identity);
          }}
        />
      </TrackRefContext.Provider>
      
      {/* Participant Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium truncate">
            {participant.name || participant.identity}
          </span>
          <div className="flex items-center gap-1">
            {!audioTrack?.isMuted && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}