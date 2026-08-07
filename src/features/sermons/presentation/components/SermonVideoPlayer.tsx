import { Image } from 'expo-image';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Maximize,
  AlertCircle,
} from 'lucide-react-native';
import type { Sermon } from '../../domain/sermon.types';
import type { SermonPlaybackProgress } from '../../domain/sermon.types';

interface SermonVideoPlayerProps {
  sermon: Sermon;
  savedProgress?: SermonPlaybackProgress | null;
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  onComplete?: () => void;
  videoSource: string | null;
}

type PlayerState = 'idle' | 'loading' | 'paused' | 'playing' | 'error' | 'completed';

const NAVY = '#1A1A1A';
const GOLD = '#FF6596';

export function SermonVideoPlayer({
  sermon,
  savedProgress,
  onProgress,
  onComplete,
  videoSource,
}: SermonVideoPlayerProps) {
  const videoViewRef = useRef<VideoView>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [showControls, setShowControls] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [bufferedPositionMs, setBufferedPositionMs] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [initialSeekDone, setInitialSeekDone] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(videoSource ? { uri: videoSource } : null, (p) => {
    p.loop = false;
    p.play(); // Auto-play like YouTube
    p.timeUpdateEventInterval = 0.5; // Update every half second
  });

  // Listen to playing state
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (isPlaying) {
      setPlayerState('playing');
      scheduleHideControls();
    } else if (playerState !== 'completed' && playerState !== 'error') {
      setPlayerState('paused');
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      setShowControls(true);
    }
  });

  // Listen to status changes
  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'loading') {
      setPlayerState('loading');
      setPlayerError(null);
    } else if (status === 'readyToPlay') {
      setDurationMs((player.duration ?? 0) * 1000);
      if (!initialSeekDone) {
        if (savedProgress && savedProgress.positionSeconds > 5 && !savedProgress.completed) {
          player.currentTime = savedProgress.positionSeconds;
        }
        setInitialSeekDone(true);
        // Do not pause here, let it auto-play
      }
    } else if (status === 'error') {
      setPlayerState('error');
      setPlayerError(error?.message || 'Unknown player error');
    }
  });

  // Track time
  useEventListener(player, 'timeUpdate', ({ currentTime, bufferedPosition }) => {
    const posMs = currentTime * 1000;
    setPositionMs(posMs);
    setBufferedPositionMs(bufferedPosition * 1000);
    
    const durMs = (player.duration ?? 0) * 1000;

    // Check completion
    if (durMs > 0 && posMs >= durMs - 1000) {
      setPlayerState('completed');
      onComplete?.();
    } else {
      onProgress?.(Math.floor(currentTime), Math.floor(player.duration ?? 0));
    }
  });

  const scheduleHideControls = () => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleTap = () => {
    if (playerState === 'paused' || playerState === 'idle') {
      // Don't auto-hide controls if paused or idle
      setShowControls(true);
    } else {
      setShowControls((prev) => !prev);
      if (!showControls) scheduleHideControls();
    }
  };

  const handlePlayPause = () => {
    if (playerState === 'completed') {
      player.currentTime = 0;
      player.play();
      return;
    }
    if (player.playing) {
      player.pause();
    } else {
      player.play();
      setPlayerState('playing');
    }
  };

  const handleSeek = (seconds: number) => {
    const newTime = Math.max(0, Math.min(player.duration ?? 0, player.currentTime + seconds));
    player.currentTime = newTime;
  };

  const handleSeekToProgress = (locationX: number) => {
    if (durationMs === 0 || progressBarWidth === 0) return;
    const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth));
    player.currentTime = percentage * (durationMs / 1000);
  };

  const handleFullscreen = () => {
    videoViewRef.current?.enterFullscreen();
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const bufferedProgress = durationMs > 0 ? bufferedPositionMs / durationMs : 0;
  const isIdle = playerState === 'idle' || playerState === 'paused';

  if (!videoSource) {
    return (
      <View style={styles.container}>
        <Image
          source={sermon.thumbnailUrl ? { uri: sermon.thumbnailUrl } : undefined}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        cachePolicy="memory-disk" transition={200} />
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        style={StyleSheet.absoluteFill}
        onPress={handleTap}
      >
        {/* Video View */}
        <VideoView
          ref={videoViewRef}
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={isFullscreen}
          onFullscreenEnter={() => setIsFullscreen(true)}
          onFullscreenExit={() => setIsFullscreen(false)}
        />

        {/* Thumbnail overlay before playback starts */}
        {(!initialSeekDone || playerState === 'idle') && sermon.thumbnailUrl && !isFullscreen && (
          <Image
            source={{ uri: sermon.thumbnailUrl }}
            style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}
            resizeMode="cover"
          cachePolicy="memory-disk" transition={200} />
        )}

        {/* Loading Spinner */}
        {playerState === 'loading' && !isFullscreen && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={GOLD} />
          </View>
        )}

        {/* Error State */}
        {playerState === 'error' && !isFullscreen && (
          <View style={styles.overlay}>
            <View style={styles.errorBox}>
              <AlertCircle size={32} color="#fff" />
              <Text style={styles.errorText}>Failed to load video</Text>
              {playerError ? (
                <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center', marginHorizontal: 20 }}>
                  {playerError}
                </Text>
              ) : null}
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setPlayerState('loading');
                  setPlayerError(null);
                  player.play();
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Big centered play button — idle and controls hidden */}
        {playerState === 'idle' && !showControls && !isFullscreen && (
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.bigPlayBtn}>
              <Play size={36} color="#fff" fill="#fff" />
            </View>
          </View>
        )}



        {/* Completed State */}
        {playerState === 'completed' && !isFullscreen && (
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.replayBtn} onPress={handlePlayPause}>
              <RotateCcw size={32} color="#fff" />
              <Text style={styles.replayText}>Replay</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Controls overlay */}
        {showControls && playerState !== 'loading' && playerState !== 'error' && !isFullscreen && (
          <View style={styles.controlsOverlay}>
            {/* Center controls */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => handleSeek(-15)}
              >
                <SkipBack size={28} color="#fff" />
                <Text style={styles.skipLabel}>15</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.playPauseBtn} onPress={handlePlayPause}>
                {playerState === 'playing' ? (
                  <Pause size={36} color="#fff" fill="#fff" />
                ) : (
                  <Play size={36} color="#fff" fill="#fff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => handleSeek(15)}
              >
                <SkipForward size={28} color="#fff" />
                <Text style={styles.skipLabel}>15</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom bar */}
            <View style={styles.bottomBar}>
              <Text style={styles.timeText}>{formatTime(positionMs)}</Text>
              <TouchableOpacity
                style={styles.progressBarContainer}
                activeOpacity={1}
                onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
                onPress={(e) => handleSeekToProgress(e.nativeEvent.locationX)}
              >
                <View style={styles.progressTrack} />
                <View style={[styles.progressBuffered, { width: `${bufferedProgress * 100}%` }]} />
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
              </TouchableOpacity>
              <Text style={styles.timeText}>{formatTime(durationMs)}</Text>
              <TouchableOpacity onPress={handleFullscreen} style={{ padding: 4 }}>
                <Maximize size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bigPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  resumeBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  resumeText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '700',
  },
  errorBox: {
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: GOLD,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  replayBtn: {
    alignItems: 'center',
    gap: 8,
  },
  replayText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  skipBtn: {
    alignItems: 'center',
    position: 'relative',
  },
  skipLabel: {
    position: 'absolute',
    bottom: -4,
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  playPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 6,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  timeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    minWidth: 38,
  },
  progressBarContainer: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    position: 'relative',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    position: 'absolute',
    left: 0,
    top: 13,
  },
  progressBuffered: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
    position: 'absolute',
    left: 0,
    top: 13,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    position: 'absolute',
    left: 0,
    top: 13,
  },
  progressThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: GOLD,
    position: 'absolute',
    top: 8,
    marginLeft: -7,
  },
});
