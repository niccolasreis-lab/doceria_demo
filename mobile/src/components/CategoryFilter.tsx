import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ProductCategory } from '../types';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../constants/theme';
import { getCategoryLabel } from '../services/api';
import { triggerHaptic } from '../services/haptics';

interface CategoryFilterProps {
  selectedCategory: ProductCategory;
  onSelectCategory: (cat: ProductCategory) => void;
}

const CATEGORIES: { id: ProductCategory; label: string; icon: string }[] = [
  { id: 'TODOS', label: 'Todos', icon: '✨' },
  { id: 'BOLOS', label: 'Bolos', icon: '🍰' },
  { id: 'TORTAS', label: 'Tortas', icon: '🥧' },
  { id: 'DOCES_FINOS', label: 'Doces Finos', icon: '🍬' },
  { id: 'CAFES', label: 'Cafés', icon: '☕' },
  { id: 'BEBIDAS', label: 'Bebidas', icon: '🥤' },
  { id: 'SALGADOS', label: 'Salgados', icon: '🥐' },
  { id: 'SOBREMESAS_ESPECIAIS', label: 'Especiais', icon: '🍨' },
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const handleSelect = (cat: ProductCategory) => {
    triggerHaptic('light');
    onSelectCategory(cat);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {CATEGORIES.map((item) => {
        const isSelected = selectedCategory === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            onPress={() => handleSelect(item.id)}
            style={[
              styles.chip,
              isSelected ? styles.chipSelected : styles.chipUnselected,
            ]}
          >
            <Text style={styles.chipIcon}>{item.icon}</Text>
            <Text
              style={[
                styles.chipText,
                isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  chipUnselected: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.border,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: COLORS.textInverted,
  },
  chipTextUnselected: {
    color: COLORS.textSecondary,
  },
});
