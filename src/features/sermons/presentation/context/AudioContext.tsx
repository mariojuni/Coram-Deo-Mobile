import { useRef, useEffect, createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { useSermonStore } from '@/store/useSermonStore';
import { useSermonPlaybackStore } from '@/store/useSermonPlaybackStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useEventListener } from 'expo';

interface AudioContextType {
  player: AudioPlayer | null;
  playAudio: (audioUrl: string, sermonId: string, initialPositionSeconds?: number) => Promise<void>;
  pauseAudio: () => void;
  resumeAudio: () => void;
  stopAudio: () => void;
  seekAudio: (position: number) => void;
  setRate: (rate: number) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const setCurrentPosition = useSermonStore((state) => state.setCurrentPosition);
  const setIsPlaying = useSermonStore((state) => state.setIsPlaying);
  const currentSermon = useSermonStore((state) => state.currentSermon);
  const updateProgress = useSermonPlaybackStore((state) => state.updateProgress);
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentSermonId = useRef<string | null>(null);
  
  // Initialize player with no source
  const player = useAudioPlayer(null);
  const progressInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Configure audio session
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    }).catch(console.error);

    return () => {
      // Cleanup
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!player) return;
    
    // Sync player state to global store every second
    const syncInterval = setInterval(() => {
      setIsPlaying(player.playing);
      setCurrentPosition(Math.floor(player.currentTime));
    }, 1000);
    
    return () => clearInterval(syncInterval);
  }, [player, setIsPlaying, setCurrentPosition]);

  useEffect(() => {
    // Only run if we're actually playing something
    const isPlaying = player?.playing;
    
    if (isPlaying && currentUser && currentSermonId.current && currentSermon) {
      const interval = setInterval(() => {
        updateProgress(
          currentSermon.churchId,
          currentUser.uid,
          currentSermonId.current!,
          'audio',
          Math.floor(player?.currentTime || 0),
          Math.floor(player?.duration || 0)
        );
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [player?.playing, currentUser, currentSermon]);

  const playAudio = useCallback(async (audioUrl: string, sermonId: string, initialPositionSeconds?: number) => {
    try {
      currentSermonId.current = sermonId;
      player?.replace(audioUrl);
      if (initialPositionSeconds !== undefined) {
        player?.seekTo(initialPositionSeconds);
      }
      player?.play();
      setIsPlaying(true);
      
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, [player, setIsPlaying]);

  const pauseAudio = useCallback(() => {
    player?.pause();
    setIsPlaying(false);
  }, [player, setIsPlaying]);

  const resumeAudio = useCallback(() => {
    player?.play();
    setIsPlaying(true);
  }, [player, setIsPlaying]);

  const stopAudio = useCallback(() => {
    player?.pause();
    setIsPlaying(false);
    setCurrentPosition(0);
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, [player, setIsPlaying, setCurrentPosition]);

  const seekAudio = useCallback((position: number) => {
    // position argument is in seconds (consistent with video player)
    player?.seekTo(position);
  }, [player]);

  const setRate = useCallback((rate: number) => {
    player?.setPlaybackRate(rate);
  }, [player]);

  const value: AudioContextType = useMemo(() => ({
    player,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekAudio,
    setRate,
  }), [player, playAudio, pauseAudio, resumeAudio, stopAudio, seekAudio, setRate]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}
