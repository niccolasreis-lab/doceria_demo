import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MobileOrder } from '../types';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { formatCurrency } from '../services/api';
import { Button } from '../components/Button';
import { AlertTriangle, BellRing, Receipt, X, ShieldAlert } from 'lucide-react-native';
import { triggerHaptic } from '../services/haptics';

interface PedirContaModalProps {
  visible: boolean;
  order: MobileOrder;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const PedirContaModal: React.FC<PedirContaModalProps> = ({
  visible,
  order,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const isEmpty = !order.items || order.items.length === 0 || order.subtotalCentavos <= 0;

  const handleConfirm = async () => {
    if (isEmpty) {
      setErrorMsg('Não é permitido solicitar a conta de uma comanda sem itens lançados.');
      await triggerHaptic('error');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await onConfirm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao solicitar conta.');
      await triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, SHADOWS.cardHover]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <BellRing size={24} color={COLORS.statusPedindoConta} />
            </View>

            <View style={styles.headerTitles}>
              <Text style={styles.title}>Pedir Fechamento de Conta</Text>
              <Text style={styles.subtitle}>
                Mesa {order.tableNumber} • Comanda {order.code}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {isEmpty ? (
              <View style={styles.emptyWarning}>
                <ShieldAlert size={28} color={COLORS.danger} />
                <Text style={styles.emptyWarningTitle}>Comanda Sem Consumo</Text>
                <Text style={styles.emptyWarningText}>
                  Não é possível solicitar a conta de uma mesa vazia. Lance itens pelo catálogo
                  ou solicite o cancelamento da comanda ao gerente.
                </Text>
              </View>
            ) : (
              <>
                {/* Resumo Financeiro */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Itens Lançados:</Text>
                    <Text style={styles.summaryValue}>
                      {order.items.reduce((acc, i) => acc + i.quantity, 0)} unidades
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal:</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(order.subtotalCentavos)}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Serviço (10%):</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(order.serviceFeeCentavos)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total da Conta:</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(order.totalCentavos)}
                    </Text>
                  </View>
                </View>

                {/* Aviso do Alerta Realtime ao Caixa */}
                <View style={styles.alertNotice}>
                  <AlertTriangle size={18} color={COLORS.statusPedindoConta} />
                  <Text style={styles.alertNoticeText}>
                    O Operador de Caixa receberá um alerta em tempo real no painel web para
                    conferência dos itens, recebimento e emissão do cupom fiscal.
                  </Text>
                </View>
              </>
            )}

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </ScrollView>

          {/* Ações */}
          <View style={styles.footer}>
            {!isEmpty && (
              <Button
                title="Confirmar Pedido de Conta"
                onPress={handleConfirm}
                variant="warning"
                size="lg"
                loading={loading}
                icon={<BellRing size={18} color={COLORS.textInverted} />}
                style={styles.confirmBtn}
              />
            )}

            <Button
              title="Voltar / Continuar Mesa"
              onPress={onClose}
              variant="secondary"
              size="md"
              disabled={loading}
              style={styles.cancelBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.statusPedindoContaBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.bgSurface,
    borderRadius: BORDER_RADIUS.full,
  },
  body: {
    paddingVertical: SPACING.md,
  },
  emptyWarning: {
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: '#FEF2F2',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: SPACING.xs,
  },
  emptyWarningTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
  emptyWarningText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  alertNotice: {
    flexDirection: 'row',
    backgroundColor: COLORS.statusPedindoContaBg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.statusPedindoContaBorder,
    gap: SPACING.sm,
  },
  alertNoticeText: {
    fontSize: FONT_SIZES.xs,
    color: '#92400E',
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  footer: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  confirmBtn: {
    width: '100%',
  },
  cancelBtn: {
    width: '100%',
  },
});
