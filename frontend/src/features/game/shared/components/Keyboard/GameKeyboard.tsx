import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LetterState, type KeyboardLetterState } from '../../types/game.types';

const ROWS = [
  ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
  ['⌫', 'Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', '↵'],
];

const KEY_COLORS: Record<LetterState, { bg: string; text: string }> = {
  [LetterState.Pending]:       { bg: '#3A3A5C', text: '#FFFFFF' },
  [LetterState.Correct]:       { bg: '#27AE60', text: '#FFFFFF' },
  [LetterState.WrongPosition]: { bg: '#D4A017', text: '#FFFFFF' },
  [LetterState.NotFound]:      { bg: '#1E1E2E', text: '#6B6B8A' },
};

interface GameKeyboardProps {
  letterStates:   KeyboardLetterState;
  onLetter:       (letter: string) => void;
  onDelete:       () => void;
  onSubmit:       () => void;
  disabled?:      boolean;
  lockedLetter?:  string;  // İlk harf — klavyede de vurgulu gösterilir
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const KEY_WIDTH = Math.floor((SCREEN_WIDTH - 32) / 11);

export const GameKeyboard: React.FC<GameKeyboardProps> = ({
  letterStates,
  onLetter,
  onDelete,
  onSubmit,
  disabled = false,
  lockedLetter,
}) => {
  const handlePress = (key: string) => {
    if (disabled) return;
    if (key === '⌫') onDelete();
    else if (key === '↵') onSubmit();
    else onLetter(key);
  };

  return (
    <View style={styles.keyboard}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const isAction  = key === '⌫' || key === '↵';
            const isLocked  = key === lockedLetter?.toUpperCase();
            const state     = letterStates[key] ?? LetterState.Pending;
            const colors    = KEY_COLORS[state];

            return (
              <TouchableOpacity
                key={key}
                onPress={() => handlePress(key)}
                disabled={disabled}
                activeOpacity={0.7}
                style={[
                  styles.key,
                  { width: isAction ? KEY_WIDTH * 1.5 : KEY_WIDTH },
                  { backgroundColor: isLocked ? '#27AE60' : colors.bg },
                  isLocked && styles.lockedKey,
                  disabled && styles.disabledKey,
                ]}
              >
                <Text style={[
                  styles.keyText,
                  { color: isLocked ? '#FFFFFF' : colors.text },
                  isAction && styles.actionText,
                ]}>
                  {key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  keyboard: {
    paddingHorizontal: 4,
    paddingBottom:     16,
    gap:               6,
  },
  row: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            4,
  },
  key: {
    height:         46,
    borderRadius:   6,
    alignItems:     'center',
    justifyContent: 'center',
    minWidth:       28,
  },
  lockedKey: {
    borderWidth:  2,
    borderColor:  '#2ECC71',
    shadowColor:  '#2ECC71',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity:0.5,
    shadowRadius: 4,
    elevation:    3,
  },
  disabledKey: {
    opacity: 0.4,
  },
  keyText: {
    fontSize:   14,
    fontWeight: '700',
  },
  actionText: {
    fontSize: 16,
  },
});
