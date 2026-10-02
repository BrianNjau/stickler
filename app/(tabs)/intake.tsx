import { PlaceholderScreen } from '@/ui';

export default function IntakeRoute() {
  return (
    <PlaceholderScreen
      title="New goal"
      back={{ fallbackHref: '/' }}
      body="Describe what you want in your own words. The goal intake wizard arrives in WP2."
    />
  );
}
