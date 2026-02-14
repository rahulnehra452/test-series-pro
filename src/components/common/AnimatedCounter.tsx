import React, { useEffect } from 'react';
import { TextInput, StyleSheet, TextStyle, TextProps } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedProps,
  Easing,
  withDelay,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedCounterProps extends TextProps {
  value: number;
  duration?: number;
  delay?: number;
  style?: TextStyle | TextStyle[];
  /** 
   * Number of decimal places to show. Default 0 (integer).
   */
  precision?: number;
}

export const AnimatedCounter = ({
  value,
  duration = 1000,
  delay = 0,
  style,
  precision = 0,
  ...props
}: AnimatedCounterProps) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = 0;
    animatedValue.value = withDelay(delay, withTiming(value, {
      duration,
      easing: Easing.out(Easing.exp),
    }));
  }, [value, duration, delay]);

  const animatedProps = useAnimatedProps<any>(() => {
    const currentVal = animatedValue.value;
    const text = currentVal.toFixed(precision);
    return {
      text,
    };
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      // Initial value matching precision
      defaultValue={precision > 0 ? "0.00" : "0"}
      style={[styles.text, style]}
      animatedProps={animatedProps}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  text: {
    padding: 0,
  },
});
