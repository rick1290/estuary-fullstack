import { useState, useEffect, useCallback } from 'react';
import { Room, RoomEvent, ConnectionState, Participant } from 'livekit-client';

interface UseRoomStateProps {
  room: Room | null;
}

interface RoomState {
  connectionState: ConnectionState;
  participants: Participant[];
  localParticipant: Participant | null;
  isRecording: boolean;
  participantCount: number;
  error: Error | null;
}

export function useRoomState({ room }: UseRoomStateProps) {
  const [state, setState] = useState<RoomState>({
    connectionState: ConnectionState.Disconnected,
    participants: [],
    localParticipant: null,
    isRecording: false,
    participantCount: 0,
    error: null
  });

  const updateParticipants = useCallback(() => {
    if (!room) return;
    
    const participants = Array.from(room.remoteParticipants.values());
    setState(prev => ({
      ...prev,
      participants,
      localParticipant: room.localParticipant,
      participantCount: participants.length + (room.localParticipant ? 1 : 0)
    }));
  }, [room]);

  useEffect(() => {
    if (!room) return;

    const handleConnectionStateChanged = (state: ConnectionState) => {
      setState(prev => ({ ...prev, connectionState: state }));
    };

    const handleParticipantConnected = (participant: Participant) => {
      updateParticipants();
    };

    const handleParticipantDisconnected = (participant: Participant) => {
      updateParticipants();
    };

    const handleRecordingStateChanged = () => {
      setState(prev => ({ ...prev, isRecording: room.isRecording }));
    };

    const handleDisconnected = (reason?: Error) => {
      setState(prev => ({ 
        ...prev, 
        connectionState: ConnectionState.Disconnected,
        error: reason || null 
      }));
    };

    // Set initial state
    setState({
      connectionState: room.state,
      participants: Array.from(room.remoteParticipants.values()),
      localParticipant: room.localParticipant,
      isRecording: room.isRecording,
      participantCount: room.remoteParticipants.size + (room.localParticipant ? 1 : 0),
      error: null
    });

    // Add event listeners
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.RecordingStatusChanged, handleRecordingStateChanged);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.RecordingStatusChanged, handleRecordingStateChanged);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, updateParticipants]);

  return state;
}