import { Check, Trash } from './icons';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { haptic } from './haptics';
import { PriorityPill, priorityLabel, type Priority } from './Pill';
import { Text } from './Text';
import { useTheme, type TintName } from './theme';
import { radius, size, space } from './tokens';

export interface TaskRowProps {
  title: string;
  done: boolean;
  priority: Priority;
  minutes?: number;
  onToggle: () => void;
  /** Enables swipe-left-to-delete, plus a screen-reader action that does the same. */
  onDelete?: () => void;
  /** The card tint this row sits on, so its text uses that tint's ink. */
  tint?: TintName;
}

export function TaskRow({ title, done, priority, minutes, onToggle, onDelete, tint }: TaskRowProps) {
  const { theme, tint: tintOf } = useTheme();
  const fg = tint ? tintOf(tint).fg : theme.ink;
  const minutesLabel = minutes != null ? `, ${minutes} minutes` : '';

  const row = (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      // react-native-web ignores accessibilityState.checked; aria-checked covers the browser.
      aria-checked={done}
      accessibilityLabel={`${title}${minutesLabel}, ${priorityLabel(priority)} quest`}
      accessibilityActions={onDelete ? [{ name: 'delete', label: 'Delete task' }] : undefined}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete?.()}
      onPress={() => {
        haptic(priority === 'boss' && !done ? 'bossDone' : 'taskDone');
        onToggle();
      }}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          done
            ? { backgroundColor: theme.ink, borderColor: theme.ink }
            : { backgroundColor: theme.surface, borderColor: theme.line2 },
        ]}
      >
        {done && <Check size={14} color={theme.inkOn} strokeWidth={3} />}
      </View>
      <View style={styles.text}>
        <Text
          fg={done ? undefined : fg}
          color="ink3"
          style={done ? styles.doneTitle : undefined}
        >
          {title}
        </Text>
        <View style={styles.meta}>
          {minutes != null && (
            <Text variant="mono" fg={fg}>
              {minutes}m
            </Text>
          )}
          <PriorityPill priority={priority} />
        </View>
      </View>
    </Pressable>
  );

  if (!onDelete) return row;

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={56}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${title}`}
          onPress={onDelete}
          style={[styles.delete, { backgroundColor: theme.blush }]}
        >
          <Trash size={18} color={theme.onBlush} />
          <Text variant="label" color="onBlush">
            Delete
          </Text>
        </Pressable>
      )}
    >
      {row}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    minHeight: size.hit,
    paddingVertical: space.sm,
  },
  box: {
    width: size.checkbox,
    height: size.checkbox,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  text: { flex: 1, gap: space.xs },
  doneTitle: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  delete: {
    width: 88,
    marginLeft: space.sm,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
});
