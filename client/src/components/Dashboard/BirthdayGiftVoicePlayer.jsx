// File: client/src/components/Dashboard/BirthdayGiftVoicePlayer.jsx
import { Pause, Play, Volume2 } from "lucide-react";
import React, { useRef, useState } from "react";

const BirthdayGiftVoicePlayer = ({ voiceNoteUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (!voiceNoteUrl) return null;

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        onClick={togglePlay}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
          isPlaying
            ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-200"
            : "bg-pink-50 text-pink-600 hover:bg-pink-100"
        }`}
      >
        {isPlaying ? (
          <>
            <Pause className="w-3.5 h-3.5" />
            <span>Pause Message</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            <span>Play Message</span>
          </>
        )}
      </button>
      
      {isPlaying && (
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className="w-1 h-3 bg-gradient-to-b from-pink-400 to-rose-500 rounded-full animate-pulse" 
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}

      <audio
        ref={audioRef}
        src={voiceNoteUrl}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
};

export default BirthdayGiftVoicePlayer;
