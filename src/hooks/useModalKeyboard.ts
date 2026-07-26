import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, ScrollView, ViewStyle } from 'react-native';

interface UseModalKeyboardOptions {
  heightRatio?: number;
  offset?: number;
  noSuggestionOffset?: number;
  backgroundColor?: string;
  dynamicHeight?: boolean;
}

export function useModalKeyboard(options: UseModalKeyboardOptions = {}) {
  const { 
    heightRatio = 0.85, 
    offset = 12, 
    noSuggestionOffset = 0,
    backgroundColor = '#FAFAFA',
    dynamicHeight = false
  } = options;

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
  // Standard soft keyboard on modern devices is ~290px+ with suggestion/autofill bar vs ~216-260px without
  const hasSuggestionBar = keyboardHeight > 290;
  const activeOffset = hasSuggestionBar ? offset : noSuggestionOffset;

  const windowHeight = Dimensions.get('window').height;
  const keyboardTopInSheet = Math.max(150, windowHeight * heightRatio - keyboardHeight - activeOffset);

  const appModalProps = {
    heightRatio,
    avoidKeyboard: false,
    dynamicHeight: dynamicHeight ? !isKeyboardOpen : false,
    containerStyle: { paddingHorizontal: 0, paddingBottom: 0, backgroundColor } as ViewStyle,
  };

  const scrollViewStyle: ViewStyle = isKeyboardOpen
    ? { flex: 1, maxHeight: keyboardTopInSheet }
    : { flex: 1 };

  return {
    keyboardHeight,
    isKeyboardOpen,
    hasSuggestionBar,
    keyboardTopInSheet,
    scrollViewRef,
    appModalProps,
    scrollViewStyle,
  };
}
