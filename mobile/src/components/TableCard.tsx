import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MobileTable, MobileOrder, MesaStatus } from '../types';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { StatusBadge } from './StatusBadge';
import { formatCurrency, formatElapsedTime } from '../services/api';
import { Users, Clock, Receipt, PlusCircle, AlertTriangle } from 'lucide-react-native';
import { triggerHaptic } from '../services/haptics';

interface TableCardProps {
  table: MobileTable;
  activeOrder?: MobileOrder;
  onPress: () => void;
  onOpenOrder?: () => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  activeOrder,
  onPress,
  onOpenOrder,
}) => {
  const isLivre = table.status === MesaStatus.LIVRE;
  const isPedindoConta = table.status === MesaStatus.PEDINDO_CONTA;
  const isOcupada = table.status === MesaStatus.OCUPADA;

  const handlePress = () => {
    triggerHaptic('light');
    if (isLivre && onOpenOrder) {
      onOpenOrder();
    } else {
      onPress();
    }
  };

  let borderColor = COLORS.border;
  let bgTint = COLORS.bgCard;
  let numberBadgeBg = COLORS.bgSurface;
  let numberTextColor = COLORS.textPrimary;

  if (isLivre) {
    borderColor = COLORS.statusLivreBorder;
    numberBadgeBg = COLORS.statusLivreBg;
    numberTextColor = COLORS.statusLivre;
  } else if (isPedindoConta) {
    borderColor = COLORS.statusPedindoConta;
    bgTint = '#FFFDF5';
    numberBadgeBg = COLORS.statusPedindoContaBg;
    numberTextColor = COLORS.statusPedindoConta;
  } else if (isOcupada) {
    borderColor = COLORS.statusOcupadaBorder;
    numberBadgeBg = COLORS.statusOcupadaBg;
    numberTextColor = COLORS.statusOcupada;
  }

  const itemsCount = activeOrder?.items.reduce((acc, i) => acc + i.quantity, 0) || 0;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[
        styles.card,
        SHADOWS.card,
        {
          borderColor,
          backgroundColor: bgTint,
          borderWidth: isPedindoConta ? 2 : 1,
        },
      ]}
    >
      {/* Header do Card */}
      <View style={styles.cardHeader}>
        <View style={[styles.numberBadge, { backgroundColor: numberBadgeBg }]}>
          <Text style={[styles.numberText, { color: numberTextColor }]}>
            {table.number < 10 ? `0${table.number}` : table.number}
          </Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.tableName}>Mesa {table.number}</Text>
          <View style={styles.metaRow}>
            <Users size={12} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{table.seats} lugares</Text>
            {table.sector && (
              <Text style={styles.sectorText}>• {table.sector.replace('_', ' ')}</Text>
            )}
          </View>
        </View>

        <StatusBadge status={table.status} type="mesa" size="sm" />
      </View>

      {/* Conteúdo Contextual do Card */}
      {isLivre ? (
        <View style={styles.livreContainer}>
          <View style={styles.livrePrompt}>
            <PlusCircle size={18} color={COLORS.statusLivre} />
            <Text style={styles.livrePromptText}>Toque para abrir comanda</Text>
          </View>
        </View>
      ) : (
        <View style={styles.occupiedContainer}>
          {/* Alerta pulsante caso esteja pedindo conta */}
          {isPedindoConta && (
            <View style={styles.billAlertBanner}>
              <AlertTriangle size={14} color={COLORS.statusPedindoConta} />
              <Text style={styles.billAlertText}>
                Conta pedida há {formatElapsedTime(table.billRequestedAt)}
              </Text>
            </View>
          )}

          {/* Dados da comanda */}
          <View style={styles.orderDetailsRow}>
            <View style={styles.orderCodeBadge}>
              <Receipt size={12} color={COLORS.primaryDark} />
              <Text style={styles.orderCodeText}>{activeOrder?.code || 'COMANDA'}</Text>
            </View>

            <View style={styles.timeBadge}>
              <Clock size={12} color={COLORS.textSecondary} />
              <Text style={styles.timeText}>{formatElapsedTime(table.occupiedAt)}</Text>
            </View>
          </View>

          {activeOrder?.customerName && (
            <Text style={styles.customerName} numberOfLines={1}>
              Cliente: <Text style={styles.customerNameBold}>{activeOrder.customerName}</Text>
            </Text>
          )}

          {/* Rodapé financeiro do Card */}
          <View style={styles.footerRow}>
            <Text style={styles.itemsCountText}>
              {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
            </Text>
            <Text style={styles.totalValueText}>
              {formatCurrency(activeOrder?.totalCentavos || 0)}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  numberBadge: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
  },
  headerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  tableName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  metaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  sectorText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  livreContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  livrePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  livrePromptText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.statusLivre,
  },
  occupiedContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  billAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.statusPedindoContaBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
    gap: 6,
  },
  billAlertText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.statusPedindoConta,
  },
  orderDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  orderCodeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  customerName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  customerNameBold: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemsCountText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  totalValueText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
});
