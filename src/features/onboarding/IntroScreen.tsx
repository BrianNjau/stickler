import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { markIntroSeen } from '@/lib/firstRun';
import { BrandMark, Button, radius, size, space, Text, useReducedMotion, useTheme } from '@/ui';
import { ArrowRight } from '@/ui/icons';

import { introCards } from './copy';
import { IntroArt } from './IntroArt';

const LAST = introCards.length - 1;

/** docs/design/Intro 1–3. Shown once per install; Skip is on every card. */
export function IntroScreen() {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const pager = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  // Navigate first, then flip the flag: the intro route is guarded and disappears once it is seen.
  const finish = () => {
    router.replace('/sign-in');
    markIntroSeen();
  };

  const goTo = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: !reduced });
    setIndex(i);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index && i >= 0 && i <= LAST) setIndex(i);
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.ground, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.column} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        <View style={styles.topBar}>
          <BrandMark size={28} way="mono" />
          <Pressable
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel="Skip the intro"
            hitSlop={8}
            style={styles.skip}
          >
            <Text variant="small" color="ink2">
              Skip
            </Text>
          </Pressable>
        </View>

        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          style={styles.fill}
        >
          {width > 0 &&
            introCards.map((card, i) => (
              <ScrollView
                key={card.key}
                style={{ width }}
                contentContainerStyle={styles.page}
                accessibilityElementsHidden={i !== index}
                importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}
              >
                <View style={styles.artArea}>
                  <IntroArt which={card.key} />
                </View>
                <View style={styles.copy}>
                  <Text variant="h1" accessibilityRole="header">
                    {card.title}
                  </Text>
                  <Text color="ink2">{card.body}</Text>
                </View>
              </ScrollView>
            ))}
        </ScrollView>

        <View style={styles.footer}>
          <View
            style={styles.dots}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Card ${index + 1} of ${introCards.length}`}
          >
            {introCards.map((card, i) => (
              <View
                key={card.key}
                style={[
                  styles.dot,
                  i === index ? [styles.dotActive, { backgroundColor: theme.ink }] : { backgroundColor: theme.line2 },
                ]}
              />
            ))}
          </View>
          <Button
            label={index === LAST ? 'Let’s go' : 'Next'}
            icon={index === LAST ? ArrowRight : undefined}
            iconPosition="trailing"
            onPress={index === LAST ? finish : () => goTo(index + 1)}
            style={styles.next}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // The intro is a phone layout; on wide screens it stays a phone-width column, centred.
  column: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: size.gutter + space.xs,
    minHeight: size.hit + space.md,
  },
  skip: { minHeight: size.hit, minWidth: size.hit, alignItems: 'flex-end', justifyContent: 'center' },
  page: { flexGrow: 1, justifyContent: 'space-between', paddingBottom: space.xl },
  artArea: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.xl },
  copy: { gap: space.md, paddingHorizontal: size.gutter + space.xs },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xl,
    paddingHorizontal: size.gutter + space.xs,
    paddingBottom: space.xl,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  dot: { width: 6, height: 6, borderRadius: radius.pill },
  dotActive: { width: 22, height: 5 },
  next: { flex: 1 },
});
