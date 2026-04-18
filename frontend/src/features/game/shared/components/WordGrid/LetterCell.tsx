import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { LetterState } from '../../types/game.types';

interface LetterCellProps {
  letter:      string;
  state:       LetterState;
  isActive?:   boolean;   // Aktif satırdaki hücre
  isLocked?:   boolean;   // İlk harf — değiştirilemez
  delay?:      number;    // Flip animasyon gecikmesi (ms)
}

const STATE_COLORS: Record<LetterState, string> = {
  [LetterState.Pending]:       '#2C2C3E',
  [LetterState.Correct]:       '#27AE60',   // Yeşil
  [LetterState.WrongPosition]: '#F39C12',   // Sarı
  [LetterState.NotFound]:      '#4A4A5A',   // Gri
};

const STATE_BORDER_COLORS: Record<LetterState, string> = {
  [LetterState.Pending]:       '#4A4A6A',
  [LetterState.Correct]:       '#2ECC71',
  [LetterState.WrongPosition]: '#F1C40F',
  [LetterState.NotFound]:      '#5A5A7A',
};

export const LetterCell: React.FC<LetterCellProps> = ({
  letter, state, isActive = false, isLocked = false, delay = 0,
}) => {
  const flipAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevState = useRef(state);

  // Flip animasyonu — tahmin submit edilince
  useEffect(() => {
    if (state !== LetterState.Pending && prevState.current === LetterState.Pending) {
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(flipAnim, {
          toValue: 1, duration: 300, useNativeDriver: true,
        }),
      ]).start();
    }
    prevState.current = state;
  }, [state, delay, flipAnim]);

  // Pop animasyonu — harf yazılınca
  useEffect(() => {
    if (letter && state === LetterState.Pending) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.12, duration: 80, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1,    duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [letter, scaleAnim]);

  const rotateY = flipAnim.interpolate({
    inputRange:  [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '0deg'],
  });

  const bgColor     = STATE_COLORS[state];
  const borderColor = STATE_BORDER_COLORS[state];

  return (
    <Animated.View style={[
      styles.cell,
      { backgroundColor: bgColor, borderColor, transform: [{ rotateY }, { scale: scaleAnim }] },
      isActive  && styles.activeCell,
      isLocked  && styles.lockedCell,
    ]}>
      <Text style={[styles.letter, isLocked && styles.lockedLetter]}>
        {letter}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cell: {
    width:         54,
    height:        54,
    borderWidth:   2,
    borderRadius:  6,
    alignItems:    'center',
    justifyContent:'center',
    margin:        3,
  },
  activeCell: {
    borderColor: '#7A7ACA',
    shadowColor: '#7A7ACA',
    shadowOffset:{ width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation:   4,
  },
  lockedCell: {
    borderColor: '#27AE60',
    borderWidth: 3,
  },
  letter: {
    fontSize:   22,
    fontWeight: 'bold',
    color:      '#FFFFFF',
  },
  lockedLetter: {
    color: '#2ECC71',
  },
});
