import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useComanda } from '../context/ComandaContext';
import { ComandaStatus, MesaStatus } from '../types';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { StatusBadge } from '../components/StatusBadge';
import { OrderItemRow } from '../components/OrderItemRow';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PedirContaModal } from './PedirContaModal';
import { formatCurrency, formatElapsedTime, formatTime } from '../services/api';
import {
  ArrowLeft,
  ShoppingBag,
  BellRing,
  Clock,
  User,
  Users,
  Plus,
  RefreshCw,
  AlertTriangle,
  Receipt,
} from 'lucide-react-native';
import { triggerHaptic } from '../services/haptics';

interface ComandaDetalhesScreenProps {
  route: any;
  navigation: any;
}

export const ComandaDetalhesScreen: React.FC<ComandaDetalhesScreenProps> = ({
  route,
  navigation,
}) => {
  const { tableId } = route.params || {};
  const {
    tables,
    orders,
    solicitarConta,
    reabrirComanda,
    removerItemComanda,
  } = useComanda();

  const [pedirContaModalVisible, setPedirContaModalVisible] = useState<boolean>(false);

  const currentTable = tables.find((t) => t.id === tableId);
  const currentOrder = orders.find((o) => o.id === currentTable?.currentOrderId);

  if (!currentTable || !currentOrder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={COLORS.textInverted} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Detalhes da Mesa</Text>
        </View>
        <EmptyState
          title="Mesa ou comanda não encontrada"
          description="A mesa selecionada não possui uma comanda ativa no momento."
          actionTitle="Voltar ao Mapa"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const isPedindoConta = currentOrder.status === ComandaStatus.PEDINDO_CONTA;
  const isAberta = currentOrder.status === ComandaStatus.ABERTA;

  const handleRequestBill = async () => {
    try {
      await solicitarConta(currentOrder.id);
      await triggerHaptic('warning');
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao pedir conta.');
    }
  };

  const handleReopen = async () => {
    try {
      await reabrirComanda(currentOrder.id);
      await triggerHaptic('success');
      Alert.alert('Comanda Reaberta', 'A comanda está aberta novamente para lançamentos.');
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao reabrir comanda.');
    }
  };

  const handleRemoveItem = async (itemId: string, itemName: string) => {
    Alert.alert(
      'Cancelar Item',
      `Deseja realmente remover "${itemName}" da comanda?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Remover',
          style: 'destructive',
          onPress: async () => {
            await removerItemComanda(currentOrder.id, itemId);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={COLORS.textInverted} />
        </TouchableOpacity>

        <View style={styles.topBarTitles}>
          <Text style={styles.topBarTitle}>
            Mesa {currentTable.number < 10 ? `0${currentTable.number}` : currentTable.number}
          </Text>
          <Text style={styles.topBarSubtitle}>
            Comanda {currentOrder.code} • {currentTable.sector?.replace('_', ' ')}
          </Text>
        </View>

        <StatusBadge status={currentOrder.status} type="comanda" size="sm" />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner de Status Especial se Pedindo Conta */}
        {isPedindoConta && (
          <View style={styles.billNoticeCard}>
            <View style={styles.billNoticeHeader}>
              <AlertTriangle size={18} color={COLORS.statusPedindoConta} />
              <Text style={styles.billNoticeTitle}>Conta Solicitada ao Caixa</Text>
            </View>
            <Text style={styles.billNoticeText}>
              Esta mesa está aguardando fechamento e recebimento no caixa (pedida às{' '}
              {formatTime(currentOrder.billRequestedAt)}).
            </Text>
            <TouchableOpacity onPress={handleReopen} style={styles.reopenBtn}>
              <RefreshCw size={14} color={COLORS.primaryDark} />
              <Text style={styles.reopenBtnText}>Reabrir para novos itens</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Card de Metadados da Mesa */}
        <View style={[styles.metaCard, SHADOWS.card]}>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <View style={styles.metaIcon}>
                <Clock size={14} color={COLORS.primaryDark} />
              </View>
              <View>
                <Text style={styles.metaLabel}>Tempo Aberta</Text>
                <Text style={styles.metaValue}>
                  {formatElapsedTime(currentOrder.openedAt)}
                </Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <View style={styles.metaIcon}>
                <User size={14} color={COLORS.primaryDark} />
              </View>
              <View>
                <Text style={styles.metaLabel}>Atendente</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {currentOrder.waiterName.split(' ')[0]}
                </Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <View style={styles.metaIcon}>
                <Users size={14} color={COLORS.primaryDark} />
              </View>
              <View>
                <Text style={styles.metaLabel}>Ocupantes</Text>
                <Text style={styles.metaValue}>
                  {currentOrder.partySize || currentTable.seats} pessoas
                </Text>
              </View>
            </View>
          </View>

          {currentOrder.customerName && (
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Cliente: </Text>
              <Text style={styles.customerValue}>{currentOrder.customerName}</Text>
            </View>
          )}

          {currentOrder.notes && (
            <View style={styles.orderNotesRow}>
              <Text style={styles.orderNotesLabel}>Obs: </Text>
              <Text style={styles.orderNotesValue}>{currentOrder.notes}</Text>
            </View>
          )}
        </View>

        {/* Seção dos Itens Lançados */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Extrato de Consumo ({currentOrder.items.length} {currentOrder.items.length === 1 ? 'item' : 'itens'})
          </Text>

          {isAberta && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Catalogo', { orderId: currentOrder.id })}
              style={styles.addMoreBtn}
            >
              <Plus size={14} color={COLORS.primary} />
              <Text style={styles.addMoreText}>+ Adicionar Item</Text>
            </TouchableOpacity>
          )}
        </View>

        {currentOrder.items.length === 0 ? (
          <EmptyState
            icon={<Receipt size={36} color={COLORS.textMuted} />}
            title="Nenhum item lançado ainda"
            description="Esta comanda está aberta mas ainda não possui produtos adicionados."
            actionTitle="Abrir Catálogo de Produtos"
            onAction={() => navigation.navigate('Catalogo', { orderId: currentOrder.id })}
          />
        ) : (
          <View style={styles.itemsList}>
            {currentOrder.items.map((item) => (
              <OrderItemRow
                key={item.id}
                item={item}
                canRemove={isAberta}
                onRemove={() => handleRemoveItem(item.id, item.productName)}
              />
            ))}
          </View>
        )}

        {/* Resumo Financeiro da Comanda */}
        <View style={[styles.financialCard, SHADOWS.card]}>
          <Text style={styles.financialTitle}>Demonstrativo Financeiro</Text>

          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Subtotal dos Produtos</Text>
            <Text style={styles.financialValue}>
              {formatCurrency(currentOrder.subtotalCentavos)}
            </Text>
          </View>

          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Taxa de Serviço ({currentOrder.serviceFeePercentage}%)</Text>
            <Text style={styles.financialValue}>
              {formatCurrency(currentOrder.serviceFeeCentavos)}
            </Text>
          </View>

          {currentOrder.discountCentavos > 0 && (
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: COLORS.success }]}>Desconto Aplicado</Text>
              <Text style={[styles.financialValue, { color: COLORS.success }]}>
                - {formatCurrency(currentOrder.discountCentavos)}
              </Text>
            </View>
          )}

          <View style={styles.financialDivider} />

          <View style={styles.financialTotalRow}>
            <Text style={styles.financialTotalLabel}>Total a Pagar</Text>
            <Text style={styles.financialTotalValue}>
              {formatCurrency(currentOrder.totalCentavos)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Barra Inferior de Ações do Atendente */}
      <View style={[styles.actionBar, SHADOWS.cardHover]}>
        {isAberta ? (
          <View style={styles.actionButtonsRow}>
            <Button
              title="Lançar Itens"
              onPress={() => navigation.navigate('Catalogo', { orderId: currentOrder.id })}
              variant="secondary"
              size="lg"
              icon={<ShoppingBag size={18} color={COLORS.primaryDark} />}
              style={styles.btnLaunch}
            />

            <Button
              title="Pedir Conta"
              onPress={() => setPedirContaModalVisible(true)}
              variant="warning"
              size="lg"
              icon={<BellRing size={18} color={COLORS.textInverted} />}
              style={styles.btnBill}
            />
          </View>
        ) : (
          <View style={styles.actionButtonsRow}>
            <Button
              title="Reabrir Comanda"
              onPress={handleReopen}
              variant="secondary"
              size="lg"
              icon={<RefreshCw size={18} color={COLORS.primaryDark} />}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </View>

      {/* Modal de Pedir Conta */}
      {pedirContaModalVisible && (
        <PedirContaModal
          visible={pedirContaModalVisible}
          order={currentOrder}
          onClose={() => setPedirContaModalVisible(false)}
          onConfirm={handleRequestBill}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  topBarTitles: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.textInverted,
  },
  topBarSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primaryLight,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  billNoticeCard: {
    backgroundColor: COLORS.statusPedindoContaBg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.statusPedindoContaBorder,
    marginBottom: SPACING.md,
  },
  billNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  billNoticeTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    color: COLORS.statusPedindoConta,
  },
  billNoticeText: {
    fontSize: FONT_SIZES.xs,
    color: '#92400E',
    lineHeight: 16,
    marginBottom: SPACING.sm,
  },
  reopenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reopenBtnText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  metaCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  customerLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  customerValue: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  orderNotesRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  orderNotesLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  orderNotesValue: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  addMoreText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  itemsList: {
    marginBottom: SPACING.md,
  },
  financialCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xxxl,
  },
  financialTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  financialLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  financialValue: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  financialDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  financialTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  financialTotalLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  financialTotalValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  actionBar: {
    backgroundColor: COLORS.bgCard,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  btnLaunch: {
    flex: 1,
  },
  btnBill: {
    flex: 1,
  },
});
