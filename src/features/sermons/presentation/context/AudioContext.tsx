import { useRef, useEffect, createContext, useContext, ReactNode } from 'react';
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
  const { setCurrentPosition, setIsPlaying, currentSermon } = useSermonStore();
  const { updateProgress } = useSermonPlaybackStore();
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

  const playAudio = async (audioUrl: string, sermonId: string, initialPositionSeconds?: number) => {
    try {
      currentSermonId.current = sermonId;
      player.replace(audioUrl);
      if (initialPositionSeconds !== undefined) {
        player.seekTo(initialPositionSeconds);
      }
      player.play();
      setIsPlaying(true);
      
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const pauseAudio = () => {
    player.pause();
    setIsPlaying(false);
  };

  const resumeAudio = () => {
    player.play();
    setIsPlaying(true);
  };

  const stopAudio = () => {
    player.pause();
    setIsPlaying(false);
    setCurrentPosition(0);
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const seekAudio = (position: number) => {
    // position argument is in seconds (consistent with video player)
    player.seekTo(position);
  };

  const setRate = (rate: number) => {
    player.setPlaybackRate(rate);
  };

  const value: AudioContextType = {
    player,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekAudio,
    setRate,
  };

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
