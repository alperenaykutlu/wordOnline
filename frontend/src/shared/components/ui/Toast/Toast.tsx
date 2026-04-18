import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible:  boolean;
  message:  string;
  variant?: ToastVariant;
  duration?:number;
  onHide:   () => void;
  icon?:    string;
}

const VARIANT_CONFIG: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: { bg: '#0A2A18', border: '#27AE60', icon: '✓' },
  error:   { bg: '#2A0A0A', border: '#E74C3C', icon: '✕' },
  warning: { bg: '#2A1A0A', border: '#F39C12', icon: '⚠' },
  info:    { bg: '#0A1A2A', border: '#2980B9', icon: 'ℹ' },
};

export const Toast: React.FC<ToastProps> = ({
  visible, message, variant = 'info', duration = 3000, onHide, icon,
}) => {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timer      = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (visible) {
      if (timer.current) clearTimeout(timer.current);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        Animated.timing(opacity,   { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      timer.current = setTimeout(() => hide(), duration);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [visible, message]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity,   { toValue: 0,   duration: 220, useNativeDriver: true }),
    ]).start(() => onHide());
  };

  if (!visible) return null;

  const cfg = VARIANT_CONFIG[variant];

  return (
    <Animated.View style={[
      styles.container,
      { backgroundColor: cfg.bg, borderColor: cfg.border },
      { transform: [{ translateY }], opacity },
    ]}>
      <View style={[styles.iconBadge, { borderColor: cfg.border }]}>
        <Text style={[styles.iconText, { color: cfg.border }]}>{icon ?? cfg.icon}</Text>
      </View>
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      <TouchableOpacity onPress={hide} style={styles.closeBtn}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Global Toast Manager ──────────────────────────────────
type ToastOptions = { message: string; variant?: ToastVariant; duration?: number; icon?: string };
type ToastListener = (opts: ToastOptions | null) => void;

class ToastManager {
  private listener: ToastListener | null = null;

  subscribe(fn: ToastListener)  { this.listener = fn; }
  unsubscribe()                 { this.listener = null; }

  show(opts: ToastOptions)      { this.listener?.(opts); }
  hide()                        { this.listener?.(null); }
}

export const toast = new ToastManager();

// ── Toast Provider (App.tsx'e koyulur) ───────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = React.useState<ToastOptions | null>(null);

  useEffect(() => {
    toast.subscribe(setCurrent);
    return () => toast.unsubscribe();
  }, []);

  return (
    <>
      {children}
      {current && (
        <Toast
          visible
          message={current.message}
          variant={current.variant}
          duration={current.duration}
          icon={current.icon}
          onHide={() => { setCurrent(null); toast.hide(); }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position:        'absolute',
    top:             56,
    left:            16,
    right:           16,
    flexDirection:   'row',
    alignItems:      'center',
    borderRadius:    12,
    borderWidth:     1,
    padding:         12,
    gap:             10,
    zIndex:          9999,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    8,
    elevation:       12,
  },
  iconBadge: {
    width:          28,
    height:         28,
    borderRadius:   14,
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconText:  { fontSize: 13, fontWeight: '800' },
  message:   { flex: 1, color: '#D0D8F0', fontSize: 13, fontWeight: '500', lineHeight: 18 },
  closeBtn:  { padding: 4 },
  closeText: { color: '#4A5A7A', fontSize: 14 },
});
