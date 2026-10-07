import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { env } from '@/lib/env';
import { resetIntro } from '@/lib/firstRun';
import { Button, Card, Nimbus, Pill, Screen, ScreenHeader, Snitch, space, Text, useTheme } from '@/ui';

function Row({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === 'string' ? (
        <Text variant="small" color="ink3">
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

function MascotRow({ avatar, name, about }: { avatar: ReactNode; name: string; about: string }) {
  return (
    <View style={styles.mascot}>
      {avatar}
      <View style={styles.mascotText}>
        <Text variant="h3">{name}</Text>
        <Text variant="small" color="ink2">
          {about}
        </Text>
      </View>
    </View>
  );
}

const modePill = (mode: 'mock' | 'live') => <Pill label={mode === 'live' ? 'Live' : 'Offline mock'} tint={mode === 'live' ? 'mint' : undefined} />;

// Stub: everything here becomes editable in WP1 (user_settings). Nothing on this screen pretends to be a control yet.
export function SettingsScreen() {
  return (
    <Screen>
      <ScreenHeader title="Settings" back={{ fallbackHref: '/character' }} />

      <Card>
        <Text variant="label" color="ink3">
          Your day
        </Text>
        <View>
          <Row label="Timezone" value="Set at sign-in" />
          <Row label="Workday" value="Set at sign-in" />
          <Row label="Daily capacity" value="Set at sign-in" last />
        </View>
      </Card>

      <Card>
        <Text variant="label" color="ink3">
          Mascots
        </Text>
        <MascotRow
          avatar={<Nimbus mood="happy" size={56} />}
          name="Nimbus"
          about="Praise, puns and recovery coaching."
        />
        <MascotRow
          avatar={<Snitch mood="watch" size={56} />}
          name="The Snitch"
          about="Audits the paperwork. You will be able to switch it off completely."
        />
      </Card>

      <Card>
        <Text variant="label" color="ink3">
          Services
        </Text>
        <View>
          <Row label="Plan generation" value={modePill(env.aiMode)} />
          <Row label="Commute times" value={modePill(env.mapsMode)} last />
        </View>
      </Card>

      {/* Development only: the intro shows once per install, so this is the way to see it again. */}
      {__DEV__ && <Button label="Replay intro (dev)" variant="secondary" size="md" onPress={resetIntro} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingVertical: space.sm },
  rowLabel: { flex: 1 },
  mascot: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mascotText: { flex: 1, gap: 2 },
});
