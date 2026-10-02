import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Nimbus, space, Text } from '@/ui';
import { ArrowRight } from '@/ui/icons';

export function TodayEmpty() {
  return (
    <Card>
      <View style={styles.art}>
        <Nimbus mood="idle" size={120} />
      </View>
      <Text variant="h2" accessibilityRole="header">
        No plan yet
      </Text>
      <Text color="ink2">
        Describe a goal in your own words and Focus Strip turns it into a path, a quest library and
        today’s blocks.
      </Text>
      <Button label="Set your first goal" icon={ArrowRight} onPress={() => router.push('/intake')} style={styles.cta} />
    </Card>
  );
}

const styles = StyleSheet.create({
  art: { alignItems: 'center', paddingVertical: space.md },
  cta: { marginTop: space.sm },
});
