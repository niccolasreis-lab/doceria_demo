import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MobileOrderItem } from '../types';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../constants/theme';
import { formatCurrency, formatTime } from '../services/api';
import { Trash2, MessageSquare, Clock } from 'lucide-react-native';
import { triggerHaptic } from '../services/haptics';

interface OrderItemRowProps {
  item: MobileOrderItem;
  onRemove?: () => void;
  canRemove?: boolean;
}

export const OrderItemRow: React.FC<OrderItemRowProps> = ({
  item,
  onRemove,
  canRemove = false,
}) => {
  const handleRemove = () => {
    triggerHaptic('medium');
    if (onRemove) onRemove();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Quantidade Badge */}
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyText}>{item.quantity}x</Text>
        </View>

        {/* Nome do Item */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.productName}</Text>
          <Text style={styles.unitPriceText}>
            {formatCurrency(item.unitPriceCentavos)} unitário
          </Text>
        </View>

        {/* Subtotal */}
        <View style={styles.priceContainer}>
          <Text style={styles.subtotalText}>{formatCurrency(item.subtotalCentavos)}</Text>
        </View>

        {/* Ação de Remoção opcional */}
        {canRemove && onRemove && (
          <TouchableOpacity
            onPress={handleRemove}
            style={styles.deleteButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={16} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Observações do Item se houver */}
      {item.notes && (
        <View style={styles.notesContainer}>
          <MessageSquare size={12} color={COLORS.gold} />
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}

      {/* Metadados de lançamento */}
      <View style={styles.metaRow}>
        <View style={styles.timeContainer}>
          <Clock size={10} color={COLORS.textMuted} />
          <Text style={styles.metaTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.metaWaiter}>Por {item.addedByName}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  qtyText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  unitPriceText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  subtotalText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  deleteButton: {
    marginLeft: SPACING.md,
    padding: 4,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.goldBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: 8,
    gap: 6,
  },
  notesText: {
    fontSize: FONT_SIZES.xs,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  metaWaiter: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
});
