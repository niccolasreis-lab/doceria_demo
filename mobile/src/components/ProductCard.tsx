import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MobileProduct } from '../types';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { formatCurrency } from '../services/api';
import { Plus, Tag } from 'lucide-react-native';
import { triggerHaptic } from '../services/haptics';

interface ProductCardProps {
  product: MobileProduct;
  onPress: () => void;
  onQuickAdd?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onQuickAdd,
}) => {
  const handleQuickAdd = (e: any) => {
    e.stopPropagation();
    triggerHaptic('light');
    if (onQuickAdd) onQuickAdd();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      style={[styles.card, SHADOWS.card]}
    >
      <View style={styles.cardContent}>
        {/* Top Info */}
        <View style={styles.topRow}>
          <View style={styles.categoryBadge}>
            <Tag size={10} color={COLORS.primaryDark} />
            <Text style={styles.categoryText}>{product.category.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.skuText}>{product.sku}</Text>
        </View>

        {/* Nome do Produto */}
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Descrição */}
        {product.description && (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        {/* Alergênicos se houver */}
        {product.allergens && product.allergens.length > 0 && (
          <View style={styles.allergensRow}>
            {product.allergens.map((alg, idx) => (
              <View key={idx} style={styles.allergenChip}>
                <Text style={styles.allergenText}>{alg}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Rodapé: Preço e Botão de Adição */}
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.priceLabel}>Preço Unitário</Text>
            <Text style={styles.priceText}>{formatCurrency(product.priceCentavos)}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleQuickAdd}
            style={styles.addButton}
          >
            <Plus size={16} color={COLORS.textInverted} />
            <Text style={styles.addButtonText}>Lançar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  categoryText: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  skuText: {
    fontSize: FONT_SIZES.xs - 1,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  productName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
    marginBottom: 4,
  },
  description: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  allergensRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  allergenChip: {
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.sm,
  },
  allergenText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  priceText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.textInverted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
});
