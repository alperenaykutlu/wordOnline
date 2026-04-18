import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, Animated,
  TouchableWithoutFeedback, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';

interface BaseModalProps {
  visible:        boolean;
  onClose?:       () => void;
  closeOnOverlay?:boolean;
  children:       React.ReactNode;
  title?:         string;
  showHandle?:    boolean;   // Bottom sheet tarzı tutamaç
  position?:      'center' | 'bottom';
}

const { height: SCREEN_H } = Dimensions.get('window');

export const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  onClose,
  closeOnOverlay = true,
  children,
  title,
  showHandle = false,
  position = 'center',
}) => {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim       = useRef(new Animated.Value(position === 'bottom' ? SCREEN_H : 60)).current;
  const scaleAnim       = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1, duration: 220, useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0, tension: 65, friction: 11, useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1, tension: 65, friction: 11, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0, duration: 180, useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: position === 'bottom' ? SCREEN_H : 40,
          duration: 180, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const isBottom  = position === 'bottom';
  const cardStyle = isBottom ? styles.cardBottom : styles.cardCenter;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={closeOnOverlay ? onClose : undefined}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Card */}
        <Animated.View style={[
          styles.card,
          cardStyle,
          {
            transform: isBottom
              ? [{ translateY: slideAnim }]
              : [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}>
          {showHandle && <View style={styles.handle} />}

          {title && (
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
            </View>
          )}

          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex:     { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  card: {
    backgroundColor: '#16162E',
    borderWidth:     1,
    borderColor:     '#2A2A5E',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.5,
    shadowRadius:    24,
    elevation:       16,
  },
  cardCenter: {
    position:        'absolute',
    alignSelf:       'center',
    width:           '88%',
    borderRadius:    20,
    padding:         24,
    top:             '20%',
  },
  cardBottom: {
    position:           'absolute',
    bottom:             0,
    left:               0,
    right:              0,
    borderTopLeftRadius: 24,
    borderTopRightRadius:24,
    borderBottomWidth:  0,
    padding:            24,
    paddingBottom:      40,
  },
  handle: {
    width:           44,
    height:          4,
    backgroundColor: '#3A3A6E',
    borderRadius:    2,
    alignSelf:       'center',
    marginBottom:    16,
  },
  titleRow: { marginBottom: 16 },
  title:    { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
});
