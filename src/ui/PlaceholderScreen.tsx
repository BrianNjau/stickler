import { Card } from './Card';
import { Screen } from './Screen';
import { ScreenHeader, type ScreenHeaderProps } from './ScreenHeader';
import { Text } from './Text';

/** Holding screen for routes whose work package hasn't landed. Keeps the nav complete. */
export function PlaceholderScreen({ body, ...header }: ScreenHeaderProps & { body: string }) {
  return (
    <Screen>
      <ScreenHeader {...header} />
      <Card>
        <Text color="ink2">{body}</Text>
      </Card>
    </Screen>
  );
}
