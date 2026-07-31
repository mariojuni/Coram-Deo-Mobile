import React from 'react';
import { AccessibleButton, AccessibleButtonProps } from './AccessibleButton';
import { ViewStyle, StyleProp } from 'react-native';

export interface AccessibleIconButtonProps extends Omit<AccessibleButtonProps, 'children'> {
  icon: React.ReactNode;
  iconStyle?: StyleProp<ViewStyle>;
}

export const AccessibleIconButton: React.FC<AccessibleIconButtonProps> = ({
  icon,
  style,
  iconStyle,
  ...props
}) => {
  return (
    <AccessibleButton
      style={[{ justifyContent: 'center', alignItems: 'center' }, style]}
      {...props}
    >
      {icon}
    </AccessibleButton>
  );
};
