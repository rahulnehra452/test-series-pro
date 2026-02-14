import React from 'react';
import { Pressable, ViewStyle, PressableProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ScaleButtonProps extends PressableProps {
  scaleTo?: number;
  style?: ViewStyle | ViewStyle[];
}

export const ScaleButton = ({
  children,
  style,
  scaleTo = 0.95,
  onPressIn,
  onPressOut,
  ...props
}: ScaleButtonProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withSpring(scaleTo, { damping: 10, stiffness: 300 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};
