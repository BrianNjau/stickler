import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { useReducedMotion } from './motion';
import { Text } from './Text';
import { radius, space, useColors } from './tokens';

export interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
}

/** Bottom sheet. Always closable three ways: the Close button, the backdrop, and system back/escape. */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
      />
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          { backgroundColor: c.surface, borderColor: c.line, paddingBottom: space.lg + insets.bottom },
        ]}
      >
        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Button label="Close" variant="ghost" onPress={onClose} />
        </View>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,21,27,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { flex: 1 },
});
