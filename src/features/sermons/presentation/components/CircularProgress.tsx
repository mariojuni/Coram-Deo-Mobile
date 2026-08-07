import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}

export function CircularProgress({
  progress,
  size = 24,
  strokeWidth = 2.5,
  color = '#9CA3AF',
  trackColor = '#E5E7EB',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Ensure progress is bounded between 0 and 1
  const safeProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - safeProgress * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          originX={size / 2}
          originY={size / 2}
          rotation="-90"
        />
      </Svg>
    </View>
  );
}
