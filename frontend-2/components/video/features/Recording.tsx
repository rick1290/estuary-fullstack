"use client";

import React, { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Radio, Circle, AlertCircle, Loader2 } from 'lucide-react';
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
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recordingOptions, setRecordingOptions] = useState<RecordingOptions>({
    audioOnly: false,
    outputFormat: 'mp4',
    includeScreenShare: true,
    notifyParticipants: true
  });

  // Debug logs
  useEffect(() => {
    console.log('RecordingControls state updated:', { showStartDialog, showStopDialog, isHost, isRecording });
  }, [showStartDialog, showStopDialog, isHost, isRecording]);

  if (!isHost) {
    console.log('Not showing recording controls - not host');
    return null;
  }

  const handleStartRecording = async () => {
    console.log('handleStartRecording called!', { recordingOptions, onStartRecording });
    setLoading(true);
    setError(null);

    try {
      console.log('Calling onStartRecording...');
      await onStartRecording(recordingOptions);
      console.log('Recording started successfully!');
      setShowStartDialog(false);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    } finally {
      setLoading(false);
    }
  };

  const handleStopRecording = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await onStopRecording();
      setShowStopDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Recording Button */}
      <Button
        variant="secondary"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log('Recording button clicked!', { isRecording, showStartDialog, showStopDialog });
          if (isRecording) {
            setShowStopDialog(true);
          } else {
            setShowStartDialog(true);
          }
        }}
        className={cn(
          "rounded-full relative",
          isRecording && "bg-red-500 hover:bg-red-600 text-white",
          className
        )}
        title={isRecording ? "Stop recording" : "Start recording"}
      >
        {isRecording ? <Circle className="h-4 w-4 fill-white" /> : <Radio className="h-4 w-4" />}
        {isRecording && (
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-400 rounded-full animate-pulse" />
        )}
      </Button>

      {/* Start Recording Dialog */}
      {showStartDialog && (
        <Dialog
          open={showStartDialog}
          onOpenChange={(open) => {
            console.log('Dialog onOpenChange called:', open);
            if (!open) {
              console.log('Preventing dialog close');
            }
            // Only allow closing via Cancel button
          }}
          modal={true}
        >
          <DialogContent
            className="sm:max-w-md z-[9999]"
            onInteractOutside={(e) => {
              // Prevent closing when clicking outside
              console.log('onInteractOutside triggered');
              e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              // Prevent closing on Escape key
              console.log('Escape key pressed');
              e.preventDefault();
            }}
          >
          <DialogHeader>
            <DialogTitle>Start Recording</DialogTitle>
            <DialogDescription>
              Configure recording settings before starting
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
            
            {/* Additional Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="screenShare"
                  checked={recordingOptions.includeScreenShare}
                  onCheckedChange={(checked) =>
                    setRecordingOptions(prev => ({ ...prev, includeScreenShare: !!checked }))
                  }
                />
                <Label htmlFor="screenShare" className="font-normal">
                  Include screen shares in recording
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notify"
                  checked={recordingOptions.notifyParticipants}
                  onCheckedChange={(checked) =>
                    setRecordingOptions(prev => ({ ...prev, notifyParticipants: !!checked }))
                  }
                />
                <Label htmlFor="notify" className="font-normal">
                  Notify participants about recording
                </Label>
              </div>
            </div>
            
            <Alert>
              <AlertDescription>
                By starting this recording, you confirm that all participants have consented to being recorded.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>
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
      )}

      {/* Stop Recording Dialog */}
      <Dialog
        open={showStopDialog}
        onOpenChange={setShowStopDialog}
        modal={true}
      >
        <DialogContent
          className="sm:max-w-md z-[9999]"
          onInteractOutside={(e) => {
            // Prevent closing when clicking outside
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Stop Recording</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop the recording?
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStopDialog(false)}>
              Continue Recording
            </Button>
            <Button 
              onClick={handleStopRecording} 
              disabled={loading}
              variant="destructive"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                'Stop Recording'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Recording Status Indicator
export function RecordingIndicator({ isRecording }: { isRecording: boolean }) {
  if (!isRecording) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50">
      <div className="h-3 w-3 bg-white rounded-full animate-pulse" />
      <span className="text-sm font-medium">Recording</span>
    </div>
  );
}