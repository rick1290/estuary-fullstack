"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
  email: string;
  status: 'waiting' | 'admitted' | 'rejected';
  joinedAt: Date;
}

interface WaitingRoomProps {
  sessionDetails?: any;
  participants: Participant[];
  isHost: boolean;
  onAdmitParticipant?: (participantId: string) => void;
  onRejectParticipant?: (participantId: string) => void;
  onAdmitAll?: () => void;
  onStartSession?: () => void;
  sessionStarted?: boolean;
}

export function WaitingRoom({
  sessionDetails,
  participants,
  isHost,
  onAdmitParticipant,
  onRejectParticipant,
  onAdmitAll,
  onStartSession,
  sessionStarted = false
}: WaitingRoomProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const waitingParticipants = participants.filter(p => p.status === 'waiting');
  const admittedParticipants = participants.filter(p => p.status === 'admitted');

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate time until session start
  const getTimeUntilStart = () => {
    if (!sessionDetails?.start_time) return null;
    const startTime = new Date(sessionDetails.start_time);
    const diff = startTime.getTime() - currentTime.getTime();
    if (diff <= 0) return 'Starting now';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isHost) {
    // Participant waiting view
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>{sessionDetails?.service?.title || 'Group Session'}</CardTitle>
            <CardDescription>
              with {sessionDetails?.service?.practitioner?.display_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-sage-600" />
              <p className="text-lg font-medium mb-2">You're in the waiting room</p>
              <p className="text-sm text-gray-600">
                The host will let you in soon
              </p>
            </div>
            
            {getTimeUntilStart() && (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <Clock className="h-5 w-5 mx-auto mb-2 text-gray-500" />
                <p className="text-sm text-gray-600">Session starts in</p>
                <p className="text-2xl font-bold text-gray-900">{getTimeUntilStart()}</p>
              </div>
            )}
            
            <Alert>
              <AlertDescription>
                Please ensure your camera and microphone are ready. You'll be admitted shortly.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Host view
  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              {sessionDetails?.service?.title || 'Group Session'} - Waiting Room
            </h1>
            <div className="flex items-center gap-4 text-gray-300">
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {participants.length} Total
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-yellow-600">
                <Clock className="h-3 w-3" />
                {waitingParticipants.length} Waiting
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-green-600">
                <CheckCircle className="h-3 w-3" />
                {admittedParticipants.length} Admitted
              </Badge>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Button
              onClick={onAdmitAll}
              disabled={waitingParticipants.length === 0}
              variant="secondary"
            >
              Admit All ({waitingParticipants.length})
            </Button>
            <Button
              onClick={onStartSession}
              disabled={admittedParticipants.length === 0 || sessionStarted}
              className="bg-sage-600 hover:bg-sage-700"
            >
              {sessionStarted ? 'Session Started' : 'Start Session'}
            </Button>
          </div>
          
          {/* Participants Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Waiting List */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Waiting Room</CardTitle>
                <CardDescription className="text-gray-400">
                  Participants waiting to join
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {waitingParticipants.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No participants waiting
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {waitingParticipants.map((participant) => (
                        <ParticipantItem
                          key={participant.id}
                          participant={participant}
                          onAdmit={() => onAdmitParticipant?.(participant.id)}
                          onReject={() => onRejectParticipant?.(participant.id)}
                          showActions
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
            
            {/* Admitted List */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Admitted</CardTitle>
                <CardDescription className="text-gray-400">
                  Participants ready to join
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {admittedParticipants.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No participants admitted yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {admittedParticipants.map((participant) => (
                        <ParticipantItem
                          key={participant.id}
                          participant={participant}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Session Info</h2>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400">Start Time</p>
            <p className="text-white">
              {sessionDetails?.start_time 
                ? new Date(sessionDetails.start_time).toLocaleTimeString()
                : 'Not set'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-400">Duration</p>
            <p className="text-white">{sessionDetails?.duration_minutes || 60} minutes</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-400">Max Participants</p>
            <p className="text-white">{sessionDetails?.max_participants || 20}</p>
          </div>
        </div>
        
        {getTimeUntilStart() && (
          <div className="mt-6 bg-gray-700 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-300 mb-1">Starts in</p>
            <p className="text-2xl font-bold text-white">{getTimeUntilStart()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ParticipantItemProps {
  participant: Participant;
  onAdmit?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

function ParticipantItem({ 
  participant, 
  onAdmit, 
  onReject, 
  showActions = false 
}: ParticipantItemProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg",
      participant.status === 'waiting' ? "bg-gray-700" : "bg-gray-700/50"
    )}>
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-sage-600 text-white">
            {getInitials(participant.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-white">{participant.name}</p>
          <p className="text-sm text-gray-400">{participant.email}</p>
        </div>
      </div>
      
      {showActions && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onAdmit}
            className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onReject}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}