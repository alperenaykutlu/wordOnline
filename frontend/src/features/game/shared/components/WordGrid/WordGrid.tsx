import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LetterCell } from './LetterCell';
import type { GuessRow } from '../../types/game.types';
import { LetterState } from '../../types/game.types';

interface WordGridProps {
  rows:             GuessRow[];
  wordLength:       number;
  activeRowIndex:   number;
  currentGuess:     string;
}

export const WordGrid: React.FC<WordGridProps> = ({
  rows, wordLength, activeRowIndex, currentGuess,
}) => {
  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {Array.from({ length: wordLength }).map((_, colIndex) => {
            const isActiveRow = rowIndex === activeRowIndex;
            const letter = isActiveRow
              ? (currentGuess[colIndex] ?? '')
              : (row.letters[colIndex] ?? '');

            const state = row.isSubmitted
              ? row.letterStates[colIndex]
              : LetterState.Pending;

            const isLocked = colIndex === 0; // İlk harf kilitli

            return (
              <LetterCell
                key={colIndex}
                letter={letter}
                state={state}
                isActive={isActiveRow && !row.isSubmitted}
                isLocked={isLocked && isActiveRow && !row.isSubmitted}
                delay={colIndex * 100} // Kademeli flip
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    marginVertical: 2,
  },
});
