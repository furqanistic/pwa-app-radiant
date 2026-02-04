// File: client/src/components/common/VoiceRecorder.jsx
import { Button } from "@/components/ui/button";
import { Check, Mic, Pause, Play, RotateCcw, Square, Trash2, Volume2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const VoiceRecorder = ({ onUploadSuccess, onReset, initialUrl = "" }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(initialUrl);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        
        // Pass the blob to the parent component for uploading
        if (onUploadSuccess) {
          onUploadSuccess(audioBlob);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlayback = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const resetRecording = () => {
    setAudioURL("");
    setRecordingTime(0);
    if (onReset) onReset();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-pink-50/30 rounded-2xl border border-pink-100/50">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-pink-500/70 uppercase tracking-[0.15em]">
          Voice Presentation
        </label>
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-mono font-bold text-red-500">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!audioURL ? (
          !isRecording ? (
            <Button
              type="button"
              onClick={startRecording}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 h-12 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Mic className="w-5 h-5" />
              Start Recording
            </Button>
          ) : (
            <Button
              type="button"
              onClick={stopRecording}
              className="flex-1 bg-gray-900 h-12 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5" />
              Stop Recording
            </Button>
          )
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <Button
              type="button"
              onClick={togglePlayback}
              variant="outline"
              className="w-12 h-12 rounded-xl flex items-center justify-center p-0 border-gray-200"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            <div className="flex-1 h-12 bg-white rounded-xl border border-gray-100 flex items-center px-4 gap-3">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-300"
                  style={{ width: isPlaying ? "100%" : "0%" }}
                />
              </div>
              <span className="text-[10px] font-bold text-gray-400">
                {audioURL.startsWith('http') ? 'REPLAY' : 'READY'}
              </span>
            </div>

            <Button
              type="button"
              onClick={resetRecording}
              variant="outline"
              className="w-12 h-12 rounded-xl flex items-center justify-center p-0 border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>

            <audio 
              ref={audioPlayerRef} 
              src={audioURL} 
              onEnded={() => setIsPlaying(false)} 
              className="hidden" 
            />
          </div>
        )}
      </div>
      
      <p className="text-[10px] text-pink-400 font-medium">
        {audioURL 
          ? "Recording captured. You can preview it or re-record." 
          : "Add a personal touch with a short voice note."}
      </p>
    </div>
  );
};

export default VoiceRecorder;
