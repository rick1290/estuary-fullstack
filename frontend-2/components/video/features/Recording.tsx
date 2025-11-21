"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Radio, Circle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordingControlsProps {
  isHost: boolean;
  isRecording: boolean;
  onStartRecording: (options: RecordingOptions) => Promise<void>;
  onStopRecording: () => Promise<void>;
  className?: string;
}

interface RecordingOptions {
  audioOnly: boolean;
  outputFormat: 'mp4' | 'webm' | 'hls';
  includeScreenShare: boolean;
  notifyParticipants: boolean;
}

export function RecordingControls({
  isHost,
  isRecording,
  onStartRecording,
  onStopRecording,
  className
}: RecordingControlsProps) {
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recordingOptions, setRecordingOptions] = useState<RecordingOptions>({
    audioOnly: false,
    outputFormat: 'mp4',
    includeScreenShare: true,
    notifyParticipants: true
  });

  if (!isHost) {
    return null;
  }

  const handleButtonClick = async () => {
    if (loading) return;

    if (isRecording) {
      // Stop recording directly (no dialog)
      setLoading(true);
      try {
        await onStopRecording();
      } catch (err) {
        console.error('Recording error:', err);
      } finally {
        setLoading(false);
      }
    } else {
      // Show options dialog
      setShowStartDialog(true);
    }
  };

  const handleStartRecording = async () => {
    setLoading(true);
    setError(null);

    try {
      await onStartRecording(recordingOptions);
      setShowStartDialog(false);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        onClick={handleButtonClick}
        disabled={loading}
        className={cn(
          "rounded-full relative",
          isRecording && "bg-red-500 hover:bg-red-600 text-white",
          loading && "opacity-50 cursor-not-allowed",
          className
        )}
        title={isRecording ? "Stop recording" : "Start recording"}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <Circle className="h-4 w-4 fill-white" />
        ) : (
          <Radio className="h-4 w-4" />
        )}
        {isRecording && !loading && (
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-400 rounded-full animate-pulse" />
        )}
      </Button>

      {/* Start Recording Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Recording</DialogTitle>
            <DialogDescription>
              Choose your recording settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Recording Type */}
            <div className="space-y-2">
              <Label>Recording Type</Label>
              <RadioGroup
                value={recordingOptions.audioOnly ? 'audio' : 'video'}
                onValueChange={(value) =>
                  setRecordingOptions(prev => ({ ...prev, audioOnly: value === 'audio' }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="video" id="video" />
                  <Label htmlFor="video" className="font-normal">
                    Video and Audio
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="audio" id="audio" />
                  <Label htmlFor="audio" className="font-normal">
                    Audio Only
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Output Format */}
            <div className="space-y-2">
              <Label>Output Format</Label>
              <RadioGroup
                value={recordingOptions.outputFormat}
                onValueChange={(value) =>
                  setRecordingOptions(prev => ({ ...prev, outputFormat: value as any }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mp4" id="mp4" />
                  <Label htmlFor="mp4" className="font-normal">
                    MP4 (Recommended)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="webm" id="webm" />
                  <Label htmlFor="webm" className="font-normal">
                    WebM
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Alert>
              <AlertDescription>
                By starting this recording, you confirm that all participants have consented to being recorded.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleStartRecording}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Recording'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Recording Status Indicator - Not needed, pulsing dot on button is enough
export function RecordingIndicator({ isRecording }: { isRecording: boolean }) {
  return null;
}