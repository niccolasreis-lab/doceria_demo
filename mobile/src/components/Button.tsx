import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../constants/theme';
import { triggerHaptic } from '../services/haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptic('light');
    onPress();
  };

  let bg = COLORS.primary;
  let textCol = COLORS.textInverted;
  let borderCol = 'transparent';

  switch (variant) {
    case 'primary':
      bg = COLORS.primary;
      textCol = COLORS.textInverted;
      break;
    case 'secondary':
      bg = COLORS.primaryLight;
      textCol = COLORS.primaryDark;
      break;
    case 'outline':
      bg = 'transparent';
      textCol = COLORS.primary;
      borderCol = COLORS.primary;
      break;
    case 'danger':
      bg = COLORS.danger;
      textCol = COLORS.textInverted;
      break;
    case 'success':
      bg = COLORS.success;
      textCol = COLORS.textInverted;
      break;
    case 'warning':
      bg = COLORS.warning;
      textCol = COLORS.textInverted;
      break;
  }

  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: bg,
          borderColor: borderCol,
          paddingVertical: isSm ? 8 : isLg ? 16 : 12,
          paddingHorizontal: isSm ? 12 : isLg ? 24 : 16,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textCol} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.text,
              {
                color: textCol,
                fontSize: isSm ? FONT_SIZES.sm : isLg ? FONT_SIZES.lg : FONT_SIZES.md,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: SPACING.sm,
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
