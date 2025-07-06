import { useState, useEffect, useCallback } from 'react';
import { createLocalAudioTrack, createLocalVideoTrack, LocalAudioTrack, LocalVideoTrack } from 'livekit-client';

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface UseMediaDevicesReturn {
  cameras: MediaDevice[];
  microphones: MediaDevice[];
  speakers: MediaDevice[];
  selectedCamera: string | null;
  selectedMicrophone: string | null;
  selectedSpeaker: string | null;
  videoTrack: LocalVideoTrack | null;
  audioTrack: LocalAudioTrack | null;
  selectCamera: (deviceId: string) => Promise<void>;
  selectMicrophone: (deviceId: string) => Promise<void>;
  selectSpeaker: (deviceId: string) => void;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  loading: boolean;
  error: Error | null;
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [speakers, setSpeakers] = useState<MediaDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get available devices
  const refreshDevices = useCallback(async () => {
    try {
      // Request permissions first to get device labels
      await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      }).then(stream => {
        // Stop the stream immediately, we just needed permissions
        stream.getTracks().forEach(track => track.stop());
      }).catch(() => {
        // Permissions denied, but we can still enumerate devices (without labels)
      });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
          kind: device.kind
        }));
      
      const audioInputDevices = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
          kind: device.kind
        }));
      
      const audioOutputDevices = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(0, 5)}`,
          kind: device.kind
        }));
      
      setCameras(videoDevices);
      setMicrophones(audioInputDevices);
      setSpeakers(audioOutputDevices);
      
      // Select default devices if none selected
      if (!selectedCamera && videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
      if (!selectedMicrophone && audioInputDevices.length > 0) {
        setSelectedMicrophone(audioInputDevices[0].deviceId);
      }
      if (!selectedSpeaker && audioOutputDevices.length > 0) {
        setSelectedSpeaker(audioOutputDevices[0].deviceId);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to enumerate devices'));
    }
  }, [selectedCamera, selectedMicrophone, selectedSpeaker]);

  // Initialize tracks
  const initializeTracks = useCallback(async () => {
    if (!selectedCamera || !selectedMicrophone) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Create video track
      if (isVideoEnabled) {
        const video = await createLocalVideoTrack({
          deviceId: selectedCamera,
          resolution: {
            width: 1280,
            height: 720
          }
        });
        setVideoTrack(video);
      }
      
      // Create audio track
      if (isAudioEnabled) {
        const audio = await createLocalAudioTrack({
          deviceId: selectedMicrophone,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        });
        setAudioTrack(audio);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize media'));
    } finally {
      setLoading(false);
    }
  }, [selectedCamera, selectedMicrophone, isVideoEnabled, isAudioEnabled]);

  // Device selection handlers
  const selectCamera = useCallback(async (deviceId: string) => {
    setSelectedCamera(deviceId);
    
    if (videoTrack) {
      await videoTrack.stop();
      setVideoTrack(null);
    }
    
    if (isVideoEnabled) {
      const video = await createLocalVideoTrack({ deviceId });
      setVideoTrack(video);
    }
  }, [videoTrack, isVideoEnabled]);

  const selectMicrophone = useCallback(async (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    
    if (audioTrack) {
      await audioTrack.stop();
      setAudioTrack(null);
    }
    
    if (isAudioEnabled) {
      const audio = await createLocalAudioTrack({ 
        deviceId,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      });
      setAudioTrack(audio);
    }
  }, [audioTrack, isAudioEnabled]);

  const selectSpeaker = useCallback((deviceId: string) => {
    setSelectedSpeaker(deviceId);
    // Speaker selection is handled by the browser/OS
  }, []);

  // Toggle handlers
  const toggleVideo = useCallback(async () => {
    try {
      if (isVideoEnabled && videoTrack) {
        await videoTrack.stop();
        setVideoTrack(null);
        setIsVideoEnabled(false);
      } else if (!isVideoEnabled && selectedCamera) {
        const video = await createLocalVideoTrack({ deviceId: selectedCamera });
        setVideoTrack(video);
        setIsVideoEnabled(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to toggle video'));
    }
  }, [isVideoEnabled, videoTrack, selectedCamera]);

  const toggleAudio = useCallback(async () => {
    try {
      if (isAudioEnabled && audioTrack) {
        await audioTrack.stop();
        setAudioTrack(null);
        setIsAudioEnabled(false);
      } else if (!isAudioEnabled && selectedMicrophone) {
        const audio = await createLocalAudioTrack({ 
          deviceId: selectedMicrophone,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        });
        setAudioTrack(audio);
        setIsAudioEnabled(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to toggle audio'));
    }
  }, [isAudioEnabled, audioTrack, selectedMicrophone]);

  // Initialize on mount
  useEffect(() => {
    refreshDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
    };
  }, [refreshDevices]);

  // Initialize tracks when devices are selected
  useEffect(() => {
    if (selectedCamera && selectedMicrophone) {
      initializeTracks();
    }
  }, [selectedCamera, selectedMicrophone]); // Remove initializeTracks from dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoTrack) {
        videoTrack.stop();
      }
      if (audioTrack) {
        audioTrack.stop();
      }
    };
  }, [videoTrack, audioTrack]);

  return {
    cameras,
    microphones,
    speakers,
    selectedCamera,
    selectedMicrophone,
    selectedSpeaker,
    videoTrack,
    audioTrack,
    selectCamera,
    selectMicrophone,
    selectSpeaker,
    toggleVideo,
    toggleAudio,
    isVideoEnabled,
    isAudioEnabled,
    loading,
    error
  };
}