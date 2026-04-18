import React, { useRef, useState } from 'react';
import {
  View, TextInput, Text, StyleSheet, Animated,
  TouchableOpacity, type TextInputProps,
} from 'react-native';

interface AppInputProps extends Omit<TextInputProps, 'style'> {
  label?:       string;
  error?:       string;
  hint?:        string;
  icon?:        string;
  clearable?:   boolean;
  onClear?:     () => void;
}

export const AppInput: React.FC<AppInputProps> = ({
  label, error, hint, icon, clearable, onClear, value, ...rest
}) => {
  const [, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    rest.onFocus?.(null as any);
  };
  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    rest.onBlur?.(null as any);
  };

  const borderColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? '#E74C3C' : '#2A2A5E', error ? '#E74C3C' : '#2980B9'],
  });

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Animated.View style={[styles.inputBox, { borderColor }]}>
        {icon && <Text style={styles.icon}>{icon}</Text>}

        <TextInput
          {...rest}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={styles.input}
          placeholderTextColor="#3A4A6A"
          selectionColor="#2980B9"
          autoCorrect={false}
          autoCapitalize={rest.autoCapitalize ?? 'none'}
        />

        {clearable && value && (
          <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {error && <Text style={styles.error}>{error}</Text>}
      {!error && hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper:  { gap: 6 },
  label:    { color: '#A0B4D8', fontSize: 13, fontWeight: '600' },
  inputBox: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#0D0D1E',
    borderWidth:     1.5,
    borderRadius:    10,
    paddingHorizontal:12,
    gap:             8,
  },
  icon:     { fontSize: 16 },
  input: {
    flex:      1,
    color:     '#E0E8FF',
    fontSize:  15,
    paddingVertical: 12,
  },
  clearBtn: { padding: 4 },
  clearIcon:{ color: '#3A4A6A', fontSize: 14 },
  error:    { color: '#E74C3C', fontSize: 12, marginTop: 2 },
  hint:     { color: '#3A4A6A', fontSize: 12, marginTop: 2 },
});
