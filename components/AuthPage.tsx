// AuthPage.tsx
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Text } from "react-native";

type Decoration = {
  emoji: string;
  // Use any to allow percentage strings like '50%' without typing friction
  style: any;
  duration?: number; // seconds
  delay?: number;    // seconds
  scale?: number;    // 0.8..1.4
  rotate?: number;   // deg
};

const decorations: readonly Decoration[] = [
  { emoji: "🥐", style: { top: 60, left: 60 }, duration: 4.2, delay: 0.0, rotate: -4 },
  { emoji: "🍇", style: { top: 110, right: 100 }, duration: 4.8, delay: 0.3, rotate: 3 },
  { emoji: "🥑", style: { top: 180, left: 30 }, duration: 4.4, delay: 0.6, rotate: -2 },
  { emoji: "🍒", style: { top: 200, right: 200 }, duration: 4.6, delay: 0.1, rotate: 2 },
  { emoji: "🫐", style: { top: 250, left: "70%" }, duration: 5.0, delay: 0.2, rotate: -1 },
  { emoji: "🍜", style: { top: "57%", left: 20 }, duration: 4.8, delay: 0.4, rotate: 2, scale: 1.05 },
  { emoji: "🍣", style: { top: "36%", right: 20 }, duration: 5.2, delay: 0.7, rotate: -2, scale: 1.05 },
  { emoji: "🍓", style: { bottom: 80, left: 80 }, duration: 4.4, delay: 0.15, rotate: -3 },
  { emoji: "🥕", style: { bottom: 120, right: 50 }, duration: 5.0, delay: 0.45, rotate: 4 },
  { emoji: "🧋", style: { bottom: 160, left: 40 }, duration: 4.8, delay: 0.25, rotate: 1 },
  { emoji: "🍱", style: { bottom: 200, right: 100 }, duration: 4.6, delay: 0.35, rotate: -1 },
  { emoji: "🥞", style: { bottom: 60, right: 130 }, duration: 5.4, delay: 0.55, rotate: 2 },
  { emoji: "🍉", style: { bottom: 140, left: "50%" }, duration: 5.0, delay: 0.05, rotate: -2 },
  { emoji: "🍪", style: { top: 60, right: 20 }, duration: 4.2, delay: 0.2, rotate: -6, scale: 0.9 },
  { emoji: "🍍", style: { bottom: 30, left: 20 }, duration: 5.6, delay: 0.4, rotate: 5, scale: 0.95 },
] as const;

export default function AuthPage({ children }: { children: React.ReactNode }) {
  const floats = useRef(decorations.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    floats.forEach((value, index) => {
      const d = decorations[index];
      const durationMs = Math.max(1200, Math.round((d.duration ?? 4.8) * 1000));
      const sequence = Animated.sequence([
        Animated.timing(value, { toValue: -8, duration: durationMs / 2, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: durationMs / 2, useNativeDriver: true }),
      ]);
      const start = () => Animated.loop(sequence).start();
      const delayMs = Math.max(0, Math.round((d.delay ?? 0) * 1000));
      const t = setTimeout(start, delayMs + index * 120);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [floats]);

  return (
    <View style={styles.container}>
      {/* Decorations behind content */}
      <View style={[StyleSheet.absoluteFill, styles.decorationLayer]} pointerEvents="none">
        {decorations.map((d, i) => (
          <Animated.Text
            key={`${d.emoji}-${i}`}
            style={[
              styles.decoration,
              d.style as any,
              {
                transform: [
                  { translateY: floats[i] },
                  { rotate: `${d.rotate ?? 0}deg` },
                  { scale: d.scale ?? 1 },
                ],
                zIndex: 0,
              },
            ]}
          >
            {d.emoji}
          </Animated.Text>
        ))}
      </View>

      {/* Centered content */}
      <View style={styles.contentWrapper}>
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  decorationLayer: {
    zIndex: 0,
  },
  decoration: {
    position: 'absolute',
    fontSize: 40,
    opacity: 0.95,
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 10,
    position: 'relative',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 14,
  },
});



