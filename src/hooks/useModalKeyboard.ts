import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, ScrollView, ViewStyle } from 'react-native';

interface UseModalKeyboardOptions {
  heightRatio?: number;
  offset?: number;
  backgroundColor?: string;
}

export function useModalKeyboard(options: UseModalKeyboardOptions = {}) {
  const { heightRatio = 0.85, offset = 12, backgroundColor = '#FAFAFA' } = options;

  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const changeEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const changeSub = Keyboard.addListener(changeEvent, (e) => {
      if (e.endCoordinates.height > 0) {
        setKeyboardHeight(e.endCoordinates.height);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      changeSub.remove();
      hideSub.remove();
    };
  }, []);

  const isKeyboardOpen = keyboardHeight > 0;
  const windowHeight = Dimensions.get('window').height;
  const keyboardTopInSheet = Math.max(150, windowHeight * heightRatio - keyboardHeight - offset);

  const appModalProps = {
    heightRatio,
    avoidKeyboard: false,
    dynamicHeight: !isKeyboardOpen,
    containerStyle: { paddingHorizontal: 0, paddingBottom: 0, backgroundColor } as ViewStyle,
  };

  const scrollViewStyle: ViewStyle = isKeyboardOpen
    ? { flex: 1, maxHeight: keyboardTopInSheet }
    : { flexGrow: 0 };

  return {
    keyboardHeight,
    isKeyboardOpen,
    keyboardTopInSheet,
    scrollViewRef,
    appModalProps,
    scrollViewStyle,
  };
}
