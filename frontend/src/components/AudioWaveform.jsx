import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';

export default function AudioWaveform({ audioUrl, label = "Audio Track", color = "#00f2fe" }) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [totalDuration, setTotalDuration] = useState('0:00');

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#222f52',
      progressColor: color,
      cursorColor: '#ffffff',
      barWidth: 2,
      barGap: 3,
      barRadius: 2,
      height: 64,
      normalize: true,
      url: audioUrl,
    });

    ws.on('ready', () => {
      setTotalDuration(formatTime(ws.getDuration()));
    });

    ws.on('timeupdate', () => {
      setCurrentTime(formatTime(ws.getCurrentTime()));
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl, color]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleRestart = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(0);
      wavesurferRef.current.play();
    }
  };

  if (!audioUrl) return null;

  return (
    <div className="bg-cyber-900 border border-cyber-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cyber-accent" />
          <span className="font-semibold text-slate-200">{label}</span>
        </div>
        <div className="flex items-center gap-2 text-cyber-accent">
          <span>{currentTime}</span> / <span>{totalDuration}</span>
        </div>
      </div>

      <div ref={containerRef} className="w-full cursor-pointer rounded overflow-hidden" />

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-cyber-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-accent text-cyber-950 font-medium text-xs rounded-lg hover:bg-cyber-neon transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Play
              </>
            )}
          </button>
          <button
            onClick={handleRestart}
            title="Restart playback"
            className="p-1.5 text-slate-400 hover:text-slate-100 bg-cyber-800/50 hover:bg-cyber-800 rounded-lg transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Interactive Waveform
        </span>
      </div>
    </div>
  );
}
