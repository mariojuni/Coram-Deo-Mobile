import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { render, screen } from '@/test-utils/render';
import { Fonts } from '@/constants/theme';
import '@/utils/initDefaultFont';

describe('App Font Configuration', () => {
  it('defines Inter for sans, Lora for serif, and Inter for rounded in theme Fonts', () => {
    expect(Fonts.sans).toBe('Inter');
    expect(Fonts.serif).toBe('Lora');
    expect(Fonts.rounded).toBe('Inter');
  });

  it('applies Inter font by default to Text component', async () => {
    await render(
      <View>
        <Text testID="default-text">Default text</Text>
      </View>
    );

    const element = screen.getByTestId('default-text');
    const flatStyle = Array.isArray(element.props.style)
      ? Object.assign({}, ...element.props.style.filter(Boolean))
      : element.props.style;

    expect(flatStyle?.fontFamily).toBe('Inter');
  });

  it('applies Inter font for Bible reading', async () => {
    await render(
      <View>
        <Text testID="bible-text" style={{ fontFamily: 'Inter', fontSize: 18 }}>
          In the beginning was the Word
        </Text>
      </View>
    );

    const element = screen.getByTestId('bible-text');
    const flatStyle = Array.isArray(element.props.style)
      ? Object.assign({}, ...element.props.style.filter(Boolean))
      : element.props.style;

    expect(flatStyle?.fontFamily).toBe('Inter');
    expect(flatStyle?.fontSize).toBe(18);
  });

  it('applies Inter font by default to TextInput component', async () => {
    await render(
      <View>
        <TextInput testID="default-input" placeholder="Enter text" />
      </View>
    );

    const element = screen.getByTestId('default-input');
    const flatStyle = Array.isArray(element.props.style)
      ? Object.assign({}, ...element.props.style.filter(Boolean))
      : element.props.style;

    expect(flatStyle?.fontFamily).toBe('Inter');
  });

  it('applies Inter font to styled text elements as used in Home screen', async () => {
    await render(
      <View>
        <Text testID="home-greeting" style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>
          Good morning
        </Text>
        <Text testID="home-name" style={[{ fontSize: 22, fontWeight: '700' }, { color: '#111827' }]}>
          Mario
        </Text>
      </View>
    );

    const greeting = screen.getByTestId('home-greeting');
    const greetingStyle = Array.isArray(greeting.props.style)
      ? Object.assign({}, ...greeting.props.style.filter(Boolean))
      : greeting.props.style;
    expect(greetingStyle?.fontFamily).toBe('Inter');

    const name = screen.getByTestId('home-name');
    const nameStyle = Array.isArray(name.props.style)
      ? Object.assign({}, ...name.props.style.filter(Boolean))
      : name.props.style;
    expect(nameStyle?.fontFamily).toBe('Inter');
  });

  it('verifies Verse of the Day uses Lora for scripture and Inter for labels on Home screen', async () => {
    await render(
      <View>
        <Text testID="verse-label" style={{ fontSize: 13, fontWeight: '600' }}>
          VERSE OF THE DAY
        </Text>
        <Text testID="verse-scripture" style={{ fontFamily: Fonts.serif, fontSize: 16 }}>
          For God so loved the world...
        </Text>
      </View>
    );

    const label = screen.getByTestId('verse-label');
    const labelStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style.filter(Boolean))
      : label.props.style;
    expect(labelStyle?.fontFamily).toBe('Inter');

    const scripture = screen.getByTestId('verse-scripture');
    const scriptureStyle = Array.isArray(scripture.props.style)
      ? Object.assign({}, ...scripture.props.style.filter(Boolean))
      : scripture.props.style;
    expect(scriptureStyle?.fontFamily).toBe('Lora');
  });
});
