import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../constants/theme';
import { triggerHaptic } from '../services/haptics';

interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  max = 99,
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const btnSize = isSm ? 28 : isLg ? 44 : 36;

  const handleDecrease = () => {
    if (quantity > min) {
      triggerHaptic('light');
      onDecrease();
    }
  };

  const handleIncrease = () => {
    if (quantity < max) {
      triggerHaptic('light');
      onIncrease();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={handleDecrease}
        disabled={quantity <= min}
        style={[
          styles.button,
          {
            width: btnSize,
            height: btnSize,
            borderRadius: btnSize / 2,
            opacity: quantity <= min ? 0.4 : 1,
          },
        ]}
      >
        <Text style={[styles.btnText, { fontSize: isSm ? 14 : isLg ? 22 : 18 }]}>−</Text>
      </TouchableOpacity>

      <Text
        style={[
          styles.quantityText,
          {
            fontSize: isSm ? FONT_SIZES.sm : isLg ? FONT_SIZES.xl : FONT_SIZES.md,
            minWidth: isSm ? 24 : 36,
          },
        ]}
      >
        {quantity}
      </Text>

      <TouchableOpacity
        activeOpacity={0.6}
        onPress={handleIncrease}
        disabled={quantity >= max}
        style={[
          styles.button,
          styles.btnIncrease,
          {
            width: btnSize,
            height: btnSize,
            borderRadius: btnSize / 2,
            opacity: quantity >= max ? 0.4 : 1,
          },
        ]}
      >
        <Text style={[styles.btnText, styles.btnIncreaseText, { fontSize: isSm ? 14 : isLg ? 22 : 18 }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSurface,
    borderRadius: BORDER_RADIUS.full,
    padding: 3,
  },
  button: {
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnIncrease: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  btnText: {
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  btnIncreaseText: {
    color: COLORS.textInverted,
  },
  quantityText: {
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xs,
  },
});
