import { Card } from './Card';
import { Screen } from './Screen';
import { Text } from './Text';

/** Holding screen for tabs whose work package hasn't landed. Keeps the nav complete from day one. */
export function PlaceholderScreen({ title, body }: { title: string; body: string }) {
  return (
    <Screen>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      <Card>
        <Text tone="ink2">{body}</Text>
      </Card>
    </Screen>
  );
}
